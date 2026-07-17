-- =============================================================================
-- 0030 — Atomic onboarding submission RPC.
--
-- Wraps the whole "client submits the setup form" flow in ONE transaction so it
-- either fully succeeds or fully rolls back:
--   1. Lock the invitation row (FOR UPDATE) and re-validate it server-side.
--   2. Create the client_account.
--   3. Mark the invitation submitted (single-use).
--   4. Create a durable, queued provisioning_run (the background worker drains it).
--
-- The row lock makes concurrent/double submissions safe: the second submission
-- blocks, then sees status = 'submitted' and is rejected with ONBOARD_SUBMITTED.
--
-- Called only by the service-role client from the token-gated submit route
-- (public users never call this directly). service_role bypasses RLS, so no
-- SECURITY DEFINER is needed.
--
-- ROLLBACK:  drop function public.submit_onboarding(text, jsonb);
-- =============================================================================

create or replace function public.submit_onboarding(p_token_hash text, p_payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_inv        public.onboarding_invitations%rowtype;
  v_account_id uuid;
  v_run_id     uuid;
begin
  -- 1. Lock + re-validate the invitation.
  select * into v_inv
  from public.onboarding_invitations
  where public_token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'ONBOARD_INVALID';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'ONBOARD_REVOKED';
  end if;

  if v_inv.status = 'submitted' then
    raise exception 'ONBOARD_SUBMITTED';
  end if;

  -- NOTE: we do NOT flip status to 'expired' here — the raise rolls the whole
  -- transaction back, so any write would be discarded anyway. resolveInvitation()
  -- performs the durable expiry flip idempotently outside this transaction.
  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    raise exception 'ONBOARD_EXPIRED';
  end if;

  -- 2. Create the client account from the normalized payload.
  insert into public.client_accounts (
    onboarding_invitation_id,
    legal_business_name, public_business_name, owner_first_name,
    primary_email, primary_phone, website_url,
    address_line_1, address_line_2, city, state, postal_code, country, timezone,
    google_review_link, logo_url, primary_brand_color, email_sending_domain,
    follow_up_count, review_request_limit_14_days, ask_for_referral,
    status
  ) values (
    v_inv.id,
    p_payload->>'legal_business_name',
    p_payload->>'public_business_name',
    p_payload->>'owner_first_name',
    p_payload->>'primary_email',
    p_payload->>'primary_phone',
    nullif(p_payload->>'website_url', ''),
    nullif(p_payload->>'address_line_1', ''),
    nullif(p_payload->>'address_line_2', ''),
    nullif(p_payload->>'city', ''),
    nullif(p_payload->>'state', ''),
    nullif(p_payload->>'postal_code', ''),
    nullif(p_payload->>'country', ''),
    nullif(p_payload->>'timezone', ''),
    nullif(p_payload->>'google_review_link', ''),
    nullif(p_payload->>'logo_url', ''),
    nullif(p_payload->>'primary_brand_color', ''),
    nullif(p_payload->>'email_sending_domain', ''),
    coalesce((p_payload->>'follow_up_count')::int, 0),
    coalesce((p_payload->>'review_request_limit_14_days')::int, 0),
    coalesce((p_payload->>'ask_for_referral')::boolean, false),
    'provisioning'
  )
  returning id into v_account_id;

  -- 3. Single-use: mark the invitation submitted.
  update public.onboarding_invitations
  set status = 'submitted', submitted_at = now()
  where id = v_inv.id;

  -- 4. Durable, queued provisioning run for the background worker.
  insert into public.provisioning_runs (client_account_id, status)
  values (v_account_id, 'queued')
  returning id into v_run_id;

  return jsonb_build_object(
    'client_account_id', v_account_id,
    'provisioning_run_id', v_run_id,
    'invitation_id', v_inv.id
  );
end;
$$;
