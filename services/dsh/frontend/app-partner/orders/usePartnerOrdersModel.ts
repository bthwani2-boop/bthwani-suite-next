// Canonical location: dsh/frontend/app-partner/runtime-hooks/usePartnerOrdersModel.ts
// Authority: app-partner — partner orders query and execution state.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { DshPartnerRoute } from '../../shared/partner/partner.types';
import { usePartnerOrdersRuntime } from './usePartnerOrdersRuntime';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';

export function usePartnerOrdersModel({
  route,
  initialOrderId = '',
  setRoute,
}: {
  route: DshPartnerRoute;
  initialOrderId?: string;
  setRoute: (r: DshPartnerRoute) => void;
}) {
  const [ordersSearchMode, setOrdersSearchMode] = React.useState(false);
  const [editingProductId, setEditingProductId] = React.useState<string | undefined>(undefined);
  const [activeOrderId, setActiveOrderId] = React.useState(initialOrderId);

  const { orders: partnerOrders, state: partnerOrdersState, refresh } = usePartnerOrdersRuntime(route) as {
    orders: readonly GovernedPartnerOrderItem[];
    state: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
    refresh: () => void | Promise<void>;
  };

  const openOrdersBoard = React.useCallback(() => {
    setOrdersSearchMode(false);
    setRoute('inbox');
  }, [setRoute]);

  const openOrdersSearch = React.useCallback(() => {
    setOrdersSearchMode(true);
    setRoute('inbox');
  }, [setRoute]);

  return {
    ordersSearchMode,
    setOrdersSearchMode,
    editingProductId,
    setEditingProductId,
    activeOrderId,
    setActiveOrderId,
    partnerOrders,
    partnerOrdersState,
    refresh,
    openOrdersBoard,
    openOrdersSearch,
  };
}
