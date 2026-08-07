import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveWorkforceApiBaseUrl } from "../_kernel/workforce-api-base-url";
import { workforceErrorCode, workforceErrorMessage } from "./workforce.api";
import type { ReadinessGate, UpdateSelfInput, WorkforceMe } from "./workforce.types";

// Native provider client: talks to the Workforce runtime directly with the
// Identity bearer token (no browser BFF). Provider-facing profile/readiness
// reads come from this transport; browser control-panel flows stay on the BFF.
const { request } = createDshHttpClient(resolveWorkforceApiBaseUrl(), "workforce-me", 10000);

export type WorkforceMeResult =
  | { kind: "ok"; me: WorkforceMe }
  | { kind: "not_provisioned" }
  | { kind: "suspended" }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string };

function classifyError(error: unknown): WorkforceMeResult {
  const code = workforceErrorCode(error);
  if (code === "PROFILE_NOT_PROVISIONED") return { kind: "not_provisioned" };
  if (code === "ENGAGEMENT_SUSPENDED") return { kind: "suspended" };
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : 0;
  if (status === 401) return { kind: "unauthenticated" };
  return { kind: "error", message: workforceErrorMessage(error) };
}

export async function fetchWorkforceMe(): Promise<WorkforceMeResult> {
  try {
    const me = await request<WorkforceMe>("/workforce/me");
    if (me.engagementStatus === "suspended" || me.engagementStatus === "terminated") {
      return { kind: "suspended" };
    }
    return { kind: "ok", me };
  } catch (error) {
    return classifyError(error);
  }
}

export async function fetchWorkforceReadiness(actorId: string): Promise<ReadinessGate> {
  if (!actorId.trim()) {
    throw new Error("WORKFORCE_ACTOR_ID_REQUIRED");
  }
  return request<ReadinessGate>(`/workforce/readiness/${encodeURIComponent(actorId)}`);
}

export async function updateWorkforceMeSelf(input: UpdateSelfInput): Promise<WorkforceMeResult> {
  try {
    const me = await request<WorkforceMe>("/workforce/me", { method: "PATCH", body: input });
    return { kind: "ok", me };
  } catch (error) {
    return classifyError(error);
  }
}
