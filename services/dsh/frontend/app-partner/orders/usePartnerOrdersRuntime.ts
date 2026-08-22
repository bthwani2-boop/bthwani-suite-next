import React from 'react';
import {
  classifyOrderError,
  fetchPartnerOrders,
} from '../../shared/orders';
import {
  mapDshOrderToPartnerOrderItem,
  type GovernedPartnerOrderItem,
} from '../../shared/partner/partner.adapters';

type PartnerOrdersState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';

/**
 * Actor-scoped partner workboard. It owns reads only; all mutations are
 * centralized in usePartnerOrderCommands so every button uses the same
 * server-authoritative action set and read-after-write refresh.
 */
export function usePartnerOrdersRuntime(route: string, storeId?: string) {
  const [orders, setOrders] = React.useState<readonly GovernedPartnerOrderItem[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>(
    route === 'inbox' ? 'loading' : 'disabled',
  );

  const fetchOrders = React.useCallback(async () => {
    const scopedStoreId = storeId?.trim();
    if (!scopedStoreId) {
      setOrders([]);
      setState('loading');
      return;
    }
    try {
      const result = await fetchPartnerOrders(undefined, scopedStoreId);
      const nextOrders = result.map(mapDshOrderToPartnerOrderItem);
      setOrders(nextOrders);
      setState(nextOrders.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      const classified = classifyOrderError(error);
      setOrders([]);
      setState(classified.kind === 'offline' ? 'offline' : 'error');
    }
  }, [storeId]);

  React.useEffect(() => {
    if (route !== 'inbox' && route !== 'bell') {
      setOrders([]);
      setState('disabled');
      return;
    }
    if (!storeId?.trim()) {
      setOrders([]);
      setState('loading');
      return;
    }
    setState('loading');
    void fetchOrders();
  }, [route, storeId, fetchOrders]);

  return {
    orders,
    state,
    refresh: fetchOrders,
  } as const;
}
