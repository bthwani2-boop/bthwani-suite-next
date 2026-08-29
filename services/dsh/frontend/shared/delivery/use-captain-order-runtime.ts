import React from 'react';
import { DSH_CAPTAIN_CONTRACT_CAPABILITIES } from '../orders/dsh-order-lifecycle.policy';
import { getDshLocationAdapter } from '../mobile-capabilities';
import {
  acceptDispatchAssignment,
  declineDispatchAssignment,
  fetchCaptainDispatchAssignments,
  reportDeliveryException,
  updateDeliveryStatus,
} from '../dispatch/dispatch.api';
import { useIdentitySession } from '@bthwani/core-identity';
import {
  clearCaptainAssignmentCommandAttempt,
  getOrCreateCaptainAssignmentCommandAttempt,
} from './captain-assignment-command-attempt';
import {
  clearCaptainDeliveryStatusCommandAttempt,
  captainDeliveryStatusCommandIntentFromAttempt,
  findPendingCaptainDeliveryStatusCommandAttempt,
  getOrCreateCaptainDeliveryStatusCommandAttempt,
} from './captain-delivery-status-command-attempt';
import {
  clearCaptainDeliveryExceptionCommandAttempt,
  getOrCreateCaptainDeliveryExceptionCommandAttempt,
} from './captain-delivery-exception-command-attempt';
import {
  flushPendingForegroundDispatchLocations,
  syncForegroundDispatchLocation,
  type DshDispatchLocationSyncResult,
} from '../dispatch/dispatch-location.api';
import type {
  DshDeliveryException,
  DshDeliveryExceptionReasonCode,
  DshDeliveryStatus,
} from '../dispatch/dispatch.types';

export type CaptainDeliveryExceptionDraft = {
  readonly reasonCode: DshDeliveryExceptionReasonCode;
  readonly note: string;
};

export type DshCaptainLocationPush = {
  readonly assignmentId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly recordedAt: string;
};

export type DshCaptainCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
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
  'returning_to_store',
]);

// Foreground-only periodic sampling. No background task and no location history.
export const CAPTAIN_LOCATION_PUSH_INTERVAL_MS = 3 * 60 * 1000;

function governedAccuracy(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error('دقة الموقع غير كافية. انتقل إلى مكان مفتوح ثم أعد المحاولة.');
  }
  return value;
}

function isUncertainCaptainCommandError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { kind?: unknown; status?: unknown };
  return candidate.kind === 'network'
    || (candidate.kind === 'http' && typeof candidate.status === 'number' && candidate.status >= 500);
}

async function executeCaptainDeliveryStatusCommand(
  intent: Parameters<typeof getOrCreateCaptainDeliveryStatusCommandAttempt>[0],
  attempt: Awaited<ReturnType<typeof getOrCreateCaptainDeliveryStatusCommandAttempt>>,
): Promise<Awaited<ReturnType<typeof updateDeliveryStatus>>> {
  let coordinates = intent.latitude !== undefined && intent.longitude !== undefined
    ? { latitude: intent.latitude, longitude: intent.longitude }
    : undefined;
  if (!coordinates && (intent.nextStatus === 'driver_arrived_store' || intent.nextStatus === 'arrived_customer')) {
    const location = await readCaptainForegroundLocation();
    coordinates = { latitude: location.latitude, longitude: location.longitude };
  }
  let result;
  try {
    result = await updateDeliveryStatus(intent.assignmentId, intent.nextStatus, {
      expectedVersion: intent.expectedVersion,
      mutation: attempt.context,
      ...(coordinates ?? {}),
    });
  } catch (error) {
    if (!isUncertainCaptainCommandError(error)) throw error;
    result = await updateDeliveryStatus(intent.assignmentId, intent.nextStatus, {
      expectedVersion: intent.expectedVersion,
      mutation: attempt.context,
      ...(coordinates ?? {}),
    });
  }
  await clearCaptainDeliveryStatusCommandAttempt(intent, attempt.signature);
  return result;
}

export async function readCaptainForegroundLocation(): Promise<DshCaptainCoordinates> {
  const location = getDshLocationAdapter();
  const permission = await location.requestForegroundPermissions();
  if (!permission.granted) {
    throw new Error('صلاحية الموقع مطلوبة لتحديث موقع المهمة.');
  }
  const position = await location.getCurrentPosition();
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: governedAccuracy(position.coords.accuracy),
  };
}

