import { useCallback, useEffect, useState } from "react";
import {
  acceptOrder,
  classifyOrderError,
  createOrder,
  fetchClientOrder,
  fetchClientOrders,
  fetchOperatorOrders,
  fetchPartnerOrders,
  markOrderPreparing,
  markOrderReady,
  rejectOrder,
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
  resolvePartnerOrderActionError,
  resolvePartnerOrderActionSuccess,
  resolveRejectOrderValidation,
  shouldLoadPartnerOrders,
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

  useEffect(() => { load(); }, [load]);

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

function usePartnerOrdersController(storeId: string, statusFilter?: string) {
  const [state, setState] = useState<DshOrdersListState>(ordersIdleState());

  const load = useCallback(async () => {
    if (!shouldLoadPartnerOrders(storeId)) return;
    setState(beginOrdersLoad());
    try {
      const orders = await fetchPartnerOrders(storeId, statusFilter);
      setState(resolveOrdersLoadSuccess(orders));
    } catch (error) {
      setState(resolveOrdersLoadError(classifyOrderError(error), "partner"));
    }
  }, [storeId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return { state, reload: load };
}

function usePartnerOrderActionController() {
  const [state, setState] = useState<DshOrderActionState>(orderActionIdleState());

  const accept = useCallback(async (orderId: string) => {
    setState(beginOrderAction());
    try {
      const order = await acceptOrder(orderId);
      setState(resolvePartnerOrderActionSuccess(order));
    } catch (error) {
      setState(resolvePartnerOrderActionError(classifyOrderError(error), "accept"));
    }
  }, []);

  const reject = useCallback(async (orderId: string, reason: string) => {
    const validationState = resolveRejectOrderValidation(reason);
    if (validationState) {
      setState(validationState);
      return;
    }
    setState(beginOrderAction());
    try {
      const order = await rejectOrder(orderId, { reason });
      setState(resolvePartnerOrderActionSuccess(order));
    } catch (error) {
      setState(resolvePartnerOrderActionError(classifyOrderError(error), "reject"));
    }
  }, []);

  const markPreparing = useCallback(async (orderId: string) => {
    setState(beginOrderAction());
    try {
      const order = await markOrderPreparing(orderId);
      setState(resolvePartnerOrderActionSuccess(order));
    } catch (error) {
      setState(resolvePartnerOrderActionError(classifyOrderError(error), "preparing"));
    }
  }, []);

  const markReady = useCallback(async (orderId: string) => {
    setState(beginOrderAction());
    try {
      const order = await markOrderReady(orderId);
      setState(resolvePartnerOrderActionSuccess(order));
    } catch (error) {
      setState(resolvePartnerOrderActionError(classifyOrderError(error), "ready"));
    }
  }, []);

  const reset = useCallback(() => setState(orderActionIdleState()), []);

  return { state, accept, reject, markPreparing, markReady, reset };
}

export function useOperatorOrdersController(statusFilter?: string) {
  const [state, setState] = useState<DshOrdersListState>(ordersIdleState());

  const load = useCallback(async () => {
    setState(beginOrdersLoad());
    try {
      const orders = await fetchOperatorOrders(statusFilter);
      setState(resolveOrdersLoadSuccess(orders));
    } catch (error) {
      setState(resolveOrdersLoadError(classifyOrderError(error), "operator"));
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return { state, reload: load };
}

export type { DshOrder, DshOrdersListState, DshOrderActionState };

export function useClientOrderDetailController(orderId: string) {
  const [state, setState] = useState<DshOrderDetailState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const order = await fetchClientOrder(orderId);
      setState({ kind: "success", order });
    } catch (error) {
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
