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
import type { DshCaptainOrderBellItem, DshCaptainOrdersScreenState } from '../orders';

export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, 'ready' | 'loading' | 'empty' | 'error'>;

function toBellItem(assignment: DshDispatchAssignment): DshCaptainOrderBellItem {
  return {
    id: assignment.id,
    orderId: assignment.orderId,
    kind: assignment.status === 'offered' ? 'incoming-offer' : 'active',
    serviceType: 'standard',
    fulfillmentMode: 'bthwani_delivery',
    title: `طلب #${assignment.orderId}`,
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
