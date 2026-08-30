import { useCallback, useEffect, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  classifyCancellationError,
  fetchOrderCancellation,
} from "./order-cancellation.api";
import { executeDurableOrderCancellation } from "./order-cancellation-attempt";
import type {
  CancelOrderInput,
  DshOrderCancellation,
  OrderCancellationState,
  OrderCancellationSurface,
} from "./order-cancellation.types";

export type UseOrderCancellationControllerOptions = {
  readonly surface: OrderCancellationSurface;
  readonly orderId: string;
  readonly token?: string;
  readonly autoLoad?: boolean;
  readonly onCancelled?: () => void | Promise<void>;
};

export function useOrderCancellationController({
  surface,
  orderId,
  token,
  autoLoad = true,
  onCancelled,
}: UseOrderCancellationControllerOptions) {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const [state, setState] = useState<OrderCancellationState>({ kind: "idle" });

  const load = useCallback(async () => {
    if (!orderId) {
      setState({ kind: "not_cancelled" });
      return;
    }
    setState((current) =>
      current.kind === "ready"
        ? { kind: "submitting", cancellation: current.cancellation }
        : { kind: "loading" },
    );
    try {
      const cancellation = await fetchOrderCancellation(surface, orderId, token);
      setState(
        cancellation
          ? { kind: "ready", cancellation }
          : { kind: "not_cancelled" },
      );
    } catch (error) {
      const classified = classifyCancellationError(error);
      setState({ kind: "error", message: classified.message });
    }
  }, [orderId, surface, token]);

  useEffect(() => {
    if (autoLoad) void load();
  }, [autoLoad, load]);

  useEffect(() => {
    if (state.kind !== "ready") return undefined;
    if (state.cancellation.financialClosureStatus !== "pending") return undefined;
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load, state]);

  const submit = useCallback(async (input: CancelOrderInput) => {
    const previousCancellation: DshOrderCancellation | undefined =
      state.kind === "ready" ? state.cancellation : undefined;
    setState(
      previousCancellation
        ? { kind: "submitting", cancellation: previousCancellation }
        : { kind: "submitting" },
    );
    if (!actorId) {
      const classified = classifyCancellationError({ kind: "http", status: 401 });
      setState({ kind: "error", message: classified.message });
      return { ok: false as const, error: classified };
    }
    try {
      const response = await executeDurableOrderCancellation({
        surface,
        actorId,
        orderId,
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote,
        ticketReference: input.ticketReference,
      }, token);
      setState({ kind: "ready", cancellation: response.cancellation });
      try {
        await onCancelled?.();
      } catch {
        // Exact cancellation readback already proves the mutation.
      }
      return { ok: true as const, response };
    } catch (error) {
      const classified = classifyCancellationError(error);
      if (classified.kind === "requires_review") {
        setState({ kind: "requires_review", message: classified.message });
      } else {
        setState({ kind: "error", message: classified.message });
      }
      return { ok: false as const, error: classified };
    }
  }, [actorId, onCancelled, orderId, state, surface, token]);

  return {
    state,
    submit,
    refresh: load,
  } as const;
}
