import React from 'react';
import { acceptPartnerReturnToStore, fetchPartnerReturnToStore } from './dispatch.api';
import type { DshDeliveryException } from './dispatch.types';

export type PartnerReturnToStoreState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'none' }
  | { readonly kind: 'ready'; readonly item: DshDeliveryException; readonly accepting: boolean }
  | { readonly kind: 'error'; readonly message: string };

function isNotFound(error: unknown): boolean {
  const typed = error as { status?: number; body?: { code?: string } };
  return typed.status === 404 || typed.body?.code === 'NOT_FOUND';
}

export function usePartnerReturnToStoreController(orderId: string) {
  const [state, setState] = React.useState<PartnerReturnToStoreState>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    try {
      const item = await fetchPartnerReturnToStore(orderId);
      setState({ kind: 'ready', item, accepting: false });
    } catch (error) {
      if (isNotFound(error)) {
        setState({ kind: 'none' });
        return;
      }
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر قراءة حالة المرتجع.',
      });
    }
  }, [orderId]);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const accept = React.useCallback(async () => {
    setState((current) => current.kind === 'ready' ? { ...current, accepting: true } : current);
    try {
      const item = await acceptPartnerReturnToStore(orderId);
      setState({ kind: 'ready', item, accepting: false });
      return true;
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تأكيد استلام المرتجع.',
      });
      return false;
    }
  }, [orderId]);

  return { state, load, accept } as const;
}
