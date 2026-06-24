import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchPlatformNotificationConfigs,
  upsertPlatformNotificationConfig,
} from "./notifications.api";
import {
  notifIdle, notifLoading, notifSuccess, notifError,
  configIdle, configLoading, configSuccess, configError,
} from "./notifications.states";
import type { DshNotificationsState, DshNotificationConfigState } from "./notifications.types";

function resolveMessage(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال بالإنترنت";
  if (e?.status === 401) return "الجلسة منتهية، يرجى إعادة تسجيل الدخول";
  return "تعذّر تحميل الإشعارات";
}

export function useNotificationsController(authKind: string) {
  const [state, setState] = useState<DshNotificationsState>(notifIdle());

  const load = useCallback(async () => {
    setState(notifLoading());
    try {
      const data = await fetchNotifications();
      setState(notifSuccess(data.notifications, data.unreadCount));
    } catch (err) {
      setState(notifError(resolveMessage(err)));
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      await load();
    } catch {}
  }, [load]);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      await load();
    } catch {}
  }, [load]);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState(notifIdle());
      return;
    }
    load();
  }, [authKind, load]);

  return { state, reload: load, markRead, markAllRead };
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
    load();
  }, [authKind, load]);

  return { state, reload: load, save };
}
