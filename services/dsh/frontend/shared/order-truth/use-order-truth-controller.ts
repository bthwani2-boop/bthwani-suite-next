import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyOrderTruthFailure,
  createOrderTruth,
  fetchClientOrderTruth,
  fetchClientOrderTruthDetail,
  fetchOperatorOrderTruth,
  fetchOperatorOrderTruthDetail,
  fetchPartnerOrderTruth,
  fetchPartnerOrderTruthDetail,
} from "./order-truth.api";
import {
  clearOrderTruthAttempt,
  getOrCreateOrderTruthAttempt,
} from "./order-truth-create-attempt";
import {
  isTerminalOrderTruth,
  resolveOrderTruthPollingMs,
  type OrderTruthNetworkClass,
} from "./order-truth.experience";
import type {
  CreateOrderTruthInput,
  OrderTruth,
  OrderTruthActor,
  OrderTruthCollectionState,
  OrderTruthCreateState,
  OrderTruthDetailState,
} from "./order-truth.types";

export function useCreateOrderTruthController(token?: string) {
  const [state, setState] = useState<OrderTruthCreateState>({ kind: "idle" });
  const mutationLock = useRef(false);

  const submit = useCallback(async (input: CreateOrderTruthInput): Promise<OrderTruth | null> => {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setState({ kind: "submitting" });
    try {
      const attempt = await getOrCreateOrderTruthAttempt(input);
      const created = await createOrderTruth(input, attempt.context, token);
      // The mutation response is not accepted as final UI truth. Read it back
      // through the actor-scoped canonical endpoint before clearing the attempt.
      const readback = await fetchClientOrderTruthDetail(created.id, token);
      if (
        readback.checkoutIntentId !== input.checkoutIntentId.trim() ||
        readback.correlationId !== created.correlationId ||
        readback.version < 1
      ) {
        throw { kind: "http", status: 409, code: "READBACK_MISMATCH" };
      }
      await clearOrderTruthAttempt(attempt.fingerprint);
      setState({ kind: "success", order: readback });
      return readback;
    } catch (error) {
      const failure = classifyOrderTruthFailure(error, "client");
      setState({ kind: failure.kind === "not_found" ? "error" : failure.kind, message: failure.message });
      return null;
    } finally {
      mutationLock.current = false;
    }
  }, [token]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, reset };
}

export function useOrderTruthCollectionController(
  actor: OrderTruthActor,
  input: { readonly status?: string; readonly limit?: number; readonly token?: string } = {},
) {
  const [state, setState] = useState<OrderTruthCollectionState>({ kind: "idle" });
  const previousSuccess = useRef<readonly OrderTruth[]>([]);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const orders = actor === "client"
        ? await fetchClientOrderTruth(input.token)
        : actor === "partner"
          ? await fetchPartnerOrderTruth(input, input.token)
          : await fetchOperatorOrderTruth(input, input.token);
      previousSuccess.current = orders;
      setState(orders.length === 0 ? { kind: "empty" } : { kind: "success", orders });
    } catch (error) {
      const failure = classifyOrderTruthFailure(error, actor);
      if (failure.kind === "offline" && previousSuccess.current.length > 0) {
        setState({ kind: "partial", orders: previousSuccess.current, message: failure.message });
      } else if (failure.kind === "not_found" || failure.kind === "conflict") {
        setState({ kind: "error", message: failure.message });
      } else {
        setState({ kind: failure.kind, message: failure.message });
      }
    }
  }, [actor, input.limit, input.status, input.token]);

  useEffect(() => { void load(); }, [load]);
  return { state, reload: load };
}

export function useOrderTruthDetailController(
  actor: OrderTruthActor,
  orderId: string,
  token?: string,
  pollingMs = 5000,
  networkClass: OrderTruthNetworkClass = "normal",
  foreground = true,
) {
  const [state, setState] = useState<OrderTruthDetailState>({ kind: "idle" });
  const previousSuccess = useRef<OrderTruth | null>(null);

  const load = useCallback(async () => {
    if (!orderId.trim()) {
      setState({ kind: "not_found", message: "معرف الطلب غير صالح." });
      return;
    }
    if (!previousSuccess.current) setState({ kind: "loading" });
    try {
      const order = actor === "client"
        ? await fetchClientOrderTruthDetail(orderId, token)
        : actor === "partner"
          ? await fetchPartnerOrderTruthDetail(orderId, token)
          : await fetchOperatorOrderTruthDetail(orderId, token);
      previousSuccess.current = order;
      setState({ kind: "success", order });
    } catch (error) {
      const failure = classifyOrderTruthFailure(error, actor);
      if (failure.kind === "offline" && previousSuccess.current) {
        setState({ kind: "partial", order: previousSuccess.current, message: failure.message });
      } else if (failure.kind === "conflict") {
        setState({ kind: "error", message: failure.message });
      } else {
        setState({ kind: failure.kind, message: failure.message });
      }
    }
  }, [actor, orderId, token]);

  const currentOrder = state.kind === "success" || state.kind === "partial" ? state.order : null;
  const resolvedPollingMs = resolveOrderTruthPollingMs({
    actor,
    requestedMs: pollingMs,
    networkClass,
    foreground,
    terminal: currentOrder ? isTerminalOrderTruth(currentOrder) : false,
  });

  useEffect(() => {
    void load();
    if (resolvedPollingMs <= 0) return undefined;
    const interval = setInterval(() => { void load(); }, resolvedPollingMs);
    return () => clearInterval(interval);
  }, [load, resolvedPollingMs]);

  return { state, reload: load, pollingMs: resolvedPollingMs };
}
