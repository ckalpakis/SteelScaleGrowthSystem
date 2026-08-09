// =============================================================================
// GHL workflow setup package — payload + instruction generation. Pure/server-safe.
//
// Produces the JSON payloads an admin pastes into each GHL review-workflow stage,
// plus the step-by-step setup instructions. The payloads deliberately send only
// GHL merge fields for CONTACT + LOCATION identifiers — the Steel Scale backend
// resolves business settings (name, logo, review URL) from its OWN client record
// using the authenticated location id, never trusting values supplied by GHL.
// =============================================================================

export const WEBHOOK_SECRET_HEADER = "X-SteelScale-Webhook-Secret";
export const WEBHOOK_HTTP_METHOD = "POST";
export const WEBHOOK_CONTENT_TYPE = "application/json";

export type WorkflowStage = "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3";

interface StageSpec {
  stage: WorkflowStage;
  label: string;
  eventType: string;
  idempotencySuffix: string;
}

const STAGES: StageSpec[] = [
  { stage: "initial", label: "Initial request", eventType: "review_request.initial", idempotencySuffix: "initial" },
  { stage: "follow_up_1", label: "Follow-up 1", eventType: "review_request.follow_up_1", idempotencySuffix: "follow-up-1" },
  { stage: "follow_up_2", label: "Follow-up 2", eventType: "review_request.follow_up_2", idempotencySuffix: "follow-up-2" },
  { stage: "follow_up_3", label: "Follow-up 3", eventType: "review_request.follow_up_3", idempotencySuffix: "follow-up-3" },
];

export interface WorkflowPayload {
  stage: WorkflowStage;
  label: string;
  eventType: string;
  /** Pretty-printed JSON ready to paste into the GHL Custom Webhook body. */
  json: string;
}

/** Build the JSON payload for one stage (GHL merge fields left intact). */
export function buildStagePayload(spec: StageSpec): WorkflowPayload {
  const body = {
    eventVersion: "1.0",
    eventType: spec.eventType,
    idempotencyKey: `{{location.id}}:{{contact.id}}:${spec.idempotencySuffix}:{{workflow.id}}`,
    locationId: "{{location.id}}",
    contactId: "{{contact.id}}",
    firstName: "{{contact.first_name}}",
    lastName: "{{contact.last_name}}",
    phone: "{{contact.phone}}",
    email: "{{contact.email}}",
  };
  return { stage: spec.stage, label: spec.label, eventType: spec.eventType, json: JSON.stringify(body, null, 2) };
}

/** All four workflow-stage payloads. */
export function buildWorkflowPayloads(): WorkflowPayload[] {
  return STAGES.map(buildStagePayload);
}

/** The webhook ingestion URL for the review workflow. */
export function workflowWebhookUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/workflow/review`;
}

/** Ordered, human setup instructions for wiring the GHL workflow. */
export function buildSetupInstructions(): string[] {
  return [
    "Open the client's Steel Scale sub-account.",
    "Go to Automation.",
    "Open the correct review workflow.",
    "Replace the Send SMS action with a Custom Webhook action.",
    "Select the POST method.",
    "Paste the webhook URL.",
    `Add the header Content-Type: ${WEBHOOK_CONTENT_TYPE}.`,
    `Add the header ${WEBHOOK_SECRET_HEADER} with the one-time secret shown above.`,
    "Paste the JSON payload for that workflow stage.",
    "Save the action.",
    "Test with a designated, opted-in contact.",
    "Verify Steel Scale received the request (check the onboarding detail page).",
    "Confirm the dry-run validation passes (Test Configuration below).",
    "Activate the workflow only after successful testing.",
  ];
}
