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
  const mountedRef = React.useRef(true);
  const requestSeqRef = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const fetchOrders = React.useCallback(async (): Promise<boolean> => {
    const requestSeq = ++requestSeqRef.current;
    const scopedStoreId = storeId?.trim();
    const routeCanReadOrders = route === 'inbox' || route === 'bell';

    if (!routeCanReadOrders) {
      if (mountedRef.current) {
        setOrders([]);
        setState('disabled');
      }
      return false;
    }

    if (!scopedStoreId) {
      if (mountedRef.current) {
        setOrders([]);
        setState('loading');
      }
      return false;
    }

    setState('loading');
    try {
      const result = await fetchPartnerOrders(undefined, scopedStoreId);
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return false;
      const nextOrders = result.map(mapDshOrderToPartnerOrderItem);
      setOrders(nextOrders);
      setState(nextOrders.length === 0 ? 'empty' : 'ready');
      return true;
    } catch (error) {
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return false;
      const classified = classifyOrderError(error);
      setOrders([]);
      setState(classified.kind === 'offline' ? 'offline' : 'error');
      return false;
    }
  }, [route, storeId]);

  const refresh = React.useCallback(async (): Promise<void> => {
    const readbackVerified = await fetchOrders();
    if (!readbackVerified) {
      throw new Error('Partner order canonical readback was not verified for the current route and store.');
    }
  }, [fetchOrders]);

  React.useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    state,
    refresh,
  } as const;
}
