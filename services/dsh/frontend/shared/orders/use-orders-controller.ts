import { useCallback, useEffect, useState } from "react";
import {
  classifyOrderError,
  createOrder,
  fetchClientOrder,
  fetchClientOrders,
} from "./orders.api";
import type {
  DshCreateOrderInput,
  DshOrder,
  DshOrderActionState,
  DshOrderDetailState,
  DshOrdersListState,
} from "./orders.types";
import {
  beginOrderAction,
  beginOrdersLoad,
  resolveCreateOrderError,
  resolveCreateOrderSuccess,
  resolveOrdersLoadError,
  resolveOrdersLoadSuccess,
} from "./orders.controller-core";
import { orderActionIdleState, ordersIdleState } from "./orders.states";

export function useClientOrdersController() {
  const [state, setState] = useState<DshOrdersListState>(ordersIdleState());

  const load = useCallback(async () => {
    setState(beginOrdersLoad());
    try {
      const orders = await fetchClientOrders();
      setState(resolveOrdersLoadSuccess(orders));
    } catch (error) {
      setState(resolveOrdersLoadError(classifyOrderError(error), "client"));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { state, reload: load };
}

export function useCreateOrderController() {
  const [state, setState] = useState<DshOrderActionState>(orderActionIdleState());

  const submit = useCallback(async (input: DshCreateOrderInput) => {
    setState(beginOrderAction());
    try {
      const order = await createOrder(input);
      setState(resolveCreateOrderSuccess(order));
    } catch (error) {
      setState(resolveCreateOrderError(classifyOrderError(error)));
    }
  }, []);

  const reset = useCallback(() => setState(orderActionIdleState()), []);

  return { state, submit, reset };
}

export type { DshOrder, DshOrdersListState, DshOrderActionState };

export function useClientOrderDetailController(orderId: string) {
  const [state, setState] = useState<DshOrderDetailState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const order = await fetchClientOrder(orderId);
      setState({ kind: "success", order });
    } catch {
      setState({ kind: "error", message: "تعذر تحميل تفاصيل الطلب." });
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  return { state, reload: load };
}
