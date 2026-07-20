import React from 'react';
import {
  classifyOrderError,
  fetchPartnerOrders,
} from '../../shared/orders/orders.api';
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
export function usePartnerOrdersRuntime(route: string) {
  const [orders, setOrders] = React.useState<readonly GovernedPartnerOrderItem[]>([]);
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

  return {
    orders,
    state,
    refresh: fetchOrders,
  } as const;
}
