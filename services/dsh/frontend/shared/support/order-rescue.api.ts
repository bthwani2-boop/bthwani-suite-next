import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order-rescue");

export type DshOrderRescueStatus = "open" | "investigating" | "action_required" | "resolved" | "closed";
export type DshOrderRescueReason =
  | "item_unavailable"
  | "customer_not_reachable"
  | "store_closed_after_order"
  | "captain_no_show"
  | "captain_declined"
  | "pickup_failed"
  | "handoff_mismatch"
  | "delivery_failed"
  | "address_issue"
  | "payment_failure"
  | "wlt_visibility";
export type DshOrderRescueSeverity = "warning" | "danger";
export type DshOrderRescueOwner = "support" | "operations" | "partner" | "captain" | "wlt_reference_only";
export type DshOrderRescueNextAction =
  | "replace_item"
  | "remove_item"
  | "wait_customer"
  | "change_delivery_mode"
  | "reassign_captain"
  | "convert_to_support_exception"
  | "create_follow_up_task"
  | "open_wlt_visibility";

export type DshGovernedOrderRescueCase = {
  readonly id: string;
  readonly orderId: string;
  readonly ticketId: string;
  readonly status: DshOrderRescueStatus;
  readonly reason: DshOrderRescueReason;
  readonly severity: DshOrderRescueSeverity;
  readonly owner: DshOrderRescueOwner;
  readonly nextAction: DshOrderRescueNextAction;
  readonly summary: string;
  readonly operatorNote: string;
  readonly affectedEntity: string;
  readonly assignedTo: string;
  readonly openedBy: string;
  readonly resolutionNote: string;
  readonly version: number;
  readonly resolvedAt?: string | null;
  readonly closedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshOrderRescueEvent = {
  readonly id: string;
  readonly rescueCaseId: string;
  readonly orderId: string;
  readonly actorId: string;
  readonly eventType: "created" | "decision_recorded" | "status_changed" | "resolved" | "closed";
  readonly fromStatus?: DshOrderRescueStatus | "";
  readonly toStatus: DshOrderRescueStatus;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshCreateOrderRescueInput = {
  readonly orderId: string;
  readonly ticketId?: string;
  readonly reason: DshOrderRescueReason;
  readonly severity?: DshOrderRescueSeverity;
  readonly summary: string;
  readonly assignedTo?: string;
};

export type DshUpdateOrderRescueInput = {
  readonly expectedStatus: DshOrderRescueStatus;
  readonly status: DshOrderRescueStatus;
  readonly reason: DshOrderRescueReason;
  readonly owner: DshOrderRescueOwner;
  readonly nextAction: DshOrderRescueNextAction;
  readonly operatorNote: string;
  readonly affectedEntity: string;
  readonly assignedTo?: string;
  readonly resolutionNote: string;
};

export async function createOrderRescueCase(
  input: DshCreateOrderRescueInput,
  context: SupportMutationContext,
): Promise<DshGovernedOrderRescueCase> {
  const data = await request<{ rescueCase: DshGovernedOrderRescueCase }>(
    "/dsh/operator/support/order-rescue-cases",
    {
      method: "POST",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.rescueCase;
}

export async function fetchOrderRescueCases(
  statusFilter?: DshOrderRescueStatus,
): Promise<readonly DshGovernedOrderRescueCase[]> {
  const path = statusFilter
    ? `/dsh/operator/support/order-rescue-cases?status=${encodeURIComponent(statusFilter)}`
    : "/dsh/operator/support/order-rescue-cases";
  const data = await request<{ rescueCases: DshGovernedOrderRescueCase[] }>(path);
  return data.rescueCases ?? [];
}

export async function fetchOrderRescueCase(caseId: string): Promise<DshGovernedOrderRescueCase> {
  const data = await request<{ rescueCase: DshGovernedOrderRescueCase }>(
    `/dsh/operator/support/order-rescue-cases/${encodeURIComponent(caseId)}`,
  );
  return data.rescueCase;
}

export async function updateOrderRescueCase(
  caseId: string,
  input: DshUpdateOrderRescueInput,
  context: SupportMutationContext,
): Promise<DshGovernedOrderRescueCase> {
  const data = await request<{ rescueCase: DshGovernedOrderRescueCase }>(
    `/dsh/operator/support/order-rescue-cases/${encodeURIComponent(caseId)}`,
    {
      method: "PATCH",
      body: input,
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
    },
  );
  return data.rescueCase;
}

export async function fetchOrderRescueEvents(caseId: string): Promise<readonly DshOrderRescueEvent[]> {
  const data = await request<{ events: DshOrderRescueEvent[] }>(
    `/dsh/operator/support/order-rescue-cases/${encodeURIComponent(caseId)}/events`,
  );
  return data.events ?? [];
}
