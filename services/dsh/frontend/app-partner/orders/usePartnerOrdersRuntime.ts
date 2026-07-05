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
  const partnerClientId = dshClientId || 'partner-dev-001';

  const [orders, setOrders] = React.useState<readonly PartnerOrderItemLike[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>('loading');

  const orderLifecycleClient = React.useMemo(
    () => createDshOrderLifecycleHttpClient(resolveDshOrderApiBaseUrl(), undefined, { clientId: partnerClientId }),
    [partnerClientId],
  );

  React.useEffect(() => {
    if (route !== 'inbox') return;
    let cancelled = false;
    setState('loading');
    fetchDshRuntimeOrders({ limit: 100, scope: 'partner' }, partnerClientId, 'partner').then((result) => {
      if (cancelled) return;
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
      if (!cancelled) setState('error');
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  const markReady = React.useCallback(
    (orderId: string) => {
      orderLifecycleClient
        .updateOrderStatus(orderId, { actor: 'partner', status: 'ready_for_pickup' })
        .then(() => {
          setOrders((prev) =>
            prev.map((item) =>
              item.id === orderId ? { ...item, status: 'ready' as const } : item,
            ),
          );
        })
        .catch(() => {
          // Keep the current row state so the caller can retry the action.
        });
    },
    [orderLifecycleClient],
  );

  return {
    orders,
    state,
    markReady,
  } as const;
}
