import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNotificationDeliveryAttempts,
  fetchNotificationPreferences,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreferences,
  fetchPlatformNotificationConfigs,
  upsertPlatformNotificationConfig,
} from "./notifications.api";
import {
  notifIdle, notifLoading, notifSuccess, notifError,
  configIdle, configLoading, configSuccess, configError,
} from "./notifications.states";
import type {
  DshNotificationConfigState,
  DshNotificationDeliveryAuditState,
  DshNotificationDeliveryOutcome,
  DshNotificationPreference,
  DshNotificationsState,
  DshUpdateNotificationPreferenceInput,
  DshUpsertPlatformNotificationConfigInput,
} from "./notifications.types";

function resolveMessage(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال بالإنترنت";
  if (e?.status === 401) return "الجلسة منتهية، يرجى إعادة تسجيل الدخول";
  if (e?.status === 403) return "لا تملك الصلاحية المطلوبة";
  if (e?.status === 400) return "بيانات سياسة الإشعارات غير صالحة";
  return "تعذّر إكمال إجراء الإشعارات";
}

type PreferenceState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly preferences: readonly DshNotificationPreference[] }
  | { readonly kind: "error"; readonly message: string };

type NotificationsControllerOptions = {
  readonly loadPreferences?: boolean;
};

export type NotificationMutationAction =
  | "mark_read"
  | "mark_all_read"
  | "save_preference"
  | null;

function canUseTopicEnabledPreferenceUpdate(input: DshUpdateNotificationPreferenceInput): boolean {
  return input.channels.length === 1
    && input.channels[0] === "in_app"
    && input.quietHoursStart == null
    && input.quietHoursEnd == null
    && input.locale === "ar"
    && input.timezone === "Asia/Aden";
}

export function useNotificationsController(
  authKind: string,
  options: NotificationsControllerOptions = {},
) {
  const shouldLoadPreferences = options.loadPreferences !== false;
  const [state, setState] = useState<DshNotificationsState>(notifIdle());
  const [preferenceState, setPreferenceState] = useState<PreferenceState>({ kind: "idle" });
  const [busyAction, setBusyAction] = useState<NotificationMutationAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mutationBusyRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionEpochRef = useRef(0);
  const notificationsLoadSeqRef = useRef(0);
  const preferencesLoadSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionEpochRef.current += 1;
      notificationsLoadSeqRef.current += 1;
      preferencesLoadSeqRef.current += 1;
      mutationBusyRef.current = false;
    };
  }, []);

  const loadNotifications = useCallback(async (): Promise<boolean> => {
    const sessionEpoch = sessionEpochRef.current;
    const loadSeq = ++notificationsLoadSeqRef.current;
    setState(notifLoading());
    try {
      const data = await fetchNotifications();
      if (
        !mountedRef.current
        || sessionEpoch !== sessionEpochRef.current
        || loadSeq !== notificationsLoadSeqRef.current
      ) return false;
      setState(notifSuccess(data.notifications, data.unreadCount));
      return true;
    } catch (err) {
      if (
        !mountedRef.current
        || sessionEpoch !== sessionEpochRef.current
        || loadSeq !== notificationsLoadSeqRef.current
      ) return false;
      setState(notifError(resolveMessage(err)));
      return false;
    }
  }, []);

  const loadPreferences = useCallback(async (): Promise<boolean> => {
    if (!shouldLoadPreferences) {
      setPreferenceState({ kind: "idle" });
      return true;
    }
    const sessionEpoch = sessionEpochRef.current;
    const loadSeq = ++preferencesLoadSeqRef.current;
    setPreferenceState({ kind: "loading" });
    try {
      const data = await fetchNotificationPreferences();
      if (
        !mountedRef.current
        || sessionEpoch !== sessionEpochRef.current
        || loadSeq !== preferencesLoadSeqRef.current
      ) return false;
      setPreferenceState({ kind: "success", preferences: data.preferences });
      return true;
    } catch (err) {
      if (
        !mountedRef.current
        || sessionEpoch !== sessionEpochRef.current
        || loadSeq !== preferencesLoadSeqRef.current
      ) return false;
      setPreferenceState({ kind: "error", message: resolveMessage(err) });
      return false;
    }
  }, [shouldLoadPreferences]);

  const reload = useCallback(async () => {
    setActionError(null);
    if (shouldLoadPreferences) {
      await Promise.all([loadNotifications(), loadPreferences()]);
      return;
    }
    await loadNotifications();
  }, [loadNotifications, loadPreferences, shouldLoadPreferences]);

  const runMutation = useCallback(async (
    action: Exclude<NotificationMutationAction, null>,
    operation: () => Promise<boolean | void>,
  ): Promise<boolean> => {
    if (mutationBusyRef.current) return false;
    const sessionEpoch = sessionEpochRef.current;
    mutationBusyRef.current = true;
    setBusyAction(action);
    setActionError(null);
    try {
      const result = await operation();
      if (!mountedRef.current || sessionEpoch !== sessionEpochRef.current) return false;
      if (result === false) {
        setActionError("تم إرسال التغيير، لكن تعذر التحقق من الحقيقة المحفوظة. أعد المحاولة قبل الاعتماد على النتيجة.");
        return false;
      }
      return true;
    } catch (err) {
      if (!mountedRef.current || sessionEpoch !== sessionEpochRef.current) return false;
      setActionError(resolveMessage(err));
      return false;
    } finally {
      mutationBusyRef.current = false;
      if (mountedRef.current && sessionEpoch === sessionEpochRef.current) {
        setBusyAction(null);
      }
    }
  }, []);

  const markRead = useCallback(async (id: string): Promise<boolean> => runMutation(
    "mark_read",
    async () => {
      await markNotificationRead(id);
      return loadNotifications();
    },
  ), [loadNotifications, runMutation]);

  const markAllRead = useCallback(async (): Promise<boolean> => runMutation(
    "mark_all_read",
    async () => {
      await markAllNotificationsRead();
      return loadNotifications();
    },
  ), [loadNotifications, runMutation]);

  const savePreference = useCallback(async (
    input: DshUpdateNotificationPreferenceInput,
  ): Promise<boolean> => runMutation(
    "save_preference",
    async () => {
      const { topic, enabled } = input;
      if (canUseTopicEnabledPreferenceUpdate(input)) {
        await updateNotificationPreferences(topic, enabled);
      } else {
        await updateNotificationPreferences(input);
      }
      return loadPreferences();
    },
  ), [loadPreferences, runMutation]);

  useEffect(() => {
    sessionEpochRef.current += 1;
    notificationsLoadSeqRef.current += 1;
    preferencesLoadSeqRef.current += 1;
    if (authKind !== "authenticated") {
      mutationBusyRef.current = false;
      setState(notifIdle());
      setPreferenceState({ kind: "idle" });
      setBusyAction(null);
      setActionError(null);
      return;
    }
    void reload();
  }, [authKind, reload]);

  return {
    state,
    preferenceState,
    busyAction,
    actionError,
    reload,
    markRead,
    markAllRead,
    savePreference,
  };
}

