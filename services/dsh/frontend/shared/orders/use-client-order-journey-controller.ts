import React from 'react';
import {
  fetchClientOrder,
  fetchOrderPreparation,
  classifyOrderError,
} from './orders.api';
import {
  isOrderCancellationStatus,
  type DshOrder,
  type DshOrderPreparation,
} from './orders.types';
import { fetchClientOrderTracking, classifyDispatchError } from '../dispatch/dispatch.api';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';

export type ClientOrderJourneyState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly order: DshOrder;
      readonly preparation: DshOrderPreparation;
      readonly assignment: DshDispatchAssignment | null;
    };

function orderErrorMessage(error: unknown): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية عرض هذا الطلب.';
  if (classified.kind === 'not_found') return 'الطلب غير موجود.';
  if (classified.kind === 'offline') return 'تعذر الاتصال بخدمة الطلبات.';
  return classified.message ?? 'تعذر تحميل الطلب.';
}

/**
 * Shared DSH controller for client order readback across order, preparation,
 * and optional dispatch assignment. Surfaces render this state only.
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
        fetchClientOrder(orderId),
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
    if (state.kind !== 'ready') return undefined;
    if (state.order.status === 'delivered' || isOrderCancellationStatus(state.order.status)) return undefined;
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load, state]);

  return { state, reload: load } as const;
}
