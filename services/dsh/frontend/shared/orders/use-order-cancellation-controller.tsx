import { useCallback, useEffect, useState } from "react";
import {
  cancelOrder,
  classifyCancellationError,
  fetchOrderCancellation,
} from "./order-cancellation.api";
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

  const submit = useCallback(async (input: CancelOrderInput) => {
    const previousCancellation: DshOrderCancellation | undefined =
      state.kind === "ready" ? state.cancellation : undefined;
    setState(
      previousCancellation
        ? { kind: "submitting", cancellation: previousCancellation }
        : { kind: "submitting" },
    );
    try {
      const response = await cancelOrder(surface, orderId, input, token);
      setState({ kind: "ready", cancellation: response.cancellation });
      await onCancelled?.();
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
  }, [onCancelled, orderId, state, surface, token]);

  return {
    state,
    submit,
    refresh: load,
  } as const;
}
