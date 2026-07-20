import { useCallback, useEffect, useState } from "react";
import {
  markPickupReady,
  notifyPickupCustomer,
  markPickupCustomerArrived,
  verifyPickupSession,
  markPickupNoShow,
  fetchPartnerPickupState,
  fetchOperatorPickups,
  fetchOperatorPickup,
  extendPickupWindow,
  classifyPickupError,
  type PartnerPickupStage,
} from "./pickup.api";
import type { ClassifiedPickupError, DshPickupSession } from "./pickup.types";

export type FetchState<T> = {
  readonly loaded: boolean;
  readonly error: string | null;
  readonly offline: boolean;
  readonly data: T;
};

function classifiedMessage(
  error: unknown,
  fallback: string,
): { message: string; classified: ClassifiedPickupError } {
  const classified = classifyPickupError(error);
  return { message: classified.message ?? fallback, classified };
}

export type PickupActionStage = PartnerPickupStage;

export type PickupActionState = {
  readonly session: DshPickupSession | null;
  readonly stage: PickupActionStage;
  readonly loaded: boolean;
  readonly busy: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string | undefined;
};

/** Partner-owned pickup handoff controller backed by the resumable stage read. */
export function usePickupActionsController(orderId: string) {
  const [state, setState] = useState<PickupActionState>({
    session: null,
    stage: "not_ready",
    loaded: false,
    busy: false,
    message: null,
    isError: false,
  });

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await fetchPartnerPickupState(orderId);
      setState((current) => ({
        ...current,
        session: response.session,
        stage: response.stage,
        loaded: true,
        busy: false,
        isError: false,
      }));
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تحميل جلسة الاستلام الذاتي.");
      setState((current) => ({
        ...current,
        loaded: true,
        busy: false,
        isError: true,
        message,
        errorCode: classified.code,
      }));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async (
    successMessage: string,
    action: () => Promise<unknown>,
  ) => {
    setState((current) => ({ ...current, busy: true, message: null, isError: false }));
    try {
      await action();
      const response = await fetchPartnerPickupState(orderId);
      setState({
        session: response.session,
        stage: response.stage,
        loaded: true,
        busy: false,
        message: successMessage,
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
        errorCode: classified.code,
      }));
      return false;
    }
  }, [orderId]);

  const markReady = useCallback(() =>
    runAction("تم تعليم الطلب كجاهز للاستلام.", () =>
      markPickupReady(orderId, state.session?.version ?? 0)),
  [orderId, runAction, state.session?.version]);

  const notify = useCallback(() =>
    runAction("تم إشعار العميل وإصدار رمز استلام جديد.", () =>
      notifyPickupCustomer(orderId, { expectedVersion: state.session?.version ?? 0 })),
  [orderId, runAction, state.session?.version]);

  const customerArrived = useCallback(() =>
    runAction("تم تسجيل وصول العميل.", () =>
      markPickupCustomerArrived(orderId, state.session?.version ?? 0)),
  [orderId, runAction, state.session?.version]);

  const verify = useCallback((code: string) =>
    runAction("تم التحقق من رمز الاستلام وإتمام الطلب.", () =>
      verifyPickupSession(orderId, { expectedVersion: state.session?.version ?? 0, code })),
  [orderId, runAction, state.session?.version]);

  const noShow = useCallback((reason: string) =>
    runAction("تم تسجيل عدم حضور العميل وإغلاق جلسة الرمز.", () =>
      markPickupNoShow(orderId, {
        expectedVersion: state.session?.version ?? 0,
        reason: reason.trim(),
      })),
  [orderId, runAction, state.session?.version]);

  return { state, markReady, notify, customerArrived, verify, noShow, refresh: load } as const;
}

export type UseOperatorPickupsControllerParams = {
  readonly storeId?: string;
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

type OperatorPickupMutationResult =
  | { readonly ok: true; readonly session: DshPickupSession }
  | {
      readonly ok: false;
      readonly kind: ClassifiedPickupError["kind"];
      readonly code?: string | undefined;
      readonly message: string;
    };

/** Operator-owned pickup monitoring controller. */
export function useOperatorPickupsController(
  params: UseOperatorPickupsControllerParams = {},
) {
  const { storeId, limit = 100, autoLoad = true } = params;
  const [listState, setListState] = useState<FetchState<readonly DshPickupSession[]>>({
    loaded: false,
    error: null,
    offline: false,
    data: [],
  });
  const [detailState, setDetailState] = useState<FetchState<DshPickupSession | null>>({
    loaded: false,
    error: null,
    offline: false,
    data: null,
  });

  const loadList = useCallback(() => {
    setListState((current) => ({ ...current, loaded: false, error: null }));
    return fetchOperatorPickups({ ...(storeId !== undefined ? { storeId } : {}), limit })
      .then((response) =>
        setListState({ loaded: true, error: null, offline: false, data: response.sessions }),
      )
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل جلسات الاستلام الذاتي");
        setListState({ loaded: false, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, limit]);

  useEffect(() => {
    if (autoLoad) void loadList();
  }, [autoLoad, loadList]);

  const loadDetail = useCallback((orderIdValue: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPickup(orderIdValue)
      .then((response) =>
        setDetailState({ loaded: true, error: null, offline: false, data: response.session }),
      )
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل جلسة الاستلام");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const extendWindow = useCallback(
    (
      orderIdValue: string,
      expectedVersion: number,
      reason: string,
      newExpiry: string,
    ): Promise<OperatorPickupMutationResult> => {
      return extendPickupWindow(orderIdValue, { expectedVersion, reason, newExpiry })
        .then((response) => {
          setDetailState({ loaded: true, error: null, offline: false, data: response.session });
          return { ok: true as const, session: response.session };
        })
        .catch((error: unknown) => {
          const { message, classified } = classifiedMessage(error, "تعذر تمديد نافذة الاستلام.");
          return {
            ok: false as const,
            kind: classified.kind,
            code: classified.code,
            message,
          };
        });
    },
    [],
  );

  return { listState, loadList, detailState, loadDetail, extendWindow };
}
