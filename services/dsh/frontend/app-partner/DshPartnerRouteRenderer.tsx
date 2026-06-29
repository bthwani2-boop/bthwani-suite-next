import React from 'react';
import type {
  DshPartnerOperationalFlowId,
  DshPartnerRoute,
  DshPartnerSupportCommandContext,
  DshPartnerSupportRouteId,
  PartnerHubSection,
} from './dsh-partner.types';
import { DshPartnerHubSurface } from './account/PartnerHubScreen';
import { InventoryCatalogScreen } from './Catalog/InventoryCatalogScreen';
import {
  AuctionStatusUpdateScreen,
  ConversationScreen,
  InventoryActionScreen,
  NotificationsScreen,
  OnboardingActionScreen,
  OrderActionScreen,
  OrderIssueScreen,
  VideoUploadScreen,
} from './account/OperationScreens';
import { OrdersInboxScreen } from './orders/OrdersInboxScreen';
import { DshPartnerStoreCourierScreen } from './store/DshPartnerStoreCourierScreen';
import { PartnerStoreScreen } from './store/PartnerStoreScreen';
import { PartnerEntryScreen } from './account/PartnerEntryScreen';
import { PartnerSupportScreen } from './account/PartnerSupportScreen';
import { PartnerCatalogManagementScreen } from './Catalog/PartnerCatalogManagementScreen';
import { ProductEditScreen } from './Catalog/ProductEditScreen';
import { CategoryManagementScreen } from './Catalog/CategoryManagementScreen';
import { ProductMediaScreen } from './Catalog/ProductMediaScreen';
import { ProductOverridesScreen } from './Catalog/ProductOverridesScreen';
import { defaultServiceModes } from '../shared/delivery';

import type { PartnerOrderItem } from '../shared/orders/orders.contract';

type Props = {
  route: DshPartnerRoute;
  initialOrderId: string;
  activeOrderId: string;
  ordersSearchMode: boolean;
  accountHubSection: PartnerHubSection;
  editingProductId: string | undefined;
  selectedSupportScreen: DshPartnerSupportRouteId;
  supportCommandContext: DshPartnerSupportCommandContext;
  partnerOrdersState: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
  partnerOrders: readonly PartnerOrderItem[];
  runtimePartnerProfile: { storeName: string; branchLabel: string; cityLabel: string; managerLabel: string; todayHoursLabel: string; activeZoneLabel: string };
  selectedStoreScope: { label: string };
  selectedStoreScopeId: string;
  deliveryOpsSummary: { outForDelivery: number; handoffReady: number; deliveredToday: number; delayedRisk: number };
  dshAuthBearerToken: string | undefined;
  dshClientId: string | undefined;
  renderMainShell: (content: React.ReactNode) => React.ReactElement;
  renderSurfaceShell: (content: React.ReactNode) => React.ReactElement;
  setRoute: (r: DshPartnerRoute) => void;
  setActiveOrderId: (id: string) => void;
  setOrdersSearchMode: (v: boolean) => void;
  setAccountHubSection: (s: PartnerHubSection) => void;
  setEditingProductId: (id: string | undefined) => void;
  setSupportState: (next: { screenId: DshPartnerSupportRouteId; commandContext: DshPartnerSupportCommandContext }) => void;
  openOrdersBoard: () => void;
  openOrdersSearch: () => void;
  openAccountHub: (section: PartnerHubSection) => void;
  goBackToHub: () => void;
  openSupportDirectory: (context?: Partial<DshPartnerSupportCommandContext>) => void;
  returnToSupportDirectory: () => void;
  openSupportScreen: (screenId: DshPartnerSupportRouteId, source?: DshPartnerSupportCommandContext['source']) => void;
  openInventoryManagement: () => void;
  openStoreCourier: () => void;
  openSupportCommandFromOperationalFlow: (flowId: DshPartnerOperationalFlowId, source?: DshPartnerSupportCommandContext['source']) => void;
  handleMarkReady: (orderId: string) => void;
};

