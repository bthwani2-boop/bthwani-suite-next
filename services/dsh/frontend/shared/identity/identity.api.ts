import { createDshHttpClient } from "../_kernel/dsh-http-request";

export interface ProvisionInput {
  username: string;
  phoneE164?: string;
  role: string;
  internalRole?: string;
  departmentScope?: string;
}

export interface ActorSummary {
  actorId: string;
  username: string;
  phoneE164: string;
  role: string;
  status: string;
  version: number;
  createdAt: string;
}

export interface ActorSearchInput {
  role?: string;
  status?: string;
  limit?: number;
}

const { request } = createDshHttpClient("/api/identity", "identity", 10000);

export async function provisionActor(input: ProvisionInput, idempotencyKey: string): Promise<ActorSummary> {
  return request<ActorSummary>("/internal/actors/provision", {
    method: "POST",
    body: input,
    idempotencyKey
  });
}

export async function searchActors(query: ActorSearchInput): Promise<{ actors: ActorSummary[] }> {
  // DshRequestOptions doesn't natively support query string parameters directly yet,
  // so we append it to the path for now or assume it gets passed correctly if DshHttpClient supported it (but it doesn't).
  const params = new URLSearchParams(query as Record<string, string>);
  return request<{ actors: ActorSummary[] }>(`/internal/actors/search?${params.toString()}`);
}
export async function getActor(actorId: string): Promise<ActorSummary> {
  return request<ActorSummary>(`/internal/actors/${encodeURIComponent(actorId)}`);
}

export async function suspendActor(actorId: string, reason: string): Promise<ActorSummary> {
  return request<ActorSummary>(`/internal/actors/${encodeURIComponent(actorId)}/suspend`, {
    method: "POST",
    body: { reason }
  });
}

export async function reactivateActor(actorId: string, reason: string): Promise<ActorSummary> {
  return request<ActorSummary>(`/internal/actors/${encodeURIComponent(actorId)}/reactivate`, {
    method: "POST",
    body: { reason }
  });
}

export async function revokeActorSessions(actorId: string, reason: string): Promise<void> {
  return request<void>(`/internal/actors/${encodeURIComponent(actorId)}/sessions/revoke`, {
    method: "POST",
    body: { reason }
  });
}

export interface ActivationChallenge {
  activationId: string;
  code?: string;
  maskedPhone: string;
  expiresAt: string;
}

export interface IssueActivationInput {
  issuedByActorId: string;
  expectedActorType: string;
  expectedSurface: string;
}

export async function issueActivation(actorId: string, input: IssueActivationInput, idempotencyKey?: string): Promise<ActivationChallenge> {
  return request<ActivationChallenge>(`/internal/actors/${encodeURIComponent(actorId)}/activations`, {
    method: "POST",
    body: input,
    idempotencyKey
  });
}

export async function reissueActivation(actorId: string, input: IssueActivationInput, idempotencyKey?: string): Promise<ActivationChallenge> {
  return request<ActivationChallenge>(`/internal/actors/${encodeURIComponent(actorId)}/activations/reissue`, {
    method: "POST",
    body: input,
    idempotencyKey
  });
}

export async function getLatestActivation(actorId: string): Promise<ActivationChallenge | null> {
  return request<ActivationChallenge | null>(`/internal/actors/${encodeURIComponent(actorId)}/activations/latest`);
}

export async function revokeActivation(actorId: string): Promise<void> {
  return request<void>(`/internal/actors/${encodeURIComponent(actorId)}/activations/revoke`, { method: "POST" });
}

export interface SessionInfo {
  sessionId: string;
  surface: string;
  actorId: string;
  createdAt: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export async function listSessions(actorId: string): Promise<SessionInfo[]> {
  return request<SessionInfo[]>(`/internal/actors/${encodeURIComponent(actorId)}/sessions`);
}

export async function revokeSession(actorId: string, sessionId: string): Promise<void> {
  return request<void>(`/internal/actors/${encodeURIComponent(actorId)}/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}
