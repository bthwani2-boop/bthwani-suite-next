import type {
  DshFinanceVisibilityState,
  DshPartnerFinanceSummary,
} from "./finance-visibility.types";

export function financeIdle(): DshFinanceVisibilityState { return { kind: "idle" }; }
export function financeLoading(): DshFinanceVisibilityState { return { kind: "loading" }; }
export function financeSuccess(data: DshPartnerFinanceSummary): DshFinanceVisibilityState {
  return { kind: "success", data };
}
export function financeError(message: string): DshFinanceVisibilityState {
  return { kind: "error", message };
}
export function financeWltUnavailable(): DshFinanceVisibilityState {
  return { kind: "wlt_unavailable" };
}