export function useCaptainOrderRuntime() {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === 'authenticated' ? identity.state.identity.subject : null;

  const acceptTask = React.useCallback(
    async (assignmentId: string, _captainId: string) => {
      const currentActorId = actorId;
      if (!currentActorId) throw new Error('جلسة الكابتن غير جاهزة لتنفيذ العملية.');
      const intent = { actorId: currentActorId, assignmentId, decision: 'accept' as const };
      const attempt = await getOrCreateCaptainAssignmentCommandAttempt(intent);
      let result;
      try {
        result = await acceptDispatchAssignment(assignmentId, attempt.context);
      } catch (error) {
        if (!isUncertainCaptainCommandError(error)) throw error;
        result = await acceptDispatchAssignment(assignmentId, attempt.context);
      }
      await clearCaptainAssignmentCommandAttempt(intent, attempt.signature);
      return result;
    },
    [actorId],
  );

  const declineTask = React.useCallback(
    async (assignmentId: string, _captainId: string, reason: string) => {
      const currentActorId = actorId;
      if (!currentActorId) throw new Error('جلسة الكابتن غير جاهزة لتنفيذ العملية.');
      const normalizedReason = reason.trim();
      const intent = {
        actorId: currentActorId,
        assignmentId,
        decision: 'decline' as const,
        reasonCode: 'captain_declined',
        reason: normalizedReason,
      };
      const attempt = await getOrCreateCaptainAssignmentCommandAttempt(intent);
      let result;
      try {
        result = await declineDispatchAssignment(assignmentId, normalizedReason, attempt.context, 'captain_declined');
      } catch (error) {
        if (!isUncertainCaptainCommandError(error)) throw error;
        result = await declineDispatchAssignment(assignmentId, normalizedReason, attempt.context, 'captain_declined');
      }
      await clearCaptainAssignmentCommandAttempt(intent, attempt.signature);
      return result;
    },
    [actorId],
  );

  const transitionDeliveryStatus = React.useCallback(
    async (
      assignmentId: string,
      _captainId: string,
      expectedStatus: DshDeliveryStatus,
      nextStatus: DshDeliveryStatus,
      requiresArrivalLocation: boolean,
    ) => {
      const currentActorId = actorId;
      if (!currentActorId) throw new Error('جلسة الكابتن غير جاهزة لتنفيذ العملية.');
      const pendingAttempt = await findPendingCaptainDeliveryStatusCommandAttempt(currentActorId, assignmentId);
      if (pendingAttempt) {
        const pendingIntent = captainDeliveryStatusCommandIntentFromAttempt(pendingAttempt);
        const pendingResult = await executeCaptainDeliveryStatusCommand(pendingIntent, pendingAttempt);
        if (pendingIntent.expectedStatus === expectedStatus && pendingIntent.nextStatus === nextStatus) {
          return pendingResult;
        }
      }
      const assignments = await fetchCaptainDispatchAssignments();
      const assignment = assignments.find((item) => item.id === assignmentId);
      if (!assignment || !Number.isInteger(assignment.version) || assignment.version < 1) {
        throw new Error('تعذر قراءة إصدار مهمة التوصيل. حدّث المهمة قبل تثبيت المرحلة.');
      }
      if (assignment.delivery.status !== expectedStatus) {
        throw new Error('تغيرت مرحلة المهمة. حدّث المهمة قبل تنفيذ الإجراء التالي.');
      }
      const coordinates = requiresArrivalLocation ? await readCaptainForegroundLocation() : undefined;
      const intent = {
        actorId: currentActorId,
        assignmentId,
        expectedStatus,
        nextStatus,
        expectedVersion: assignment.version,
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      };
      const attempt = await getOrCreateCaptainDeliveryStatusCommandAttempt(intent);
      return executeCaptainDeliveryStatusCommand(intent, attempt);
    },
    [actorId],
  );

  const confirmStoreArrival = React.useCallback(
    (assignmentId: string, captainId: string) => transitionDeliveryStatus(
      assignmentId,
      captainId,
      'driver_assigned',
      'driver_arrived_store',
      true,
    ),
    [transitionDeliveryStatus],
  );

  const confirmPickup = React.useCallback(
    (assignmentId: string, captainId: string) => transitionDeliveryStatus(
      assignmentId,
      captainId,
      'driver_arrived_store',
      'picked_up',
      false,
    ),
    [transitionDeliveryStatus],
  );

  const confirmCustomerArrival = React.useCallback(
    (assignmentId: string, captainId: string) => transitionDeliveryStatus(
      assignmentId,
      captainId,
      'picked_up',
      'arrived_customer',
      true,
    ),
    [transitionDeliveryStatus],
  );

  const pushLocation = React.useCallback(
    (push: DshCaptainLocationPush): Promise<DshDispatchLocationSyncResult> => {
      if (!actorId) return Promise.reject(new Error('جلسة الكابتن غير جاهزة لإرسال الموقع.'));
      return syncForegroundDispatchLocation(actorId, push.assignmentId, {
        latitude: push.latitude,
        longitude: push.longitude,
        accuracyMeters: push.accuracyMeters,
        recordedAt: push.recordedAt,
      });
    },
    [actorId],
  );

  const failDelivery = React.useCallback(
    async (assignmentId: string, _captainId: string, draft: CaptainDeliveryExceptionDraft): Promise<DshDeliveryException> => {
      const currentActorId = actorId;
      if (!currentActorId) throw new Error('جلسة الكابتن غير جاهزة لتنفيذ العملية.');
      let coordinates: DshCaptainCoordinates | undefined;
      try {
        coordinates = await readCaptainForegroundLocation();
      } catch {
        // Location is valuable evidence but must not block safety or incident reporting.
      }
      const intent = {
        actorId: currentActorId,
        assignmentId,
        reasonCode: draft.reasonCode,
        note: draft.note.trim(),
      };
      const attempt = await getOrCreateCaptainDeliveryExceptionCommandAttempt(intent);
      const input = {
        reasonCode: draft.reasonCode,
        note: draft.note.trim(),
        correlationId: attempt.context.correlationId,
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      };
      let result;
      try {
        result = await reportDeliveryException(assignmentId, input, attempt.context);
      } catch (error) {
        if (!isUncertainCaptainCommandError(error)) throw error;
        result = await reportDeliveryException(assignmentId, input, attempt.context);
      }
      await clearCaptainDeliveryExceptionCommandAttempt(intent, attempt.signature);
      return result;
    },
    [actorId],
  );

  return React.useMemo(
    () => ({
      acceptTask,
      declineTask,
      confirmStoreArrival,
      confirmPickup,
      confirmCustomerArrival,
      pushLocation,
      failDelivery,
    }),
    [acceptTask, confirmCustomerArrival, confirmPickup, confirmStoreArrival, declineTask, failDelivery, pushLocation],
  );
}

