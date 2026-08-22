// Canonical location: dsh/frontend/app-partner/orders/usePartnerOrdersModel.ts
// Authority: app-partner — partner orders query/readback state only.

import type { DshPartnerRoute } from '../../shared/partner/partner.types';
import { usePartnerOrdersRuntime } from './usePartnerOrdersRuntime';

export function usePartnerOrdersModel({
  route,
  storeId,
}: {
  readonly route: DshPartnerRoute;
  readonly storeId?: string;
}) {
  const { orders: partnerOrders, state: partnerOrdersState, refresh } = usePartnerOrdersRuntime(route, storeId);
  return { partnerOrders, partnerOrdersState, refresh };
}
