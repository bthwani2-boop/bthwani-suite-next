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

export type FetchState<T> = { readonly loaded: boolean; readonly error: string | null; readonly offline: boolean; readonly data: T };

function classifiedMessage(error: unknown, fallback: string): { message: string; classified: ClassifiedPickupError } {
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

/**
 * Partner-side (store) controller for a single pickup session's handoff
 * flow: mark-ready / notify / customer-arrived / verify-OTP. Every action
 * only reaches a success state after the API call resolves -- never
 * optimistically. Surfaces must consume this hook rather than pickup.api
 * directly (fullstack-boundary-gate forbids surfaces importing *.api
 * modules).
 */
export function usePickupActionsController() {
  const [state, setState] = useState<PickupActionState>({
    session: null, stage: "not_ready", busy: false, message: null, isError: false,
  });

  const refresh = useCallback((orderId: string) => {
    return fetchOperatorPickup(orderId)
      .then((resp) => setState((s) => ({ ...s, session: resp.session })))
      .catch(() => { /* keep last-known session on refresh failure */ });
  }, []);

  const runAction = useCallback((nextStage: PickupActionStage | null, successMessage: string, action: () => Promise<{ session?: DshPickupSession }>) => {
    setState((s) => ({ ...s, busy: true, message: null, isError: false }));
    return action()
      .then((resp) => {
        setState((s) => ({
          ...s,
          busy: false,
          message: successMessage,
          isError: false,
          stage: nextStage ?? s.stage,
          session: resp.session ?? s.session,
        }));
      })
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تنفيذ الإجراء.");
        setState((s) => ({ ...s, busy: false, isError: true, message, errorCode: classified.code }));
      });
  }, []);

  const markReady = useCallback((orderId: string, expectedVersion: number) =>
    runAction("ready", "تم تعليم الطلب كجاهز للاستلام.", async () => {
      await markPickupReady(orderId, expectedVersion);
      return fetchOperatorPickup(orderId);
    }), [runAction]);

  const notify = useCallback((orderId: string, expectedVersion: number) =>
    runAction("notified", "تم إشعار العميل وإصدار رمز استلام جديد.", () =>
      notifyPickupCustomer(orderId, { expectedVersion })), [runAction]);

  const customerArrived = useCallback((orderId: string, expectedVersion: number) =>
    runAction("arrived", "تم تسجيل وصول العميل.", async () => {
      await markPickupCustomerArrived(orderId, expectedVersion);
      return fetchOperatorPickup(orderId);
    }), [runAction]);

  const verify = useCallback((orderId: string, expectedVersion: number, code: string) =>
    runAction("verified", "تم التحقق من رمز الاستلام وإتمام تسليم الطلب.", () =>
      verifyPickupSession(orderId, { expectedVersion, code })), [runAction]);

  return { state, markReady, notify, customerArrived, verify, refresh };
}

export type UseOperatorPickupsControllerParams = {
  readonly storeId?: string;
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

/**
 * Operator-side controller: pickup session list + single-session detail +
 * the two operator mutations (resend notification, extend window).
 */
export function useOperatorPickupsController(params: UseOperatorPickupsControllerParams = {}) {
  const { storeId, limit = 100, autoLoad = true } = params;

  const [listState, setListState] = useState<FetchState<readonly DshPickupSession[]>>({
    loaded: false, error: null, offline: false, data: [],
  });
  const [detailState, setDetailState] = useState<FetchState<DshPickupSession | null>>({
    loaded: false, error: null, offline: false, data: null,
  });

  const loadList = useCallback(() => {
    setListState((s) => ({ ...s, loaded: false }));
    return fetchOperatorPickups({ ...(storeId !== undefined ? { storeId } : {}), limit })
      .then((resp) => setListState({ loaded: true, error: null, offline: false, data: resp.sessions }))
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تحميل جلسات الاستلام الذاتي");
        setListState({ loaded: false, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, limit]);

  useEffect(() => { if (autoLoad) void loadList(); }, [autoLoad, loadList]);

  const loadDetail = useCallback((orderId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPickup(orderId)
      .then((resp) => setDetailState({ loaded: true, error: null, offline: false, data: resp.session }))
      .catch((err: unknown) => {
        const { message, classified } = classifiedMessage(err, "تعذر تحميل تفاصيل جلسة الاستلام");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  type MutationResult =
    | { readonly ok: true; readonly session: DshPickupSession }
    | { readonly ok: false; readonly kind: ClassifiedPickupError["kind"]; readonly code?: string | undefined; readonly message: string };

  const extendWindow = useCallback(
    (orderId: string, expectedVersion: number, reason: string, newExpiry: string): Promise<MutationResult> => {
      return extendPickupWindow(orderId, { expectedVersion, reason, newExpiry })
        .then((resp) => {
          setDetailState({ loaded: true, error: null, offline: false, data: resp.session });
          return { ok: true as const, session: resp.session };
        })
        .catch((err: unknown) => {
          const { message, classified } = classifiedMessage(err, "تعذر تمديد نافذة الاستلام.");
          return { ok: false as const, kind: classified.kind, code: classified.code, message };
        });
    },
    [],
  );

  const resendNotification = useCallback(
    (orderId: string, expectedVersion: number): Promise<MutationResult> => {
      return notifyPickupCustomer(orderId, { expectedVersion })
        .then((resp) => {
          if (resp.session) setDetailState({ loaded: true, error: null, offline: false, data: resp.session });
          return { ok: true as const, session: resp.session as DshPickupSession };
        })
        .catch((err: unknown) => {
          const { message, classified } = classifiedMessage(err, "تعذر إعادة إرسال الإشعار.");
          return { ok: false as const, kind: classified.kind, code: classified.code, message };
        });
    },
    [],
  );

  return { listState, loadList, detailState, loadDetail, extendWindow, resendNotification };
}
