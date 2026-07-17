import { useCallback, useEffect, useState } from "react";
import {
  assignPartnerDeliveryTask,
  departPartnerDeliveryTask,
  arrivePartnerDeliveryTask,
  submitPartnerDeliveryProof,
  fetchOperatorPartnerDelivery,
  fetchOperatorPartnerDeliveries,
  raisePartnerDeliveryException,
  classifyPartnerDeliveryError,
} from "./partner-delivery.api";
import type {
  ClassifiedPartnerDeliveryError,
  DshPartnerDeliveryTask,
} from "./partner-delivery.types";

export type FetchState<T> = { readonly loaded: boolean; readonly error: string | null; readonly offline: boolean; readonly data: T };

function classifiedMessage(error: unknown, fallback: string): { message: string; classified: ClassifiedPartnerDeliveryError } {
  const classified = classifyPartnerDeliveryError(error);
  return { message: classified.message ?? fallback, classified };
}

export type PartnerDeliveryActionState = {
  readonly task: DshPartnerDeliveryTask | null;
  readonly busy: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string;
};

/**
 * Partner-side (store courier) controller for a single partner_delivery task:
 * assign / depart / arrive / submit-proof, plus a manual refresh. Every
 * action only reaches a success state after the API call resolves -- never
 * optimistically. Surfaces must consume this hook rather than
 * partner-delivery.api directly (fullstack-boundary-gate forbids surfaces
 * importing *.api modules).
 */
export function usePartnerDeliveryActionsController() {
  const [state, setState] = useState<PartnerDeliveryActionState>({
    task: null, busy: false, message: null, isError: false,
  });

  const refresh = useCallback((taskId: string) => {
    return fetchOperatorPartnerDelivery(taskId)
      .then((resp) => setState((s) => ({ ...s, task: resp.task })))
      .catch(() => { /* keep last-known task state on refresh failure */ });
  }, []);

  const runAction = useCallback((label: string, action: () => Promise<{ task: DshPartnerDeliveryTask }>) => {
    setState((s) => ({ ...s, busy: true, message: null, isError: false }));
    return action()
      .then((resp) => setState({ task: resp.task, busy: false, message: label, isError: false }))
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تنفيذ الإجراء.");
        setState((s) => ({ ...s, busy: false, isError: true, message, ...(classified.code ? { errorCode: classified.code } : {}) }));
      });
  }, []);

  const assign = useCallback((orderId: string, storeCourierId: string) =>
    runAction("تم إسناد موصل الشريك بنجاح.", () =>
      assignPartnerDeliveryTask(orderId, { storeCourierId, expectedVersion: 0 })), [runAction]);

  const depart = useCallback((orderId: string, expectedVersion: number) =>
    runAction("تم تسجيل خروج الموصل.", () => departPartnerDeliveryTask(orderId, expectedVersion)), [runAction]);

  const arrive = useCallback((orderId: string, expectedVersion: number) =>
    runAction("تم تسجيل وصول الموصل.", () => arrivePartnerDeliveryTask(orderId, expectedVersion)), [runAction]);

  const submitProof = useCallback((orderId: string, expectedVersion: number, proofMethod: string) =>
    runAction("تم رفع إثبات التسليم وإغلاق المهمة.", () =>
      submitPartnerDeliveryProof(orderId, { expectedVersion, proofMethod })), [runAction]);

  return { state, assign, depart, arrive, submitProof, refresh };
}

export type UseOperatorPartnerDeliveriesControllerParams = {
  readonly storeId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

/**
 * Operator-side controller: partner_delivery task list + single-task detail
 * + the sole operator mutation (raise operational exception).
 */
export function useOperatorPartnerDeliveriesController(params: UseOperatorPartnerDeliveriesControllerParams = {}) {
  const { storeId, status, limit = 100, autoLoad = true } = params;

  const [listState, setListState] = useState<FetchState<readonly DshPartnerDeliveryTask[]>>({
    loaded: false, error: null, offline: false, data: [],
  });
  const [detailState, setDetailState] = useState<FetchState<DshPartnerDeliveryTask | null>>({
    loaded: false, error: null, offline: false, data: null,
  });

  const loadList = useCallback(() => {
    setListState((s) => ({ ...s, loaded: false }));
    return fetchOperatorPartnerDeliveries({
      ...(storeId ? { storeId } : {}),
      ...(status ? { status } : {}),
      limit,
    })
      .then((resp) => setListState({ loaded: true, error: null, offline: false, data: resp.tasks }))
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تحميل مهام توصيل الشريك");
        setListState({ loaded: false, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, status, limit]);

  useEffect(() => { if (autoLoad) void loadList(); }, [autoLoad, loadList]);

  const loadDetail = useCallback((taskId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPartnerDelivery(taskId)
      .then((resp) => setDetailState({ loaded: true, error: null, offline: false, data: resp.task }))
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تحميل تفاصيل المهمة");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const raiseException = useCallback(
    (orderId: string, expectedVersion: number, reason: string): Promise<
      { readonly ok: true; readonly task: DshPartnerDeliveryTask }
      | { readonly ok: false; readonly kind: ClassifiedPartnerDeliveryError["kind"]; readonly message: string }
    > => {
      return raisePartnerDeliveryException(orderId, { expectedVersion, reason })
        .then((resp) => {
          setDetailState({ loaded: true, error: null, offline: false, data: resp.task });
          return { ok: true as const, task: resp.task };
        })
        .catch((err: unknown) => {
          const { message, classified } = classifiedMessage(err, "تعذر تسجيل الاستثناء.");
          return { ok: false as const, kind: classified.kind, message };
        });
    },
    [],
  );

  return { listState, loadList, detailState, loadDetail, raiseException };
}
