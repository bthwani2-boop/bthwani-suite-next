import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { SupportMutationContext } from "./support-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order-rescue");

export type DshGovernedOrderRescueStatus = "open" | "investigating" | "action_required" | "resolved" | "closed";
export type DshGovernedOrderRescueReason =
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
export type DshGovernedOrderRescueSeverity = "warning" | "danger";
export type DshGovernedOrderRescueOwner = "support" | "operations" | "partner" | "captain" | "wlt_reference_only";
export type DshGovernedOrderRescueNextAction =
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
  readonly status: DshGovernedOrderRescueStatus;
  readonly reason: DshGovernedOrderRescueReason;
  readonly severity: DshGovernedOrderRescueSeverity;
  readonly owner: DshGovernedOrderRescueOwner;
  readonly nextAction: DshGovernedOrderRescueNextAction;
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

export type DshGovernedOrderRescueEvent = {
  readonly id: string;
  readonly rescueCaseId: string;
  readonly orderId: string;
  readonly actorId: string;
  readonly eventType: "created" | "decision_recorded" | "status_changed" | "resolved" | "closed";
  readonly fromStatus?: DshGovernedOrderRescueStatus | "";
  readonly toStatus: DshGovernedOrderRescueStatus;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshCreateGovernedOrderRescueInput = {
  readonly orderId: string;
  readonly ticketId?: string;
  readonly reason: DshGovernedOrderRescueReason;
  readonly severity?: DshGovernedOrderRescueSeverity;
  readonly summary: string;
  readonly assignedTo?: string;
};

export type DshUpdateGovernedOrderRescueInput = {
  readonly expectedStatus: DshGovernedOrderRescueStatus;
  readonly status: DshGovernedOrderRescueStatus;
  readonly reason: DshGovernedOrderRescueReason;
  readonly owner: DshGovernedOrderRescueOwner;
  readonly nextAction: DshGovernedOrderRescueNextAction;
  readonly operatorNote: string;
  readonly affectedEntity: string;
  readonly assignedTo?: string;
  readonly resolutionNote: string;
};

export async function createOrderRescueCase(
  input: DshCreateGovernedOrderRescueInput,
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
  statusFilter?: DshGovernedOrderRescueStatus,
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
  input: DshUpdateGovernedOrderRescueInput,
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

export async function fetchOrderRescueEvents(caseId: string): Promise<readonly DshGovernedOrderRescueEvent[]> {
  const data = await request<{ events: DshGovernedOrderRescueEvent[] }>(
    `/dsh/operator/support/order-rescue-cases/${encodeURIComponent(caseId)}/events`,
  );
  return data.events ?? [];
}
