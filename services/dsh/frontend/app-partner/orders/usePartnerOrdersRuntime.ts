import React from 'react';
import {
  createDshOrderLifecycleHttpClient,
  resolveDshOrderApiBaseUrl,
} from '../../shared/orders/dsh-order-lifecycle-client';
import {
  fetchDshRuntimeOrders,
} from '../../shared/operations/dsh-operational-runtime-adapter';
import { mapRuntimeRowToPartnerOrderItem } from '../../shared/partner/partner.adapters';
import { usePlatformVars } from '../../shared/platform/PlatformVarsProvider';

type PartnerOrderItemLike = ReturnType<typeof mapRuntimeRowToPartnerOrderItem>;
type PartnerOrdersState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';

export function usePartnerOrdersRuntime(route: string) {
  const { dshClientId } = usePlatformVars();

  const [orders, setOrders] = React.useState<readonly PartnerOrderItemLike[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>(dshClientId ? 'loading' : 'disabled');

  const orderLifecycleClient = React.useMemo(
    () => (dshClientId
      ? createDshOrderLifecycleHttpClient(resolveDshOrderApiBaseUrl(), undefined, { clientId: dshClientId })
      : null),
    [dshClientId],
  );

  const fetchOrders = React.useCallback(() => {
    if (!dshClientId) return;
    fetchDshRuntimeOrders({ limit: 100, scope: 'partner' }, dshClientId, 'partner').then((result) => {
      if (result.kind === 'ok') {
        const nextOrders = result.orders.map(mapRuntimeRowToPartnerOrderItem);
        setOrders(nextOrders);
        setState(nextOrders.length === 0 ? 'empty' : 'ready');
      } else if (result.kind === 'offline') {
        setState('offline');
      } else {
        setState('error');
      }
    }).catch(() => {
      setState('error');
    });
  }, [dshClientId]);

  React.useEffect(() => {
    if (route !== 'inbox') return;
    if (!dshClientId) {
      setState('disabled');
      return;
    }
    setState('loading');
    fetchOrders();
    
    // Polling could be added here for real-time updates
  }, [route, dshClientId, fetchOrders]);

  const markReady = React.useCallback(
    (orderId: string) => {
      if (!orderLifecycleClient) return;
      
      // Optimistic update
      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId ? { ...item, status: 'ready' as const } : item,
        ),
      );

      orderLifecycleClient
        .updateOrderStatus(orderId, { actor: 'partner', status: 'ready_for_pickup' })
        .then(() => {
          // Read-after-write for conflict resolution
          fetchOrders();
        })
        .catch(() => {
          // Rollback on error (handled by a fresh read)
          fetchOrders();
        });
    },
    [orderLifecycleClient, fetchOrders],
  );

  return {
    orders,
    state,
    markReady,
    refresh: fetchOrders,
  } as const;
}
