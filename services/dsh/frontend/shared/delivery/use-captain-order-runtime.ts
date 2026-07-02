import React from 'react';
import { Platform } from 'react-native';
import {
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
  readonly activeOrderId: string;
  readonly captainId: string;
  readonly lifecycleStatus: string | undefined;
};

const activeDeliveryStates = new Set(['offer-accepting', 'offer-accepted']);

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
  activeOrderId,
  captainId,
  lifecycleStatus,
}: DshCaptainActiveLocationPushConfig) {
  const captainOrderRuntime = useCaptainOrderRuntime();

  React.useEffect(() => {
    if (!lifecycleStatus || !activeDeliveryStates.has(lifecycleStatus)) return undefined;
    if (!activeOrderId || !captainId) return undefined;

    let cancelled = false;
    let watchId: number | null = null;

    const postLocation = (latitude: number, longitude: number) => {
      if (cancelled) return;
      captainOrderRuntime.pushLocation({
        orderId: activeOrderId,
        captainId,
        latitude,
        longitude,
        lifecycleStatus,
        orderStatus: 'EN_ROUTE',
      }).catch(() => {
        // Location push failures are non-fatal for the UI binding.
      });
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => postLocation(pos.coords.latitude, pos.coords.longitude),
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
      );
    }

    return () => {
      cancelled = true;
      if (watchId !== null && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeOrderId, captainId, captainOrderRuntime, lifecycleStatus]);
}
