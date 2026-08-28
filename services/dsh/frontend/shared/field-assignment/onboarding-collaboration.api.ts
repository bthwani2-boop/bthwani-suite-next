import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  FieldOnboardingWorkloadItem,
  OnboardingChangeRequest,
  OnboardingChangeRequestInput,
  OnboardingCollaborationMessage,
  OnboardingCollaborationMessageInput,
  OnboardingCollaborationView,
} from "./onboarding-collaboration.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "onboarding-collaboration");

function contextQuery(assignmentId?: string, documentId?: string): string {
  const params = new URLSearchParams();
  if (assignmentId) params.set("assignmentId", assignmentId);
  if (documentId) params.set("documentId", documentId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getOperatorOnboardingCollaboration(partnerId: string, assignmentId?: string, documentId?: string): Promise<OnboardingCollaborationView> {
  return request<OnboardingCollaborationView>(`/dsh/operator/partners/${encodeURIComponent(partnerId)}/collaboration${contextQuery(assignmentId, documentId)}`);
}

export async function addOperatorOnboardingMessage(partnerId: string, input: OnboardingCollaborationMessageInput, assignmentId?: string, documentId?: string): Promise<OnboardingCollaborationMessage> {
  const result = await request<{ message: OnboardingCollaborationMessage }>(`/dsh/operator/partners/${encodeURIComponent(partnerId)}/collaboration${contextQuery(assignmentId, documentId)}`, {
    method: "POST",
    body: input,
  });
  return result.message;
}

export async function createOnboardingChangeRequest(partnerId: string, input: OnboardingChangeRequestInput, assignmentId?: string, documentId?: string): Promise<OnboardingChangeRequest> {
  const result = await request<{ changeRequest: OnboardingChangeRequest }>(`/dsh/operator/partners/${encodeURIComponent(partnerId)}/collaboration/change-requests${contextQuery(assignmentId, documentId)}`, {
    method: "POST",
    idempotencyKey: input.idempotencyKey ?? corrId("onboarding-change-request"),
    body: input,
  });
  return result.changeRequest;
}

export async function markOperatorOnboardingRead(partnerId: string, threadId: string, sequence: number): Promise<void> {
  await request(`/dsh/operator/partners/${encodeURIComponent(partnerId)}/collaboration/read?threadId=${encodeURIComponent(threadId)}`, {
    method: "POST",
    body: { sequence },
  });
}

export async function getFieldOnboardingCollaboration(partnerId: string, assignmentId?: string, documentId?: string): Promise<OnboardingCollaborationView> {
  return request<OnboardingCollaborationView>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/collaboration${contextQuery(assignmentId, documentId)}`);
}

export async function addFieldOnboardingMessage(partnerId: string, input: OnboardingCollaborationMessageInput, assignmentId?: string, documentId?: string): Promise<OnboardingCollaborationMessage> {
  const result = await request<{ message: OnboardingCollaborationMessage }>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/collaboration${contextQuery(assignmentId, documentId)}`, {
    method: "POST",
    body: input,
  });
  return result.message;
}

export async function markFieldOnboardingRead(partnerId: string, threadId: string, sequence: number): Promise<void> {
  await request(`/dsh/field/partners/${encodeURIComponent(partnerId)}/collaboration/read?threadId=${encodeURIComponent(threadId)}`, {
    method: "POST",
    body: { sequence },
  });
}

export async function listOperatorOnboardingWorkload(): Promise<readonly FieldOnboardingWorkloadItem[]> {
  const result = await request<{ items: FieldOnboardingWorkloadItem[] }>("/dsh/operator/field-onboarding/workload");
  return result.items;
}

export async function listFieldOnboardingWorkload(): Promise<readonly FieldOnboardingWorkloadItem[]> {
  const result = await request<{ items: FieldOnboardingWorkloadItem[] }>("/dsh/field/onboarding/workload");
  return result.items;
}