export function DshPartnerRouteRenderer(props: Props): React.ReactElement {
  const {
    route, initialOrderId, activeOrderId, ordersSearchMode, accountHubSection,
    editingProductId, selectedSupportScreen, supportCommandContext,
    partnerOrdersState, partnerOrders, runtimePartnerProfile, selectedStoreScope,
    deliveryOpsSummary, dshAuthBearerToken, dshClientId,
    renderMainShell, renderSurfaceShell,
    setRoute, setActiveOrderId, setOrdersSearchMode, openOrdersBoard, openOrdersSearch, openAccountHub,
    goBackToHub, openSupportDirectory, returnToSupportDirectory, openSupportScreen,
    openInventoryManagement, openStoreCourier, openSupportCommandFromOperationalFlow,
    handleMarkReady, setEditingProductId,
    selectedStoreScopeId,
  } = props;

  const activeStoreRuntimeId = selectedStoreScopeId === 'all' ? '' : selectedStoreScopeId;

  if (route === 'home') {
    return renderSurfaceShell(
      <DshPartnerHubSurface
        section={accountHubSection} onSectionChange={props.setAccountHubSection}
        storeName={runtimePartnerProfile.storeName} branchLabel={selectedStoreScope.label}
        cityLabel={runtimePartnerProfile.cityLabel} managerLabel={runtimePartnerProfile.managerLabel}
        todayHoursLabel={runtimePartnerProfile.todayHoursLabel} activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
        storeOpen listingEnabled serviceModes={defaultServiceModes}
        activeOrdersCount={deliveryOpsSummary.outForDelivery + deliveryOpsSummary.handoffReady}
        urgentOrdersCount={deliveryOpsSummary.delayedRisk} pendingActionsCount={deliveryOpsSummary.handoffReady}
        onOpenOrdersBoard={openOrdersBoard} onOpenOrdersSearch={openOrdersSearch}
        onOpenInventoryManagement={openInventoryManagement} onOpenStoreScope={() => {}}
        onOpenSupportDirectory={() => openSupportDirectory({ source: 'hub' })} onOpenWalletHub={() => openAccountHub('wallet')}
        onOpenBell={() => { setActiveOrderId(initialOrderId); setRoute('bell'); }}
        onOpenOperationalFlow={(flowId) => openSupportCommandFromOperationalFlow(flowId, 'hub')}
        onOpenSupportScreen={(screenId) => openSupportScreen(screenId, 'hub')}
        onOpenStoreCourierSetup={openStoreCourier}
        dshAuthBearerToken={dshAuthBearerToken ?? null} dshClientId={dshClientId ?? null}
      />,
    ) as React.ReactElement;
  }

  if (route === 'entry') {
    return renderSurfaceShell(
      <PartnerEntryScreen
        state="ready" onOpenOrdersBoardPress={openOrdersBoard} onOpenOrderDetailPress={openOrdersBoard}
        onOpenMaintenancePress={() => openAccountHub('profile')}
        onOpenIssueQueuePress={() => openSupportCommandFromOperationalFlow('order-issue-queue', 'orders')}
      />,
    ) as React.ReactElement;
  }

  if (route === 'bell') {
    return renderSurfaceShell(
      <NotificationsScreen
        {...((activeOrderId && activeOrderId !== initialOrderId) ? { activeOrderId } : {})}
        onOpenInbox={openOrdersBoard}
        onOpenOrderSupport={(orderId) => { setActiveOrderId(orderId); openSupportCommandFromOperationalFlow('order-alerts', 'bell'); }}
        onOpenAlertsSupport={(flowId) => openSupportCommandFromOperationalFlow(flowId, 'bell')}
        onBack={openOrdersBoard} onRetry={() => setRoute('bell')}
      />,
    ) as React.ReactElement;
  }

  if (route === 'inbox') {
    return renderMainShell(
      <OrdersInboxScreen
        state={partnerOrdersState} items={partnerOrders} searchMode={ordersSearchMode}
        onCloseSearch={() => setOrdersSearchMode(false)} onMarkReady={handleMarkReady}
        onRetry={() => setRoute('inbox')}
      />,
    ) as React.ReactElement;
  }

  if (route === 'inventory-management') {
    return renderSurfaceShell(
      <PartnerCatalogManagementScreen />,
    ) as React.ReactElement;
  }

  if (route === 'product-edit') {
    return renderSurfaceShell(
      <ProductEditScreen storeId={activeStoreRuntimeId} productId={editingProductId ?? ''}
        onBack={() => setRoute('inventory-management')}
        onSaved={() => { setEditingProductId(undefined); setRoute('inventory-management'); }}
      />,
    ) as React.ReactElement;
  }

  if (route === 'category-management') return renderSurfaceShell(<CategoryManagementScreen storeId={activeStoreRuntimeId} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'product-media') return renderSurfaceShell(<ProductMediaScreen productId={editingProductId ?? ''} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'product-overrides') return renderSurfaceShell(<ProductOverridesScreen productId={editingProductId ?? ''} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'store-courier') return renderSurfaceShell(<DshPartnerStoreCourierScreen onBack={() => openAccountHub('operations')} />) as React.ReactElement;
  if (route === 'team-management') return renderSurfaceShell(<PartnerStoreScreen />) as React.ReactElement;

  if (route === 'support-directory') {
    return renderSurfaceShell(
      <PartnerSupportScreen onBack={goBackToHub} onOpenScreen={openSupportScreen}
        initialFilterId={supportCommandContext.filterId}
        initialCaseId={supportCommandContext.highlightedCaseId ?? null}
        initialIssueCategoryId={supportCommandContext.highlightedIssueCategoryId ?? null}
        initialSupportRouteId={supportCommandContext.preferredSupportRouteId ?? null}
      />,
    ) as React.ReactElement;
  }

  if (route === 'order-rejection') {
    return renderSurfaceShell(
      <OrderIssueScreen activeFlowId="order-reject"
        selectedCategoryId={supportCommandContext.highlightedIssueCategoryId ?? 'partner-reject-request'}
        onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory}
      />,
    ) as React.ReactElement;
  }

  if (route === 'support-screen') {
    const catId = supportCommandContext.highlightedIssueCategoryId ?? 'partner-reject-request';
    const screens: Record<DshPartnerSupportRouteId, React.ReactNode> = {
      'auction-status-update': <AuctionStatusUpdateScreen onBack={returnToSupportDirectory} onSecondaryAction={returnToSupportDirectory} />,
      'chat-read-ack': <ConversationScreen activeFlowId="chat-read-ack" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('quick-reply-config')} />,
      'chat-send': <ConversationScreen activeFlowId="chat-send" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('quick-reply-setup')} />,
      'doc-upload': <OnboardingActionScreen activeFlowId="doc-upload" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'intake-start': <OnboardingActionScreen activeFlowId="intake-start" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'inventory-adjust': <InventoryActionScreen activeFlowId="inventory-adjust" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('inventory-update')} />,
      'inventory-update': <InventoryActionScreen activeFlowId="inventory-update" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'items-upsert': <InventoryActionScreen activeFlowId="items-upsert" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-accept': <OrderActionScreen activeFlowId="order-accept" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('order-get')} />,
      'order-get': <OrderActionScreen activeFlowId="order-get" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('order-handoff')} />,
      'order-handoff': <OrderActionScreen activeFlowId="order-handoff" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-issue-queue': <OrderIssueScreen activeFlowId="order-issue-queue" selectedCategoryId={catId} onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-out-for-delivery': <OrderActionScreen activeFlowId="order-out-for-delivery" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-prepare': <OrderActionScreen activeFlowId="order-prepare" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-ready': <OrderActionScreen activeFlowId="order-ready" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-reject': <OrderIssueScreen activeFlowId="order-reject" selectedCategoryId={catId} onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'order-store-delivered': <OrderActionScreen activeFlowId="order-store-delivered" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'quick-reply-config': <ConversationScreen activeFlowId="quick-reply-config" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('quick-reply-settings')} />,
      'quick-reply-settings': <ConversationScreen activeFlowId="quick-reply-settings" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={() => openSupportScreen('quick-reply-setup')} />,
      'quick-reply-setup': <ConversationScreen activeFlowId="quick-reply-setup" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'store-nomination': <OnboardingActionScreen activeFlowId="store-nomination" onBack={returnToSupportDirectory} onOpenScreen={openSupportScreen} onSecondaryAction={returnToSupportDirectory} />,
      'video-upload': <VideoUploadScreen onBack={returnToSupportDirectory} onSecondaryAction={returnToSupportDirectory} />,
    };
    return renderSurfaceShell(screens[selectedSupportScreen]) as React.ReactElement;
  }

  return renderMainShell(
    <DshPartnerHubSurface
      storeName={runtimePartnerProfile.storeName} branchLabel={selectedStoreScope.label}
      cityLabel={runtimePartnerProfile.cityLabel} managerLabel={runtimePartnerProfile.managerLabel}
      todayHoursLabel={runtimePartnerProfile.todayHoursLabel} activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
      onOpenOrdersBoard={openOrdersBoard} onOpenInventoryManagement={openInventoryManagement}
      onOpenStoreScope={() => {}} onOpenWalletHub={() => openAccountHub('wallet')}
      onOpenSupportDirectory={() => openSupportDirectory({ source: 'hub' })}
      onOpenOperationalFlow={(flowId) => openSupportCommandFromOperationalFlow(flowId, 'hub')}
      onOpenSupportScreen={(screenId) => openSupportScreen(screenId, 'hub')}
      onOpenStoreCourierSetup={openStoreCourier}
    />,
  ) as React.ReactElement;
}
