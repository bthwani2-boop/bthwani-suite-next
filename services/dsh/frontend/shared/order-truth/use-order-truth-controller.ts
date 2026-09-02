import { useCallback, useEffect, useRef, useState } from "react";
import { classifyOrderTruthFailure, createOrderTruth, fetchClientOrderTruth, fetchClientOrderTruthDetail, fetchOperatorOrderTruth, fetchPartnerOrderTruth } from "./order-truth.api";
import { useIdentitySession } from "@bthwani/core-identity";
import { clearOrderTruthAttempt, getOrCreateOrderTruthAttempt } from "./order-truth-create-attempt";
import type { CreateOrderTruthInput, OrderTruth, OrderTruthActor, OrderTruthCollectionState, OrderTruthCreateState } from "./order-truth.types";

export function useCreateOrderTruthController(token?: string) {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : "";
  const [state, setState] = useState<OrderTruthCreateState>({ kind: "idle" });
  const mutationLock = useRef(false);

  const submit = useCallback(async (input: CreateOrderTruthInput): Promise<OrderTruth | null> => {
    if (mutationLock.current) return null;
    if (!actorId) {
      setState({ kind: "error", message: "جلسة العميل غير جاهزة لتثبيت هوية الطلب." });
      return null;
    }
    mutationLock.current = true;
    setState({ kind: "submitting" });
    try {
      const attempt = await getOrCreateOrderTruthAttempt(actorId, input);
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
      await clearOrderTruthAttempt(actorId, attempt.fingerprint);
      setState({ kind: "success", order: readback });
      return readback;
    } catch (error) {
      const failure = classifyOrderTruthFailure(error, "client");
      setState({ kind: failure.kind === "not_found" ? "error" : failure.kind, message: failure.message });
      return null;
    } finally {
      mutationLock.current = false;
    }
  }, [actorId, token]);

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