export function usePlatformNotificationConfigController(authKind: string) {
  const [state, setState] = useState<DshNotificationConfigState>(configIdle());

  const load = useCallback(async () => {
    setState(configLoading());
    try {
      const data = await fetchPlatformNotificationConfigs();
      setState(configSuccess(data.configs));
    } catch (err) {
      setState(configError(resolveMessage(err)));
    }
  }, []);

  const save = useCallback(async (input: DshUpsertPlatformNotificationConfigInput) => {
    await upsertPlatformNotificationConfig(input);
    await load();
  }, [load]);

  useEffect(() => {
    if (authKind !== "authenticated") { setState(configIdle()); return; }
    void load();
  }, [authKind, load]);

  return { state, reload: load, save };
}

export function useNotificationDeliveryAuditController(authKind: string) {
  const [state, setState] = useState<DshNotificationDeliveryAuditState>({ kind: "idle" });
  const [outcome, setOutcome] = useState<DshNotificationDeliveryOutcome | undefined>(undefined);

  const load = useCallback(async (nextOutcome?: DshNotificationDeliveryOutcome) => {
    setState({ kind: "loading" });
    try {
      const data = await fetchNotificationDeliveryAttempts(nextOutcome, 100);
      setOutcome(nextOutcome);
      setState({
        kind: "success",
        attempts: data.attempts,
        pushDeliveries: data.pushDeliveries,
        summary: data.summary,
      });
    } catch (err) {
      setState({ kind: "error", message: resolveMessage(err) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      setOutcome(undefined);
      return;
    }
    void load();
  }, [authKind, load]);

  return {
    state,
    outcome,
    reload: () => load(outcome),
    filter: (nextOutcome?: DshNotificationDeliveryOutcome) => load(nextOutcome),
  };
}
