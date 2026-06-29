// Canonical location: dsh/frontend/shared/operations/partner-ops-summary.model.ts
// Authority: dsh/frontend/shared/operations — partner delivery operations summary.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import { getActionableHandoffsForSurface } from '../orders/dsh-order-lifecycle-handoffs';
import { buildPartnerDeliveryOpsSummary } from '../partner/partner.adapters';
import type { PartnerOrderItem } from '../orders';

export function usePartnerOpsSummaryModel(partnerOrders: readonly PartnerOrderItem[]) {
  const partnerActionableHandoffs = React.useMemo(
    () => getActionableHandoffsForSurface('app-partner'),
    [],
  );

  const deliveryOpsSummary = React.useMemo(
    () => buildPartnerDeliveryOpsSummary(partnerOrders, partnerActionableHandoffs),
    [partnerActionableHandoffs, partnerOrders],
  );

  return {
    deliveryOpsSummary,
  };
}
