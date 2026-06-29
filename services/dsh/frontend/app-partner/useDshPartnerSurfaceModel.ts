// Canonical location: dsh/frontend/app-partner/hooks/useDshPartnerSurfaceModel.ts
// Authority: dsh/frontend/app-partner — partner surface.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type {
  DshPartnerRoute,
  DshPartnerSupportRouteId,
  DshPartnerSupportCommandContext,
  DshPartnerOperationalFlowId,
  PartnerHubSection,
} from '../shared/partner/partner.types';
import { storeScopeOptions } from '../shared/partner/partner.types';
import type { PartnerOrderItem } from '../shared/orders';

// Topic models
import { usePartnerProfileModel } from './account/usePartnerProfileModel';
import { useStoreScopeModel } from '../shared/partner/store-scope.model';
import { usePartnerOrdersModel } from './orders/usePartnerOrdersModel';
import { usePartnerSupportModel } from '../shared/support/partner-support.model';
import { usePartnerOpsSummaryModel } from '../shared/operations/partner-ops-summary.model';
import type { PartnerDeliveryOpsSummary } from '../shared/partner/partner.adapters';

export type DshPartnerSurfaceState = {
  route: DshPartnerRoute;
  storeScopeVisible: boolean;
  accountHubSection: PartnerHubSection;
  ordersSearchMode: boolean;
  selectedStoreScopeId: string;
  editingProductId: string | undefined;
  activeOrderId: string;
  supportNav: {
    screen: DshPartnerSupportRouteId;
    context: DshPartnerSupportCommandContext;
  };
};

export type DshPartnerSurfaceActions = {
  setRoute: (route: DshPartnerRoute) => void;
  setStoreScopeVisible: (visible: boolean) => void;
  setAccountHubSection: (section: PartnerHubSection) => void;
  setOrdersSearchMode: (mode: boolean) => void;
  setSelectedStoreScopeId: (id: string) => void;
  setEditingProductId: (id: string | undefined) => void;
  setActiveOrderId: (id: string) => void;
  setSelectedSupportScreen: (screenId: DshPartnerSupportRouteId) => void;
  setSupportCommandContext: (context: DshPartnerSupportCommandContext) => void;
  handleOperationalFlowNavigation: (flowId: DshPartnerOperationalFlowId, source?: DshPartnerSupportCommandContext['source']) => void;
  openOrdersBoard: () => void;
  openOrdersSearch: () => void;
  openAccountHub: (section: PartnerHubSection) => void;
  goBackToHub: () => void;
  openSupportDirectory: (context?: Partial<DshPartnerSupportCommandContext>) => void;
  returnToSupportDirectory: () => void;
  openInventoryManagement: () => void;
  openStoreCourier: () => void;
  openWalletHub: () => void;
  openStoreScope: () => void;
  openSupportScreen: (screenId: DshPartnerSupportRouteId, source?: DshPartnerSupportCommandContext['source']) => void;
  handleMarkReady: (orderId: string) => void;
  handleHardwareBackPress: () => boolean;
};

export type DshPartnerSurfaceModel = {
  state: DshPartnerSurfaceState;
  actions: DshPartnerSurfaceActions;
  selectedStoreScope: { id: string; label: string; description: string };
  runtimePartnerProfile: {
    storeName: string;
    branchLabel: string;
    cityLabel: string;
    managerLabel: string;
    todayHoursLabel: string;
    activeZoneLabel: string;
  };
  partnerOrdersState: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
  partnerOrders: readonly PartnerOrderItem[];
  deliveryOpsSummary: PartnerDeliveryOpsSummary;
  isCommandCenterInline: boolean;
};

export function useDshPartnerSurfaceModel(
  initialRoute: DshPartnerRoute = 'inbox',
  initialOrderId: string = '',
): DshPartnerSurfaceModel {
  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const profile = usePartnerProfileModel(initialRoute);
  const storeScope = useStoreScopeModel();
  const orders = usePartnerOrdersModel({
    route: profile.route,
    initialOrderId,
    setRoute: profile.setRoute,
  });
  const support = usePartnerSupportModel({
    initialRoute,
    setRoute: profile.setRoute,
  });
  const opsSummary = usePartnerOpsSummaryModel(orders.partnerOrders);

  // ── Sync order search mode when route changes ─────────────────────────────
  React.useEffect(() => {
    if (profile.route !== 'inbox' && orders.ordersSearchMode) {
      orders.setOrdersSearchMode(false);
    }
  }, [profile.route, orders]);

  // ── Orchestrated back press ───────────────────────────────────────────────
  const handleHardwareBackPress = React.useCallback(() => {
    if (storeScope.storeScopeVisible) {
      storeScope.setStoreScopeVisible(false);
      return true;
    }
    if (orders.ordersSearchMode) {
      orders.setOrdersSearchMode(false);
      return true;
    }
    if (profile.route === 'home' && profile.accountHubSection !== 'hub') {
      profile.setAccountHubSection('hub');
      return true;
    }
    if (profile.routeHistoryRef.current.length > 1) {
      profile.routeTransitionFromBackRef.current = true;
      profile.routeHistoryRef.current.pop();
      profile.setRoute(profile.routeHistoryRef.current[profile.routeHistoryRef.current.length - 1] ?? 'entry');
      return true;
    }
    return false;
  }, [storeScope, orders, profile]);

  const state: DshPartnerSurfaceState = {
    route: profile.route,
    storeScopeVisible: storeScope.storeScopeVisible,
    accountHubSection: profile.accountHubSection,
    ordersSearchMode: orders.ordersSearchMode,
    selectedStoreScopeId: storeScope.selectedStoreScopeId,
    editingProductId: orders.editingProductId,
    activeOrderId: orders.activeOrderId,
    supportNav: support.supportNav,
  };

  const actions: DshPartnerSurfaceActions = {
    setRoute: profile.setRoute,
    setStoreScopeVisible: storeScope.setStoreScopeVisible,
    setAccountHubSection: profile.setAccountHubSection,
    setOrdersSearchMode: orders.setOrdersSearchMode,
    setSelectedStoreScopeId: storeScope.setSelectedStoreScopeId,
    setEditingProductId: orders.setEditingProductId,
    setActiveOrderId: orders.setActiveOrderId,
    setSelectedSupportScreen: support.setSelectedSupportScreen,
    setSupportCommandContext: support.setSupportCommandContext,
    handleOperationalFlowNavigation: support.handleOperationalFlowNavigation,
    openOrdersBoard: orders.openOrdersBoard,
    openOrdersSearch: orders.openOrdersSearch,
    openAccountHub: profile.openAccountHub,
    goBackToHub: profile.goBackToHub,
    openSupportDirectory: support.openSupportDirectory,
    returnToSupportDirectory: support.returnToSupportDirectory,
    openInventoryManagement: profile.openInventoryManagement,
    openStoreCourier: profile.openStoreCourier,
    openWalletHub: profile.openWalletHub,
    openStoreScope: storeScope.openStoreScope,
    openSupportScreen: support.openSupportScreen,
    handleMarkReady: orders.handleMarkReady,
    handleHardwareBackPress,
  };

  return {
    state,
    actions,
    selectedStoreScope: storeScope.selectedStoreScope,
    runtimePartnerProfile: storeScope.runtimePartnerProfile,
    partnerOrdersState: orders.partnerOrdersState,
    partnerOrders: orders.partnerOrders,
    deliveryOpsSummary: opsSummary.deliveryOpsSummary,
    isCommandCenterInline: support.isCommandCenterInline,
  };
}
