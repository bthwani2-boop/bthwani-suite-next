import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  CreateFieldOnboardingAssignmentInput,
  FieldOnboardingAssignment,
  FieldOnboardingAssignmentTransitionInput,
  ReassignFieldOnboardingAssignmentInput,
} from "./field-assignment.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "field-onboarding-assignment");

export async function listOperatorFieldOnboardingAssignments(): Promise<readonly FieldOnboardingAssignment[]> {
  const result = await request<{ assignments: FieldOnboardingAssignment[] }>("/dsh/operator/field-onboarding-assignments");
  return result.assignments;
}

export function createFieldOnboardingAssignment(input: CreateFieldOnboardingAssignmentInput): Promise<FieldOnboardingAssignment> {
  return request<{ assignment: FieldOnboardingAssignment }>("/dsh/operator/field-onboarding-assignments", {
    method: "POST",
    idempotencyKey: corrId("field-assignment-create"),
    body: input,
  }).then((result) => result.assignment);
}

export function reassignFieldOnboardingAssignment(id: string, input: ReassignFieldOnboardingAssignmentInput): Promise<FieldOnboardingAssignment> {
  return request<{ assignment: FieldOnboardingAssignment }>(`/dsh/operator/field-onboarding-assignments/${encodeURIComponent(id)}/reassign`, {
    method: "POST",
    idempotencyKey: corrId("field-assignment-reassign"),
    body: input,
  }).then((result) => result.assignment);
}

export function cancelFieldOnboardingAssignment(id: string, input: FieldOnboardingAssignmentTransitionInput): Promise<FieldOnboardingAssignment> {
  return request<{ assignment: FieldOnboardingAssignment }>(`/dsh/operator/field-onboarding-assignments/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    idempotencyKey: corrId("field-assignment-cancel"),
    body: input,
  }).then((result) => result.assignment);
}

export async function listFieldOnboardingAssignments(): Promise<readonly FieldOnboardingAssignment[]> {
  const result = await request<{ assignments: FieldOnboardingAssignment[] }>("/dsh/field/onboarding-assignments");
  return result.assignments;
}

export function openFieldOnboardingAssignment(id: string, input: FieldOnboardingAssignmentTransitionInput): Promise<FieldOnboardingAssignment> {
  return request<{ assignment: FieldOnboardingAssignment }>(`/dsh/field/onboarding-assignments/${encodeURIComponent(id)}/open`, {
    method: "POST",
    body: input,
  }).then((result) => result.assignment);
}

export function linkFieldOnboardingAssignmentDraft(id: string, partnerId: string): Promise<FieldOnboardingAssignment> {
  return request<{ assignment: FieldOnboardingAssignment }>(`/dsh/field/onboarding-assignments/${encodeURIComponent(id)}/draft/${encodeURIComponent(partnerId)}`, {
    method: "POST",
    idempotencyKey: corrId("field-assignment-link-draft"),
  }).then((result) => result.assignment);
}
