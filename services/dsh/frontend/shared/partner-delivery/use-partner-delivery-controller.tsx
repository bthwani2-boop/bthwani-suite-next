import { useCallback, useEffect, useState } from "react";
import {
  assignPartnerDeliveryTask,
  markPartnerDeliveryPickedUp,
  departPartnerDeliveryTask,
  arrivePartnerDeliveryTask,
  submitPartnerDeliveryProof,
  fetchPartnerDeliveryTask,
  fetchOperatorPartnerDelivery,
  fetchOperatorPartnerDeliveryByOrder,
  fetchOperatorPartnerDeliveries,
  raisePartnerDeliveryException,
  classifyPartnerDeliveryError,
} from "./partner-delivery.api";
import type {
  ClassifiedPartnerDeliveryError,
  DshPartnerDeliveryTask,
} from "./partner-delivery.types";
import { useCameraPhotoCapture } from "../media/useCameraPhotoCapture";
import { uploadAndSubmitPartnerDeliveryProof } from "../media/pod/delivery-proof-media.api";

export type FetchState<T> = { readonly loaded: boolean; readonly error: string | null; readonly offline: boolean; readonly data: T };

function classifiedMessage(error: unknown, fallback: string): { message: string; classified: ClassifiedPartnerDeliveryError } {
  const classified = classifyPartnerDeliveryError(error);
  return { message: classified.message ?? fallback, classified };
}

export type PartnerDeliveryActionState = {
  readonly task: DshPartnerDeliveryTask | null;
  readonly stage: string;
  readonly loaded: boolean;
  readonly busy: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string;
};

/**
 * Partner-owned controller for one partner_delivery order. It reads only the
 * authenticated partner endpoint and performs a read-after-write after every
 * transition so reopening the app resumes from server truth.
 */
export function usePartnerDeliveryActionsController(orderId: string) {
  const camera = useCameraPhotoCapture();
  const [state, setState] = useState<PartnerDeliveryActionState>({
    task: null,
    stage: "unassigned",
    loaded: false,
    busy: false,
    message: null,
    isError: false,
  });

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await fetchPartnerDeliveryTask(orderId);
      setState((current) => ({
        ...current,
        task: response.task,
        stage: response.stage,
        loaded: true,
        busy: false,
        isError: false,
      }));
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تحميل مهمة توصيل المتجر.");
      setState((current) => ({
        ...current,
        loaded: true,
        busy: false,
        isError: true,
        message,
        ...(classified.code ? { errorCode: classified.code } : {}),
      }));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async (
    label: string,
    action: () => Promise<unknown>,
  ) => {
    setState((current) => ({ ...current, busy: true, message: null, isError: false }));
    try {
      await action();
      const response = await fetchPartnerDeliveryTask(orderId);
      setState({
        task: response.task,
        stage: response.stage,
        loaded: true,
        busy: false,
        message: label,
        isError: false,
      });
      return true;
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تنفيذ الإجراء.");
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message,
        ...(classified.code ? { errorCode: classified.code } : {}),
      }));
      return false;
    }
  }, [orderId]);

  const assign = useCallback((storeCourierId: string) =>
    runAction("تم إسناد موصل المتجر.", () =>
      assignPartnerDeliveryTask(orderId, { storeCourierId, expectedVersion: 0 })),
  [orderId, runAction]);

  const pickup = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("تم تثبيت استلام موصل المتجر للطلب.", () =>
      markPartnerDeliveryPickedUp(orderId, state.task!.version));
  }, [orderId, runAction, state.task]);

  const depart = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("تم تسجيل مغادرة موصل المتجر.", () =>
      departPartnerDeliveryTask(orderId, state.task!.version));
  }, [orderId, runAction, state.task]);

  const arrive = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("تم تسجيل وصول موصل المتجر إلى العميل.", () =>
      arrivePartnerDeliveryTask(orderId, state.task!.version));
  }, [orderId, runAction, state.task]);

  const submitProof = useCallback((proofMethod: string, proofReference: string) => {
    if (!state.task || !proofReference.trim()) return Promise.resolve(false);
    return runAction("تم تثبيت إثبات التسليم وإغلاق المهمة.", () =>
      submitPartnerDeliveryProof(orderId, {
        expectedVersion: state.task!.version,
        proofMethod,
        proofReference: proofReference.trim(),
      }));
  }, [orderId, runAction, state.task]);

  const captureAndSubmitProof = useCallback(async () => {
    if (!state.task) return false;
    let photo;
    try {
      photo = await camera.captureFromCamera();
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message: error instanceof Error ? error.message : "تعذر فتح الكاميرا.",
      }));
      return false;
    }
    if (!photo) return false;
    return runAction("تم رفع صورة الإثبات وإغلاق مهمة توصيل المتجر.", () =>
      uploadAndSubmitPartnerDeliveryProof(orderId, photo));
  }, [camera, orderId, runAction, state.task]);

  return { state, assign, pickup, depart, arrive, submitProof, captureAndSubmitProof, refresh: load } as const;
}

export type UseOperatorPartnerDeliveriesControllerParams = {
  readonly storeId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

/** Operator-only monitoring controller. */
export function useOperatorPartnerDeliveriesController(params: UseOperatorPartnerDeliveriesControllerParams = {}) {
  const { storeId, status, limit = 100, autoLoad = true } = params;
  const [listState, setListState] = useState<FetchState<readonly DshPartnerDeliveryTask[]>>({ loaded: false, error: null, offline: false, data: [] });
  const [detailState, setDetailState] = useState<FetchState<DshPartnerDeliveryTask | null>>({ loaded: false, error: null, offline: false, data: null });

  const loadList = useCallback(() => {
    setListState((current) => ({ ...current, loaded: false }));
    return fetchOperatorPartnerDeliveries({ ...(storeId ? { storeId } : {}), ...(status ? { status } : {}), limit })
      .then((response) => setListState({ loaded: true, error: null, offline: false, data: response.tasks }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل مهام توصيل المتجر");
        setListState({ loaded: false, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, status, limit]);

  useEffect(() => { if (autoLoad) void loadList(); }, [autoLoad, loadList]);

  const loadDetail = useCallback((taskId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPartnerDelivery(taskId)
      .then((response) => setDetailState({ loaded: true, error: null, offline: false, data: response.task }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل المهمة");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  /** LiveOrders holds orderId, not the task id — use this to resolve the
   * task before raising an exception. */
  const loadDetailByOrder = useCallback((orderId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPartnerDeliveryByOrder(orderId)
      .then((response) => setDetailState({ loaded: true, error: null, offline: false, data: response.task }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل المهمة");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const raiseException = useCallback((orderIdValue: string, expectedVersion: number, reason: string) =>
    raisePartnerDeliveryException(orderIdValue, { expectedVersion, reason })
      .then((response) => {
        setDetailState({ loaded: true, error: null, offline: false, data: response.task });
        return { ok: true as const, task: response.task };
      })
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تسجيل الاستثناء.");
        return { ok: false as const, kind: classified.kind, message };
      }), []);

  return { listState, loadList, detailState, loadDetail, loadDetailByOrder, raiseException };
}