export function useCaptainActiveLocationPush({
  activeAssignmentId,
  captainId,
  lifecycleStatus,
}: DshCaptainActiveLocationPushConfig) {
  const captainOrderRuntime = useCaptainOrderRuntime();
  const identity = useIdentitySession();
  const actorId = identity.state.kind === 'authenticated' ? identity.state.identity.subject.trim() : '';

  React.useEffect(() => {
    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.locationPush) return undefined;
    if (!lifecycleStatus || !activeDeliveryStates.has(lifecycleStatus)) return undefined;
    if (!activeAssignmentId || !captainId || !actorId || actorId !== captainId) return undefined;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const postLocation = (coordinates: DshCaptainCoordinates) => {
      if (cancelled) return;
      const recordedAt = new Date().toISOString();
      captainOrderRuntime.pushLocation({
        assignmentId: activeAssignmentId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracyMeters: coordinates.accuracyMeters,
        recordedAt,
      }).catch((err: unknown) => {
        console.warn('[captain:location-push] rejected', err);
      });
    };

    const sampleOnce = async () => {
      if (cancelled) return;
      try {
        await flushPendingForegroundDispatchLocations(actorId);
        const position = await readCaptainForegroundLocation();
        if (!cancelled) postLocation(position);
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
  }, [activeAssignmentId, actorId, captainId, captainOrderRuntime, lifecycleStatus]);
}
