import React from 'react';
import {
  fetchOrderPreparation,
  classifyOrderError,
} from './orders.api';
import type { DshOrderPreparation } from './orders.types';
import {
  classifyOrderTruthFailure,
  fetchClientOrderTruthDetail,
  isTerminalOrderTruth,
  type OrderTruth,
} from '../order-truth';
import { fetchClientOrderTracking, classifyDispatchError } from '../dispatch/dispatch.api';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';

export type ClientOrderJourneyState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly order: OrderTruth;
      readonly preparation: DshOrderPreparation;
      readonly assignment: DshDispatchAssignment | null;
    };

function orderErrorMessage(error: unknown): string {
  const truthFailure = classifyOrderTruthFailure(error, 'client');
  if (truthFailure.kind !== 'error') return truthFailure.message;
  const classified = classifyOrderError(error);
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية عرض هذا الطلب.';
  if (classified.kind === 'not_found') return 'الطلب غير موجود.';
  if (classified.kind === 'offline') return 'تعذر الاتصال بخدمة الطلبات.';
  return classified.message ?? truthFailure.message;
}

/**
 * Shared client journey controller. The order itself is always read from the
 * JRN-011 actor-scoped order-truth endpoint. Preparation and dispatch remain
 * separate operational projections and cannot override order truth.
 */
export function useClientOrderJourneyController(orderId: string) {
  const [state, setState] = React.useState<ClientOrderJourneyState>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    if (!orderId.trim()) {
      setState({ kind: 'error', message: 'رقم الطلب مطلوب.' });
      return;
    }

    try {
      const [order, preparation] = await Promise.all([
        fetchClientOrderTruthDetail(orderId),
        fetchOrderPreparation(orderId),
      ]);
      let assignment: DshDispatchAssignment | null = null;
      try {
        assignment = await fetchClientOrderTracking(orderId);
      } catch (trackingError) {
        const classified = classifyDispatchError(trackingError);
        if (classified.kind !== 'not_found') {
          if (classified.kind === 'permission_denied') {
            setState({ kind: 'error', message: 'لا تملك صلاحية عرض تتبع هذا الطلب.' });
            return;
          }
          if (classified.kind === 'offline') assignment = null;
        }
      }
      setState({ kind: 'ready', order, preparation, assignment });
    } catch (error) {
      setState({ kind: 'error', message: orderErrorMessage(error) });
    }
  }, [orderId]);

  React.useEffect(() => {
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  React.useEffect(() => {
    if (state.kind !== 'ready' || isTerminalOrderTruth(state.order)) return undefined;
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load, state]);

  return { state, reload: load } as const;
}
