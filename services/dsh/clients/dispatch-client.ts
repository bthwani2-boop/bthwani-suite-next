import type { components } from "./generated/dsh-api";

export type DshDispatchAssignment = components["schemas"]["DshDispatchAssignment"];
export type DshCreateAssignmentRequest = components["schemas"]["DshCreateAssignmentRequest"];
export type DshUpdateDeliveryStatusRequest = components["schemas"]["DshUpdateDeliveryStatusRequest"];
export type DshSubmitPoDRequest = components["schemas"]["DshSubmitPoDRequest"];

export type DshDispatchClientError =
  | { readonly kind: "http"; readonly status: number; readonly body: unknown }
  | { readonly kind: "network"; readonly message: string };

export interface DshDispatchClient {
  listOperatorAssignments(accessToken: string): Promise<readonly DshDispatchAssignment[]>;
  createAssignment(input: DshCreateAssignmentRequest, accessToken: string): Promise<DshDispatchAssignment>;
  listCaptainAssignments(accessToken: string): Promise<readonly DshDispatchAssignment[]>;
  acceptAssignment(assignmentId: string, accessToken: string): Promise<DshDispatchAssignment>;
  declineAssignment(assignmentId: string, reason: string, accessToken: string): Promise<DshDispatchAssignment>;
  updateDeliveryStatus(assignmentId: string, input: DshUpdateDeliveryStatusRequest, accessToken: string): Promise<DshDispatchAssignment>;
  submitPoD(assignmentId: string, input: DshSubmitPoDRequest, accessToken: string): Promise<DshDispatchAssignment>;
  getClientOrderTracking(orderId: string, accessToken: string): Promise<DshDispatchAssignment>;
}

export function createDshDispatchClient(baseUrl: string): DshDispatchClient {
  async function request<T>(path: string, accessToken: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl), {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Correlation-ID": `dispatch-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
      } satisfies DshDispatchClientError;
    }
    if (!response.ok) {
      throw {
        kind: "http",
        status: response.status,
        body: await response.json().catch(() => null),
      } satisfies DshDispatchClientError;
    }
    return response.json() as Promise<T>;
  }

  async function assignmentRequest(path: string, accessToken: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<DshDispatchAssignment> {
    const data = await request<{ assignment: DshDispatchAssignment }>(path, accessToken, method, body);
    return data.assignment;
  }

  return {
    async listOperatorAssignments(accessToken) {
      const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/operator/dispatch/assignments", accessToken);
      return data.assignments ?? [];
    },
    createAssignment(input, accessToken) {
      return assignmentRequest("/dsh/operator/dispatch/assignments", accessToken, "POST", input);
    },
    async listCaptainAssignments(accessToken) {
      const data = await request<{ assignments: DshDispatchAssignment[] }>("/dsh/captain/dispatch/assignments", accessToken);
      return data.assignments ?? [];
    },
    acceptAssignment(assignmentId, accessToken) {
      return assignmentRequest(`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/accept`, accessToken, "POST");
    },
    declineAssignment(assignmentId, reason, accessToken) {
      return assignmentRequest(`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/decline`, accessToken, "POST", { reason });
    },
    updateDeliveryStatus(assignmentId, input, accessToken) {
      return assignmentRequest(`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/status`, accessToken, "POST", input);
    },
    submitPoD(assignmentId, input, accessToken) {
      return assignmentRequest(`/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/pod`, accessToken, "POST", input);
    },
    getClientOrderTracking(orderId, accessToken) {
      return assignmentRequest(`/dsh/client/orders/${encodeURIComponent(orderId)}/tracking`, accessToken);
    },
  };
}
