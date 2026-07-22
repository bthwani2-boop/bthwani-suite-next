import React from 'react';
import { classifyDispatchError } from './dispatch.api';
import {
  fetchPartnerDispatchTrackingReference,
  type DshPartnerDispatchTrackingResponse,
} from './dispatch-tracking.api';

export type PartnerDispatchTrackingState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'ready'; readonly value: DshPartnerDispatchTrackingResponse }
  | { readonly kind: 'error'; readonly message: string };

export function usePartnerDispatchTracking(orderId: string) {
  const [state, setState] = React.useState<PartnerDispatchTrackingState>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    if (!orderId.trim()) {
      setState({ kind: 'empty' });
      return;
    }
    try {
      const value = await fetchPartnerDispatchTrackingReference(orderId);
      setState({ kind: 'ready', value });
    } catch (error) {
      const classified = classifyDispatchError(error);
      if (classified.kind === 'not_found') {
        setState({ kind: 'empty' });
        return;
      }
      if (classified.kind === 'permission_denied') {
        setState({ kind: 'error', message: 'لا تملك صلاحية عرض مرجع توصيل هذا الطلب.' });
        return;
      }
      if (classified.kind === 'offline') {
        setState({ kind: 'error', message: 'تعذر الاتصال بخدمة التتبع. أعد المحاولة بعد عودة الشبكة.' });
        return;
      }
      setState({ kind: 'error', message: classified.message ?? 'تعذر تحميل مرجع التوصيل.' });
    }
  }, [orderId]);

  React.useEffect(() => {
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  React.useEffect(() => {
    if (state.kind !== 'ready') return undefined;
    const status = state.value.assignment.delivery.status;
    if (status === 'delivered' || status === 'cancelled' || status === 'returned_to_store') return undefined;
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load, state]);

  return { state, reload: load } as const;
}
