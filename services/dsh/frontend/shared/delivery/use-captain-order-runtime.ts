import React from 'react';
import { Platform } from 'react-native';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle-client';
import {
  acceptDispatchAssignment,
  declineDispatchAssignment,
  submitPoD,
  updateDeliveryStatus,
} from '../dispatch/dispatch.api';
import { updateForegroundDispatchLocation } from '../dispatch/dispatch-location.api';

export type DshCaptainLifecycleStatus = 'EN_ROUTE' | 'ARRIVED';

export type DshCaptainLocationPush = {
  /** Assignment authority key. Kept as orderId temporarily for renderer compatibility. */
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

// Foreground-only periodic sampling. No background task and no location history.
export const CAPTAIN_LOCATION_PUSH_INTERVAL_MS = 3 * 60 * 1000;

export function useCaptainOrderRuntime() {
  const acceptTask = React.useCallback(
    (assignmentId: string, _captainId: string) => acceptDispatchAssignment(assignmentId),
    [],
  );

  const declineTask = React.useCallback(
    (assignmentId: string, _captainId: string, reason: string) =>
      declineDispatchAssignment(assignmentId, reason),
    [],
  );

  const confirmPickup = React.useCallback(
    (assignmentId: string, _captainId: string) =>
      updateDeliveryStatus(assignmentId, 'picked_up'),
    [],
  );

  const pushLocation = React.useCallback(
    (push: DshCaptainLocationPush) => updateForegroundDispatchLocation(push.orderId, {
      latitude: push.latitude,
      longitude: push.longitude,
      recordedAt: new Date().toISOString(),
    }),
    [],
  );

  const deliverOrder = React.useCallback(
    (assignmentId: string, _captainId: string, podMediaKey?: string) =>
      submitPoD(assignmentId, {
        method: 'photo',
        reference: podMediaKey ?? 'captain-confirmed-delivery',
      }),
    [],
  );

  const failDelivery = React.useCallback(
    async (_assignmentId: string, _captainId: string) => {
      throw {
        kind: 'unsupported_transition',
        message: 'failed delivery requires the governed dispatch exception endpoint',
      };
    },
    [],
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
    let intervalId: ReturnType<typeof setInterval> | undefined;

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
        console.warn('[captain:location-push] failed', err);
      });
    };

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
        // @ts-ignore optional native dependency loaded only on device
        const Location = await import('expo-location');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!cancelled) postLocation(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        console.warn('[captain:location-push] failed to sample device location', err);
      }
    };

    const startInterval = () => {
      if (cancelled || intervalId !== undefined) return;
      void sampleOnce();
      intervalId = setInterval(() => void sampleOnce(), CAPTAIN_LOCATION_PUSH_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const { AppState } = require('react-native') as typeof import('react-native');
    const subscription = AppState.addEventListener('change', (nextState: string) => {
      if (nextState === 'active') startInterval();
      else stopInterval();
    });

    if (AppState.currentState === 'active') startInterval();

    return () => {
      cancelled = true;
      stopInterval();
      subscription.remove();
    };
  }, [activeAssignmentId, captainId, captainOrderRuntime, lifecycleStatus]);
}
