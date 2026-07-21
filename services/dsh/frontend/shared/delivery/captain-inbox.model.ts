import React from 'react';
import {
  fetchCaptainDispatchAssignments,
  classifyDispatchError,
} from '../dispatch/dispatch.api';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';
import type { DshCaptainOrdersScreenState } from '../orders/orders.contract';
import {
  isCaptainAssignmentActionable,
  toBellItem,
} from './captain-inbox.mapper';

export {
  isCaptainAssignmentActionable,
  resolveServiceType,
  toBellItem,
} from './captain-inbox.mapper';

export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, 'ready' | 'loading' | 'empty' | 'error'>;

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
