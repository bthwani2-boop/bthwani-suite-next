import React from 'react';
import {
  fetchCaptainDispatchAssignments,
  classifyDispatchError,
} from '../dispatch/dispatch.api';
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS } from '../dispatch/dispatch.types';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';
import type { DshCaptainOrderBellItem, DshCaptainOrderServiceType, DshCaptainOrdersScreenState } from '../orders';

export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, 'ready' | 'loading' | 'empty' | 'error'>;

const ACTIVE_ASSIGNMENT_STATUSES = new Set(['offered', 'accepted']);
const ACTIVE_DELIVERY_STATUSES = new Set([
  'assigned',
  'driver_assigned',
  'driver_arrived_store',
  'picked_up',
  'arrived_customer',
]);

export function resolveServiceType(assignment: DshDispatchAssignment): DshCaptainOrderServiceType {
  if (!assignment.specialRequestId) return 'standard';
  if (assignment.requestType === 'AWNAK_ERRAND') return 'awnak';
  if (assignment.requestType === 'SHEIN_ASSISTED_PURCHASE') return 'shein-final-mile';
  return 'standard';
}

function resolveBellTitle(assignment: DshDispatchAssignment, serviceType: DshCaptainOrderServiceType): string {
  if (serviceType === 'awnak') return `عونك #${assignment.specialRequestId}`;
  if (serviceType === 'shein-final-mile') return `SHEIN #${assignment.specialRequestId}`;
  return `طلب #${assignment.orderId}`;
}

export function isCaptainAssignmentActionable(assignment: DshDispatchAssignment): boolean {
  return ACTIVE_ASSIGNMENT_STATUSES.has(assignment.status)
    && ACTIVE_DELIVERY_STATUSES.has(assignment.delivery.status);
}

export function toBellItem(assignment: DshDispatchAssignment): DshCaptainOrderBellItem {
  const serviceType = resolveServiceType(assignment);
  return {
    id: assignment.id,
    orderId: assignment.orderId,
    kind: assignment.status === 'offered' ? 'incoming-offer' : 'active',
    serviceType,
    fulfillmentMode: 'bthwani_delivery',
    title: resolveBellTitle(assignment, serviceType),
    subtitle: DELIVERY_STATUS_LABELS[assignment.delivery.status] ?? assignment.delivery.status,
    meta: ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status,
  };
}

export function useCaptainInboxModel(captainId: string) {
  const [assignments, setAssignments] = React.useState<readonly DshDispatchAssignment[]>([]);
  const [fetchState, setFetchState] = React.useState<CaptainInboxFetchState>('loading');
  const requestTokenRef = React.useRef(0);

  const refresh = React.useCallback(async (options: { readonly silent?: boolean } = {}) => {
    if (!captainId) {
      setAssignments([]);
      setFetchState('empty');
      return;
    }
    const token = ++requestTokenRef.current;
    if (!options.silent) setFetchState('loading');
    try {
      const data = await fetchCaptainDispatchAssignments();
      if (requestTokenRef.current !== token) return;
      const actionable = data.filter(isCaptainAssignmentActionable);
      setAssignments(actionable);
      setFetchState(actionable.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      if (requestTokenRef.current !== token) return;
      console.error('[captain:inbox] failed to load dispatch assignments', classifyDispatchError(error));
      if (!options.silent) {
        setAssignments([]);
        setFetchState('error');
      }
    }
  }, [captainId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!captainId) return undefined;
    const intervalId = setInterval(() => {
      void refresh({ silent: true });
    }, 10_000);
    return () => clearInterval(intervalId);
  }, [captainId, refresh]);

  const items = React.useMemo(() => assignments.map(toBellItem), [assignments]);
  const findAssignment = React.useCallback(
    (assignmentId: string) => assignments.find((assignment) => assignment.id === assignmentId),
    [assignments],
  );

  return { assignments, items, fetchState, refresh, findAssignment };
}
