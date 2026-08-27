import { useCallback, useEffect, useRef, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { corrId } from "../_kernel/dsh-http-request";
import {
  markPickupReady,
  notifyPickupCustomer,
  markPickupCustomerArrived,
  verifyPickupSession,
  markPickupNoShow,
  fetchClientPickupState,
  fetchPartnerPickupState,
  fetchOperatorPickups,
  fetchOperatorPickup,
  extendPickupWindow,
  reschedulePickupWindow,
  extendPickupWindowAsPartner,
  reschedulePickupWindowAsPartner,
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
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useRef<Record<string, string>>({});
  const commandFor = useCallback((action: string, fingerprint: string) => {
    if (!actorId) throw new Error("جلسة الشريك غير جاهزة لتنفيذ إجراء الاستلام.");
    const key = `${actorId}:${orderId}:${action}:${fingerprint}`;
    const existing = commandIds.current[key];
    if (existing) return { key, id: existing };
    const id = corrId(`partner-pickup-${action}`);
    commandIds.current[key] = id;
    return { key, id };
  }, [actorId, orderId]);
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
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
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
      if (classified.code === "PICKUP_CANCELLED") {
        try {
          const response = await fetchPartnerPickupState(orderId);
          setState({
            session: response.session,
            stage: response.stage,
            loaded: true,
            busy: false,
            isError: true,
            message,
            errorCode: classified.code,
          });
          return false;
        } catch {
          // Preserve the original governed cancellation error below.
        }
      }
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

  const runCommand = useCallback(async (
    successMessage: string,
    action: string,
    fingerprint: string,
    execute: (commandId: string) => Promise<unknown>,
  ) => {
    if (!actorId) {
      setState((current) => ({ ...current, busy: false, isError: true, message: "جلسة الشريك غير جاهزة لتنفيذ إجراء الاستلام." }));
      return false;
    }
    const command = commandFor(action, fingerprint);
    return runAction(successMessage, () => execute(command.id));
  }, [actorId, commandFor, runAction]);

  const markReady = useCallback(() => {
    const expectedVersion = state.session?.version ?? 0;
    return runCommand("تم تعليم الطلب كجاهز للاستلام.", "mark_ready", String(expectedVersion), (commandId) =>
      markPickupReady(orderId, expectedVersion, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const notify = useCallback(() => {
    const expectedVersion = state.session?.version ?? 0;
    return runCommand("تم إشعار العميل وإصدار رمز استلام جديد.", "notify_customer", String(expectedVersion), (commandId) =>
      notifyPickupCustomer(orderId, { expectedVersion }, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const customerArrived = useCallback(() => {
    const expectedVersion = state.session?.version ?? 0;
    return runCommand("تم تسجيل وصول العميل.", "customer_arrived", String(expectedVersion), (commandId) =>
      markPickupCustomerArrived(orderId, expectedVersion, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const verify = useCallback((code: string) => {
    const expectedVersion = state.session?.version ?? 0;
    return runCommand("تم التحقق من رمز الاستلام وإتمام الطلب.", "verify_otp", `${expectedVersion}:${code}`, (commandId) =>
      verifyPickupSession(orderId, { expectedVersion, code }, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const noShow = useCallback((reason: string) => {
    const expectedVersion = state.session?.version ?? 0;
    const normalizedReason = reason.trim();
    return runCommand("تم تسجيل عدم حضور العميل وإغلاق جلسة الرمز.", "no_show", `${expectedVersion}:${normalizedReason}`, (commandId) =>
      markPickupNoShow(orderId, { expectedVersion, reason: normalizedReason }, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const extendWindow = useCallback((reason: string, newExpiry: string) => {
    const expectedVersion = state.session?.version ?? 0;
    const normalizedReason = reason.trim();
    return runCommand("تم تمديد نافذة الاستلام.", "extend_window", `${expectedVersion}:${normalizedReason}:${newExpiry}`, (commandId) =>
      extendPickupWindowAsPartner(orderId, { expectedVersion, reason: normalizedReason, newExpiry }, commandId));
  }, [orderId, runCommand, state.session?.version]);

  const rescheduleWindow = useCallback((reason: string, newExpiry: string) => {
    const expectedVersion = state.session?.version ?? 0;
    const normalizedReason = reason.trim();
    return runCommand("تمت إعادة فتح نافذة الاستلام. أصدر رمزًا جديدًا وأشعر العميل.", "reschedule", `${expectedVersion}:${normalizedReason}:${newExpiry}`, (commandId) =>
      reschedulePickupWindowAsPartner(orderId, { expectedVersion, reason: normalizedReason, newExpiry }, commandId));
  }, [orderId, runCommand, state.session?.version]);

  return {
    state,
    markReady,
    notify,
    customerArrived,
    verify,
    noShow,
    extendWindow,
    rescheduleWindow,
    refresh: load,
  } as const;
}

export type ClientPickupViewState = {
  readonly session: DshPickupSession | null;
  readonly stage: PickupActionStage;
  readonly loaded: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string | undefined;
};

/**
 * Read-only client view of their own pickup session. Backs the screen opened
 * from the pickup_otp notification action_url; the client observes status,
 * they never mutate the session directly.
 */
export function useClientPickupSessionController(orderId: string) {
  const [state, setState] = useState<ClientPickupViewState>({
    session: null,
    stage: "not_ready",
    loaded: false,
    message: null,
    isError: false,
  });

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await fetchClientPickupState(orderId);
      setState({
        session: response.session,
        stage: response.stage,
        loaded: true,
        message: null,
        isError: false,
      });
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تحميل حالة استلام طلبك.");
      setState((current) => ({
        ...current,
        loaded: true,
        isError: true,
        message,
        errorCode: classified.code,
      }));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  return { state, refresh: load } as const;
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

/** Operator-owned pickup monitoring and no-show recovery controller. */
export function useOperatorPickupsController(
  params: UseOperatorPickupsControllerParams = {},
) {
  const { storeId, limit = 100, autoLoad = true } = params;
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useRef<Record<string, string>>({});
  const commandFor = useCallback((orderIdValue: string, action: string, expectedVersion: number, reason: string, newExpiry: string) => {
    if (!actorId) throw new Error("جلسة العمليات غير جاهزة لتمديد نافذة الاستلام.");
    const key = `${actorId}:${orderIdValue}:${action}:${expectedVersion}:${reason.trim()}:${newExpiry}`;
    const existing = commandIds.current[key];
    if (existing) return { key, id: existing };
    const id = corrId(`operator-pickup-${action}`);
    commandIds.current[key] = id;
    return { key, id };
  }, [actorId]);
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
        setListState({ loaded: true, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, limit]);

  useEffect(() => {
    if (!autoLoad) return;
    void loadList();
    const interval = setInterval(() => void loadList(), 15_000);
    return () => clearInterval(interval);
  }, [autoLoad, loadList]);

  const loadDetail = useCallback((orderIdValue: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPickup(orderIdValue)
      .then((response) =>
        setDetailState({ loaded: true, error: null, offline: false, data: response.session }),
      )
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل جلسة الاستلام");
        setDetailState({ loaded: true, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const executeWindowMutation = useCallback(
    (
      action: typeof extendPickupWindow,
      orderIdValue: string,
      expectedVersion: number,
      reason: string,
      newExpiry: string,
      fallback: string,
      commandId: string,
    ): Promise<OperatorPickupMutationResult> => {
      return action(orderIdValue, { expectedVersion, reason, newExpiry }, commandId)
        .then((response) => {
          setDetailState({ loaded: true, error: null, offline: false, data: response.session });
          return { ok: true as const, session: response.session };
        })
        .catch((error: unknown) => {
          const { message, classified } = classifiedMessage(error, fallback);
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

  const extendWindow = useCallback(
    async (orderIdValue: string, expectedVersion: number, reason: string, newExpiry: string) => {
      if (!actorId) {
        return { ok: false as const, kind: "forbidden" as const, message: "جلسة العمليات غير جاهزة لتمديد نافذة الاستلام." };
      }
      const command = commandFor(orderIdValue, "extend_window", expectedVersion, reason, newExpiry);
      return executeWindowMutation(
        extendPickupWindow,
        orderIdValue,
        expectedVersion,
        reason,
        newExpiry,
        "تعذر تمديد نافذة الاستلام.",
        command.id,
      );
    },
    [actorId, commandFor, executeWindowMutation],
  );

  const rescheduleWindow = useCallback(
    (orderIdValue: string, expectedVersion: number, reason: string, newExpiry: string) =>
      executeWindowMutation(
        reschedulePickupWindow,
        orderIdValue,
        expectedVersion,
        reason,
        newExpiry,
        "تعذر إعادة جدولة نافذة الاستلام.",
        commandFor(orderIdValue, "reschedule", expectedVersion, reason, newExpiry).id,
      ),
    [commandFor, executeWindowMutation],
  );

  return {
    listState,
    loadList,
    detailState,
    loadDetail,
    extendWindow,
    rescheduleWindow,
  } as const;
}
