import React from 'react';
import { Platform } from 'react-native';
import {
  DSH_CAPTAIN_CONTRACT_CAPABILITIES,
  createDshOrderLifecycleHttpClient,
  resolveDshOrderApiBaseUrl,
} from '../orders/dsh-order-lifecycle-client';

export type DshCaptainLifecycleStatus = 'EN_ROUTE' | 'ARRIVED';

export type DshCaptainLocationPush = {
  readonly orderId: string;
  readonly captainId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lifecycleStatus: string;
  readonly orderStatus?: DshCaptainLifecycleStatus;
};

export type DshCaptainActiveLocationPushConfig = {
  readonly activeAssignmentId: string;
  readonly captainId: string;
  readonly lifecycleStatus: string | undefined;
};

const activeDeliveryStates = new Set(['offer-accepting', 'offer-accepted']);

// Owner decision (register item 14 + 42): NO live tracking, NO background
// location. The captain app samples and pushes its own location on this
// fixed cadence, foreground-only, only while an active delivery assignment
// exists. Shared here (instead of duplicated per-surface) so every caller —
// this hook and any UI displaying "last update" — agrees on the cadence.
export const CAPTAIN_LOCATION_PUSH_INTERVAL_MS = 3 * 60 * 1000;

export function resolveDshRuntimeOrderId(orderId: string): string {
  return orderId.startsWith('captain-order-') ? orderId.replace('captain-order-', '') : orderId;
}

export function useCaptainOrderRuntime() {
  const orderLifecycleClient = React.useMemo(
    () => createDshOrderLifecycleHttpClient(resolveDshOrderApiBaseUrl()),
    [],
  );

  const acceptTask = React.useCallback(
    (orderId: string, captainId: string) =>
      orderLifecycleClient.acceptTask(resolveDshRuntimeOrderId(orderId), { captain_id: captainId }),
    [orderLifecycleClient],
  );

  const declineTask = React.useCallback(
    (orderId: string, captainId: string, reason: string) =>
      orderLifecycleClient.declineTask(resolveDshRuntimeOrderId(orderId), { captain_id: captainId, reason }),
    [orderLifecycleClient],
  );

  const confirmPickup = React.useCallback(
    (orderId: string, captainId: string) =>
      orderLifecycleClient.confirmPickup(resolveDshRuntimeOrderId(orderId), { captain_id: captainId }),
    [orderLifecycleClient],
  );

  const pushLocation = React.useCallback(
    (push: DshCaptainLocationPush) => {
      const payload: any = {
        captain_id: push.captainId,
        latitude: push.latitude,
        longitude: push.longitude,
        lifecycle_status: push.lifecycleStatus,
      };
      if (push.orderStatus !== undefined) {
        payload.order_status = push.orderStatus;
      }
      return orderLifecycleClient.pushLocation(resolveDshRuntimeOrderId(push.orderId), payload);
    },
    [orderLifecycleClient],
  );

  const deliverOrder = React.useCallback(
    (orderId: string, captainId: string, podMediaKey?: string) =>
      orderLifecycleClient.deliverOrder(resolveDshRuntimeOrderId(orderId), {
        captain_id: captainId,
        ...(podMediaKey ? { pod_media_key: podMediaKey } : {}),
      }),
    [orderLifecycleClient],
  );

  const failDelivery = React.useCallback(
    (orderId: string, captainId: string) =>
      orderLifecycleClient.failDelivery(resolveDshRuntimeOrderId(orderId), {
        captain_id: captainId,
        failure_reason: 'CLIENT_UNREACHABLE',
        return_required: true,
      }),
    [orderLifecycleClient],
  );

  return React.useMemo(
    () => ({
      acceptTask,
      declineTask,
      confirmPickup,
      pushLocation,
      deliverOrder,
      failDelivery,
    }),
    [acceptTask, confirmPickup, declineTask, deliverOrder, failDelivery, pushLocation],
  );
}

export function useCaptainActiveLocationPush({
  activeAssignmentId,
  captainId,
  lifecycleStatus,
}: DshCaptainActiveLocationPushConfig) {
  const captainOrderRuntime = useCaptainOrderRuntime();

  React.useEffect(() => {
    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.locationPush) return undefined;
    if (!lifecycleStatus || !activeDeliveryStates.has(lifecycleStatus)) return undefined;
    if (!activeAssignmentId || !captainId) return undefined;

    let cancelled = false;

    const postLocation = (latitude: number, longitude: number) => {
      if (cancelled) return;
      captainOrderRuntime.pushLocation({
        orderId: activeAssignmentId,
        captainId,
        latitude,
        longitude,
        lifecycleStatus,
        orderStatus: 'EN_ROUTE',
      }).catch((err: unknown) => {
        // Surface the failure instead of swallowing it silently; delivery
        // continues, but operators must be able to see the push failed.
        console.warn('[captain:location-push] failed', err);
      });
    };

    // Owner decision: foreground-only, periodic sampling — no watchPosition,
    // no background location, no expo-task-manager. Each tick takes a single
    // fresh fix and pushes it; nothing runs while the app is backgrounded.
    const sampleOnce = async () => {
      if (cancelled) return;
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => postLocation(pos.coords.latitude, pos.coords.longitude),
            () => undefined,
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
          );
        }
        return;
      }
      try {
        // Dynamic import keeps expo-location out of any web bundle of this
        // shared module — only the native captain runtime ever loads it.
        const Location = await import('expo-location');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!cancelled) postLocation(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        console.warn('[captain:location-push] failed to sample device location', err);
      }
    };

    void sampleOnce();
    const intervalId = setInterval(() => {
      void sampleOnce();
    }, CAPTAIN_LOCATION_PUSH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeAssignmentId, captainId, captainOrderRuntime, lifecycleStatus]);
}
