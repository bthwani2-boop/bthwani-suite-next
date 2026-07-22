import { useCallback, useRef, useState } from "react";
import {
  approveDshWltRefund,
  completeDshWltRefund,
  createDshWltRefund,
  fetchClientOrderRefunds,
  fetchDshWltRefundAudit,
  fetchDshWltRefundView,
  fetchDshWltRefundsByOrderView,
  fetchPartnerOrderRefunds,
  reconcileDshWltRefund,
  rejectDshWltRefund,
} from "./wlt-refund.api";
import type {
  CreateDshWltRefundInput,
  DshWltRefundAuditEvent,
  DshWltRefundState,
  DshWltRefundView,
  RefundDecisionInput,
  RefundReconciliationInput,
} from "./wlt-refund.types";

function newMutationKey(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

export function useWltRefundController() {
  const [state, setState] = useState<DshWltRefundState>({ kind: "idle" });
  const mutationKeys = useRef<Record<string, string>>({});

  const keyFor = useCallback((action: string) => {
    mutationKeys.current[action] ??= newMutationKey(`refund-${action}`);
    return mutationKeys.current[action];
  }, []);
  const clearKey = useCallback((action: string) => { delete mutationKeys.current[action]; }, []);

  const applyResult = useCallback((action: string, result: Awaited<ReturnType<typeof fetchDshWltRefundView>>) => {
    if (result.ok) {
      clearKey(action);
      setState({ kind: "loaded", refund: result.value });
      return true;
    }
    if (result.kind === "provider_unknown") {
      setState({ kind: "provider_unknown", refund: null, message: result.message });
      return false;
    }
    setState({ kind: "error", failure: result.kind, message: result.message });
    return false;
  }, [clearKey]);

  const loadById = useCallback(async (refundId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltRefundView(refundId);
    if (result.ok) setState({ kind: "loaded", refund: result.value });
    else setState({ kind: "error", failure: result.kind, message: result.message });
  }, []);

  const create = useCallback(async (input: CreateDshWltRefundInput) => {
    setState({ kind: "mutating", action: "create" });
    return applyResult("create", await createDshWltRefund(input, keyFor("create")));
  }, [applyResult, keyFor]);

  const approve = useCallback(async (refundId: string, input: RefundDecisionInput) => {
    setState({ kind: "mutating", action: "approve" });
    return applyResult("approve", await approveDshWltRefund(refundId, input, keyFor(`approve:${refundId}`)));
  }, [applyResult, keyFor]);

  const reject = useCallback(async (refundId: string, input: RefundDecisionInput) => {
    setState({ kind: "mutating", action: "reject" });
    return applyResult("reject", await rejectDshWltRefund(refundId, input, keyFor(`reject:${refundId}`)));
  }, [applyResult, keyFor]);

  const complete = useCallback(async (refundId: string) => {
    setState({ kind: "mutating", action: "complete" });
    return applyResult("complete", await completeDshWltRefund(refundId, keyFor(`complete:${refundId}`)));
  }, [applyResult, keyFor]);

  const reconcile = useCallback(async (refundId: string, input: RefundReconciliationInput) => {
    setState({ kind: "mutating", action: "reconcile" });
    return applyResult("reconcile", await reconcileDshWltRefund(refundId, input, keyFor(`reconcile:${refundId}:${input.resolutionAction}`)));
  }, [applyResult, keyFor]);

  const reset = useCallback(() => {
    mutationKeys.current = {};
    setState({ kind: "idle" });
  }, []);

  return { state, loadById, create, approve, reject, complete, reconcile, reset };
}

type RefundListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly refunds: readonly DshWltRefundView[] }
  | { readonly kind: "error"; readonly message: string };

export function useWltRefundsByOrderController(surface: "control-panel" | "client" | "partner" = "control-panel") {
  const [state, setState] = useState<RefundListState>({ kind: "idle" });

  const loadByOrder = useCallback(async (orderId: string) => {
    setState({ kind: "loading" });
    const result = surface === "client"
      ? await fetchClientOrderRefunds(orderId)
      : surface === "partner"
        ? await fetchPartnerOrderRefunds(orderId)
        : await fetchDshWltRefundsByOrderView(orderId);
    if (result.ok) setState({ kind: "loaded", refunds: result.value });
    else setState({ kind: "error", message: result.message });
  }, [surface]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, loadByOrder, reset };
}

type RefundAuditState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly events: readonly DshWltRefundAuditEvent[] }
  | { readonly kind: "error"; readonly message: string };

export function useWltRefundAuditController() {
  const [state, setState] = useState<RefundAuditState>({ kind: "idle" });
  const load = useCallback(async (refundId: string) => {
    setState({ kind: "loading" });
    const result = await fetchDshWltRefundAudit(refundId);
    if (result.ok) setState({ kind: "loaded", events: result.value });
    else setState({ kind: "error", message: result.message });
  }, []);
  return { state, load, reset: useCallback(() => setState({ kind: "idle" }), []) };
}
