import { useCallback, useEffect, useState } from "react";
import {
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
  DshNotificationPreference,
  DshNotificationsState,
} from "./notifications.types";

function resolveMessage(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال بالإنترنت";
  if (e?.status === 401) return "الجلسة منتهية، يرجى إعادة تسجيل الدخول";
  return "تعذّر تحميل الإشعارات";
}

type PreferenceState =
  | { readonly kind: "idle" | "loading" }
  | { readonly kind: "success"; readonly preferences: readonly DshNotificationPreference[] }
  | { readonly kind: "error"; readonly message: string };

export function useNotificationsController(authKind: string) {
  const [state, setState] = useState<DshNotificationsState>(notifIdle());
  const [preferenceState, setPreferenceState] = useState<PreferenceState>({ kind: "idle" });

  const loadNotifications = useCallback(async () => {
    setState(notifLoading());
    try {
      const data = await fetchNotifications();
      setState(notifSuccess(data.notifications, data.unreadCount));
    } catch (err) {
      setState(notifError(resolveMessage(err)));
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    setPreferenceState({ kind: "loading" });
    try {
      const data = await fetchNotificationPreferences();
      setPreferenceState({ kind: "success", preferences: data.preferences });
    } catch (err) {
      setPreferenceState({ kind: "error", message: resolveMessage(err) });
    }
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([loadNotifications(), loadPreferences()]);
  }, [loadNotifications, loadPreferences]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    await loadNotifications();
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  }, [loadNotifications]);

  const savePreference = useCallback(async (topic: string, enabled: boolean) => {
    await updateNotificationPreferences(topic, enabled);
    await loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState(notifIdle());
      setPreferenceState({ kind: "idle" });
      return;
    }
    void reload();
  }, [authKind, reload]);

  return {
    state,
    preferenceState,
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

  const save = useCallback(async (
    topic: string,
    actorTypes: string[],
    isEnabled: boolean,
    description: string
  ) => {
    await upsertPlatformNotificationConfig(topic, actorTypes, isEnabled, description);
    await load();
  }, [load]);

  useEffect(() => {
    if (authKind !== "authenticated") { setState(configIdle()); return; }
    void load();
  }, [authKind, load]);

  return { state, reload: load, save };
}
