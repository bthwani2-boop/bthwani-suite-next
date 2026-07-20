import React from 'react';
import { Platform } from 'react-native';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle-client';
import {
  acceptDispatchAssignment,
  declineDispatchAssignment,
  reportDeliveryException,
  submitPoD,
  updateDeliveryStatus,
} from '../dispatch/dispatch.api';
import { updateForegroundDispatchLocation } from '../dispatch/dispatch-location.api';

export type DshCaptainLocationPush = {
  readonly assignmentId: string;
  readonly latitude: number;
  readonly longitude: number;
};

export type DshCaptainCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export type DshCaptainActiveLocationPushConfig = {
  readonly activeAssignmentId: string;
  readonly captainId: string;
  readonly lifecycleStatus: string | undefined;
};

const activeDeliveryStates = new Set([
  'assigned',
  'driver_assigned',
  'driver_arrived_store',
  'picked_up',
  'arrived_customer',
]);

// Foreground-only periodic sampling. No background task and no location history.
export const CAPTAIN_LOCATION_PUSH_INTERVAL_MS = 3 * 60 * 1000;

export async function readCaptainForegroundLocation(): Promise<DshCaptainCoordinates> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('خدمة الموقع غير متاحة على هذا الجهاز.');
    }
    return new Promise<DshCaptainCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        () => reject(new Error('تعذر قراءة الموقع الحالي. تحقق من صلاحية الموقع وحاول مجددًا.')),
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 },
      );
    });
  }

  // @ts-ignore expo-location is supplied by the app-captain runtime on native devices.
  const Location = await import('expo-location');
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('صلاحية الموقع مطلوبة لتحديث موقع المهمة.');
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

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
    (push: DshCaptainLocationPush) => updateForegroundDispatchLocation(push.assignmentId, {
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
    (assignmentId: string, _captainId: string) => reportDeliveryException(assignmentId, {
      reasonCode: 'proof_unavailable',
      note: 'تعذر إكمال إثبات التسليم؛ تم تحويل المهمة إلى مراجعة العمليات.',
      correlationId: `${assignmentId}-${Date.now()}-${Math.random().toString(36).slice(2)}` ,
    }),
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
        assignmentId: activeAssignmentId,
        latitude,
        longitude,
      }).catch((err: unknown) => {
        console.warn('[captain:location-push] failed', err);
      });
    };

    const sampleOnce = async () => {
      if (cancelled) return;
      try {
        const position = await readCaptainForegroundLocation();
        if (!cancelled) postLocation(position.latitude, position.longitude);
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
