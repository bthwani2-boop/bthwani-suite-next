import { useCallback, useEffect, useState } from "react";
import {
  markPickupReady,
  notifyPickupCustomer,
  markPickupCustomerArrived,
  verifyPickupSession,
  fetchOperatorPickups,
  fetchOperatorPickup,
  extendPickupWindow,
  classifyPickupError,
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

export type PickupActionStage = "not_ready" | "ready" | "notified" | "arrived" | "verified";

export type PickupActionState = {
  readonly session: DshPickupSession | null;
  readonly stage: PickupActionStage;
  readonly busy: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string | undefined;
};

/** Partner-owned pickup handoff controller. */
export function usePickupActionsController() {
  const [state, setState] = useState<PickupActionState>({
    session: null,
    stage: "not_ready",
    busy: false,
    message: null,
    isError: false,
  });

  const refresh = useCallback((orderId: string) => {
    return fetchOperatorPickup(orderId)
      .then((resp) => setState((current) => ({ ...current, session: resp.session })))
      .catch(() => undefined);
  }, []);

  const runAction = useCallback(
    (
      nextStage: PickupActionStage | null,
      successMessage: string,
      action: () => Promise<{ session?: DshPickupSession }>,
    ) => {
      setState((current) => ({ ...current, busy: true, message: null, isError: false }));
      return action()
        .then((resp) => {
          setState((current) => ({
            ...current,
            busy: false,
            message: successMessage,
            isError: false,
            stage: nextStage ?? current.stage,
            session: resp.session ?? current.session,
          }));
        })
        .catch((error: unknown) => {
          const { message, classified } = classifiedMessage(error, "تعذر تنفيذ الإجراء.");
          setState((current) => ({
            ...current,
            busy: false,
            isError: true,
            message,
            errorCode: classified.code,
          }));
        });
    },
    [],
  );

  const markReady = useCallback(
    (orderId: string, expectedVersion: number) =>
      runAction("ready", "تم تعليم الطلب كجاهز للاستلام.", async () => {
        await markPickupReady(orderId, expectedVersion);
        return fetchOperatorPickup(orderId);
      }),
    [runAction],
  );

  const notify = useCallback(
    (orderId: string, expectedVersion: number) =>
      runAction("notified", "تم إشعار العميل وإصدار رمز استلام جديد.", () =>
        notifyPickupCustomer(orderId, { expectedVersion }),
      ),
    [runAction],
  );

  const customerArrived = useCallback(
    (orderId: string, expectedVersion: number) =>
      runAction("arrived", "تم تسجيل وصول العميل.", async () => {
        await markPickupCustomerArrived(orderId, expectedVersion);
        return fetchOperatorPickup(orderId);
      }),
    [runAction],
  );

  const verify = useCallback(
    (orderId: string, expectedVersion: number, code: string) =>
      runAction("verified", "تم التحقق من رمز الاستلام وإتمام تسليم الطلب.", () =>
        verifyPickupSession(orderId, { expectedVersion, code }),
      ),
    [runAction],
  );

  return { state, markReady, notify, customerArrived, verify, refresh };
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

/**
 * Operator-owned pickup controller. The operator API exposes read/list and
 * extend-window only. Ready/notify/arrival/verify remain partner actions and
 * are intentionally absent here.
 */
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
    return fetchOperatorPickups({
      ...(storeId !== undefined ? { storeId } : {}),
      limit,
    })
      .then((resp) =>
        setListState({ loaded: true, error: null, offline: false, data: resp.sessions }),
      )
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(
          error,
          "تعذر تحميل جلسات الاستلام الذاتي",
        );
        setListState({
          loaded: false,
          error: message,
          offline: classified.kind === "network",
          data: [],
        });
      });
  }, [storeId, limit]);

  useEffect(() => {
    if (autoLoad) void loadList();
  }, [autoLoad, loadList]);

  const loadDetail = useCallback((orderId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPickup(orderId)
      .then((resp) =>
        setDetailState({ loaded: true, error: null, offline: false, data: resp.session }),
      )
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(
          error,
          "تعذر تحميل تفاصيل جلسة الاستلام",
        );
        setDetailState({
          loaded: false,
          error: message,
          offline: classified.kind === "network",
          data: null,
        });
      });
  }, []);

  const extendWindow = useCallback(
    (
      orderId: string,
      expectedVersion: number,
      reason: string,
      newExpiry: string,
    ): Promise<OperatorPickupMutationResult> => {
      return extendPickupWindow(orderId, { expectedVersion, reason, newExpiry })
        .then((resp) => {
          setDetailState({ loaded: true, error: null, offline: false, data: resp.session });
          return { ok: true as const, session: resp.session };
        })
        .catch((error: unknown) => {
          const { message, classified } = classifiedMessage(
            error,
            "تعذر تمديد نافذة الاستلام.",
          );
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
