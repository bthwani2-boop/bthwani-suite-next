// Canonical location: dsh/frontend/shared/delivery/captain/captain-inbox.model.ts
// Authority: dsh/frontend/shared/delivery — captain's live dispatch-assignment inbox.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import {
  fetchCaptainDispatchAssignments,
  classifyDispatchError,
} from '../dispatch/dispatch.api';
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS } from '../dispatch/dispatch.types';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';
import type { DshCaptainOrderBellItem, DshCaptainOrderServiceType, DshCaptainOrdersScreenState } from '../orders';

export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, 'ready' | 'loading' | 'empty' | 'error'>;

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

// Exported for the app-captain fulfillment-exclusion regression test
// (services/dsh/tests/captain-inbox-exclusion.test.mjs): this is the real
// structural boundary where any incoming assignment-shaped object is turned
// into a captain bell item. `fulfillmentMode` below is a hardcoded literal,
// never read off the input `assignment` -- so a caller cannot smuggle a
// `partner_delivery`/`pickup` fulfillmentMode through this mapper even if
// the input object carries one (see the regression test for proof).
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

  const refresh = React.useCallback(async () => {
    if (!captainId) {
      setAssignments([]);
      setFetchState('empty');
      return;
    }
    const token = ++requestTokenRef.current;
    setFetchState('loading');
    try {
      const data = await fetchCaptainDispatchAssignments();
      if (requestTokenRef.current !== token) return;
      setAssignments(data);
      setFetchState(data.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      if (requestTokenRef.current !== token) return;
      console.error('[captain:inbox] failed to load dispatch assignments', classifyDispatchError(err));
      setAssignments([]);
      setFetchState('error');
    }
  }, [captainId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const items = React.useMemo(() => assignments.map(toBellItem), [assignments]);

  const findAssignment = React.useCallback(
    (assignmentId: string) => assignments.find((a) => a.id === assignmentId),
    [assignments],
  );

  return { assignments, items, fetchState, refresh, findAssignment };
}
