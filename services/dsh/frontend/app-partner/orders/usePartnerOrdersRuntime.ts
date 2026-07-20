import React from 'react';
import {
  classifyOrderError,
  fetchPartnerOrders,
  markOrderReady,
} from '../../shared/orders/orders.api';
import { mapDshOrderToPartnerOrderItem } from '../../shared/partner/partner.adapters';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';

type PartnerOrdersState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';

/**
 * Partner orders runtime bound only to the authenticated partner API surface.
 * It intentionally does not consume the broad operations read model and does
 * not accept a UI-supplied store id.
 */
export function usePartnerOrdersRuntime(route: string) {
  const [orders, setOrders] = React.useState<readonly PartnerOrderItem[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>(
    route === 'inbox' ? 'loading' : 'disabled',
  );

  const fetchOrders = React.useCallback(async () => {
    try {
      const result = await fetchPartnerOrders();
      const nextOrders = result.map(mapDshOrderToPartnerOrderItem);
      setOrders(nextOrders);
      setState(nextOrders.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      const classified = classifyOrderError(error);
      setState(classified.kind === 'offline' ? 'offline' : 'error');
    }
  }, []);

  React.useEffect(() => {
    if (route !== 'inbox') {
      setState('disabled');
      return;
    }
    setState('loading');
    void fetchOrders();
  }, [route, fetchOrders]);

  const markReady = React.useCallback(
    async (orderId: string) => {
      try {
        await markOrderReady(orderId);
        await fetchOrders();
      } catch (error) {
        const classified = classifyOrderError(error);
        setState(classified.kind === 'offline' ? 'offline' : 'error');
        await fetchOrders();
      }
    },
    [fetchOrders],
  );

  return {
    orders,
    state,
    markReady,
    refresh: fetchOrders,
  } as const;
}
