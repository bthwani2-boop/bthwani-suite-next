import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshClientDeliveryProof,
  DshDeliveryPinResponse,
  DshDeliveryProof,
  DshDeliveryProofError,
  DshDeliveryProofStatus,
  DshReviewDeliveryProofInput,
  DshSubmitDeliveryProofInput,
} from "./delivery-proof.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "delivery-proof");

export async function issueClientDeliveryPin(orderId: string): Promise<DshDeliveryPinResponse> {
  return request<DshDeliveryPinResponse>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/delivery-pin`,
    { method: "POST" },
  );
}

export async function fetchClientAcceptedDeliveryProof(orderId: string): Promise<DshClientDeliveryProof> {
  const data = await request<{ readonly proof: DshClientDeliveryProof }>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/delivery-proof`,
  );
  return data.proof;
}

export async function fetchCaptainDeliveryProof(assignmentId: string): Promise<DshDeliveryProof> {
  const data = await request<{ readonly proof: DshDeliveryProof }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/delivery-proof`,
  );
  return data.proof;
}

export async function submitCaptainDeliveryProof(
  assignmentId: string,
  input: DshSubmitDeliveryProofInput,
): Promise<DshDeliveryProof> {
  const data = await request<{ readonly proof: DshDeliveryProof }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/delivery-proof`,
    {
      method: "POST",
      body: input,
      idempotencyKey: input.idempotencyKey,
    },
  );
  return data.proof;
}

export async function fetchOperatorDeliveryProofs(
  status?: DshDeliveryProofStatus,
): Promise<readonly DshDeliveryProof[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await request<{ readonly proofs: readonly DshDeliveryProof[] }>(
    `/dsh/operator/delivery-proofs${query}`,
  );
  return data.proofs ?? [];
}

export async function fetchOperatorDeliveryProof(proofId: string): Promise<DshDeliveryProof> {
  const data = await request<{ readonly proof: DshDeliveryProof }>(
    `/dsh/operator/delivery-proofs/${encodeURIComponent(proofId)}`,
  );
  return data.proof;
}

export async function acceptOperatorDeliveryProof(
  proofId: string,
  input: DshReviewDeliveryProofInput,
): Promise<DshDeliveryProof> {
  const data = await request<{ readonly proof: DshDeliveryProof }>(
    `/dsh/operator/delivery-proofs/${encodeURIComponent(proofId)}/accept`,
    { method: "POST", body: input, expectedVersion: input.expectedVersion },
  );
  return data.proof;
}

export async function rejectOperatorDeliveryProof(
  proofId: string,
  input: DshReviewDeliveryProofInput,
): Promise<DshDeliveryProof> {
  const data = await request<{ readonly proof: DshDeliveryProof }>(
    `/dsh/operator/delivery-proofs/${encodeURIComponent(proofId)}/reject`,
    { method: "POST", body: input, expectedVersion: input.expectedVersion },
  );
  return data.proof;
}

export function classifyDeliveryProofError(error: unknown): DshDeliveryProofError {
  const typed = error as {
    readonly kind?: string;
    readonly status?: number;
    readonly code?: string;
    readonly message?: string;
    readonly body?: string | { readonly code?: string; readonly message?: string };
  };
  let bodyCode: string | undefined;
  let bodyMessage: string | undefined;
  if (typeof typed.body === "object" && typed.body !== null) {
    bodyCode = typed.body.code;
    bodyMessage = typed.body.message;
  } else if (typeof typed.body === "string") {
    try {
      const parsed = JSON.parse(typed.body) as { readonly code?: string; readonly message?: string };
      bodyCode = parsed.code;
      bodyMessage = parsed.message;
    } catch {
      bodyMessage = typed.body;
    }
  }
  const code = typed.code ?? bodyCode;
  const message = typed.message ?? bodyMessage ?? "تعذر تنفيذ عملية إثبات التسليم.";
  if (typed.kind === "network") return { kind: "offline", code, message };
  if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied", code, message };
  if (typed.status === 404) return { kind: "not_found", code, message };
  if (typed.status === 409) return { kind: "conflict", code, message };
  if (typed.status === 400 || typed.kind === "invalid_request") return { kind: "invalid", code, message };
  return { kind: "error", code, message };
}
