// Status badges with the required color language:
//   green = active, yellow = needs action, red = failed, neutral = pending/running.
import { Badge } from "@/components/ui";

const CLIENT_TONE: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  needs_action: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  paused: "bg-gray-100 text-gray-600",
  onboarding: "bg-gray-100 text-gray-700",
  provisioning: "bg-blue-50 text-blue-700",
};
const CLIENT_LABEL: Record<string, string> = {
  active: "Active",
  needs_action: "Needs action",
  failed: "Failed",
  paused: "Paused",
  onboarding: "Onboarding",
  provisioning: "Provisioning",
};

export function ClientStatusBadge({ status }: { status: string }) {
  return <Badge className={CLIENT_TONE[status] ?? "bg-gray-100 text-gray-700"}>{CLIENT_LABEL[status] ?? status}</Badge>;
}

const RUN_TONE: Record<string, string> = {
  complete: "bg-green-50 text-green-700",
  needs_action: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  running: "bg-blue-50 text-blue-700",
  queued: "bg-gray-100 text-gray-700",
};

export function RunStatusBadge({ status }: { status: string }) {
  return <Badge className={RUN_TONE[status] ?? "bg-gray-100 text-gray-700"}>{status.replace(/_/g, " ")}</Badge>;
}

const STEP_TONE: Record<string, string> = {
  complete: "text-green-600",
  running: "text-blue-600",
  failed: "text-red-600",
  manual_required: "text-amber-600",
  skipped: "text-gray-400",
  pending: "text-gray-400",
};

export function stepTone(status: string): string {
  return STEP_TONE[status] ?? "text-gray-400";
}
