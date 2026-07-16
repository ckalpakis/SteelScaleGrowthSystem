// =============================================================================
// GHL integration — snapshots. Server-only.
//
// SNAPSHOT CAPABILITY INVESTIGATION (documented, not fabricated):
//   Listing snapshots is a documented agency-level read (`GET /snapshots/`).
//   However, HighLevel's PUBLIC API v2 does NOT (as of the pinned API version)
//   expose an official endpoint for either:
//     (a) applying an existing snapshot to an already-created location, or
//     (b) creating a location directly FROM a snapshot.
//   Snapshot deployment is performed in the agency UI, or (historically) via a
//   deprecated v1 mechanism / a "share link", neither of which is a supported
//   public v2 endpoint we may rely on for a new production integration.
//
//   Rather than fake a call, `snapshotAutomationSupport()` returns a typed
//   `{ supported: false, requiresManualTask: true }` result. Provisioning uses
//   this to enqueue a manual admin task instead of silently doing nothing.
//   If/when HighLevel ships an official endpoint, flip this one function.
// =============================================================================

import { GHL_ENDPOINTS, REQUIRED_SCOPES } from "@/lib/ghl/config";
import { snapshotsListSchema } from "@/lib/ghl/schemas";
import type { GhlAuthManager } from "@/lib/ghl/auth";
import type { GhlHttpClient } from "@/lib/ghl/client";
import type { GhlConfig, Snapshot, SnapshotAutomationResult } from "@/lib/ghl/types";

export interface SnapshotsDeps {
  config: GhlConfig;
  auth: GhlAuthManager;
  client: GhlHttpClient;
}

/** List snapshots available to the agency, normalized. */
export async function listSnapshots(deps: SnapshotsDeps): Promise<Snapshot[]> {
  deps.auth.assertScopes(REQUIRED_SCOPES.listSnapshots);

  const raw = await deps.client.request({
    method: "GET",
    path: GHL_ENDPOINTS.listSnapshots(),
    query: { companyId: deps.config.companyId },
    schema: snapshotsListSchema,
  });

  const items = Array.isArray(raw) ? raw : raw.snapshots;
  return items.map((s) => ({ id: String(s.id), name: s.name ?? null, type: s.type ?? null }));
}

/**
 * Whether snapshot deployment can be automated via a supported public API.
 *
 * Returns `{ supported: false, requiresManualTask: true }` — there is no
 * official v2 endpoint to apply a snapshot to a location or create a location
 * from a snapshot. Callers MUST create a manual admin task instead of assuming
 * the snapshot was applied.
 */
export function snapshotAutomationSupport(): SnapshotAutomationResult {
  return {
    supported: false,
    reason:
      "HighLevel's public API v2 exposes no official endpoint to apply a snapshot to an existing location or to create a location from a snapshot. Snapshot deployment must be completed manually in the agency dashboard.",
    requiresManualTask: true,
  };
}
