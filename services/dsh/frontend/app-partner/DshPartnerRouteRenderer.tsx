import React from 'react';
import type {
  DshPartnerOperationalFlowId,
  DshPartnerRoute,
  DshPartnerSupportCommandContext,
  DshPartnerSupportRouteId,
  PartnerHubSection,
} from './dsh-partner.types';
import type { DshPartnerOperationalScope } from '../shared/partner/partner.types';
import { DshPartnerHubSurface } from './account/PartnerHubScreen';
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
import { DshPartnerOrderRejectionScreen, type DshPartnerOrderRejectionScreenProps } from './orders/DshPartnerOrderRejectionScreen';
import { DshPartnerStoreCourierScreen } from './store/DshPartnerStoreCourierScreen';
import { PartnerTeamManagementScreen } from './team/PartnerTeamManagementScreen';
import { PartnerEntryScreen } from './account/PartnerEntryScreen';
import { PartnerSupportScreen } from './account/PartnerSupportScreen';
import { PartnerCatalogManagementScreen } from './catalog/PartnerCatalogManagementScreen';
import { ProductEditScreen } from './catalog/ProductEditScreen';
import { CategoryManagementScreen } from './catalog/CategoryManagementScreen';
import { ProductMediaScreen } from './catalog/ProductMediaScreen';
import { ProductOverridesScreen } from './catalog/ProductOverridesScreen';
import { defaultServiceModes } from '../shared/delivery';
import { DSH_PARTNER_BINDING_CONTRACTS } from './dsh-partner-binding.contracts';

// Dev-mode binding contract guard: validates that every rendered surface
// has a corresponding registered binding contract. Fails fast in development.
function assertRouteHasBindingContract(route: DshPartnerRoute): void {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev) return;
  const surfaceId = route as string;
  const registered = DSH_PARTNER_BINDING_CONTRACTS.some(c => c.surfaceId === surfaceId);
  if (!registered) {
    console.warn(
      `[DshPartnerRouteRenderer] Route "${surfaceId}" has no registered binding contract. ` +
      `Add an entry to DSH_PARTNER_BINDING_CONTRACTS in dsh-partner-binding.contracts.ts.`
    );
  }
}

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
  selectedStoreScope: DshPartnerOperationalScope;
  selectedStoreScopeId: string;
  deliveryOpsSummary: { outForDelivery: number; handoffReady: number; deliveredToday: number; delayedRisk: number };
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
  openStoreScope: () => void;
  openSupportCommandFromOperationalFlow: (flowId: DshPartnerOperationalFlowId, source?: DshPartnerSupportCommandContext['source']) => void;
  handleMarkReady: (orderId: string) => void;
  refreshOrders: () => void;
  teamMembers: readonly import('./team/partner-team.types').PartnerTeamMember[];
  isTeamLoading?: boolean;
  teamError?: string | null;
  onInviteMember: (identity: string) => Promise<import('./team/usePartnerTeamModel').PartnerTeamMutationResult>;
  onMemberAction: (memberId: string, actionLabel: string) => Promise<import('./team/usePartnerTeamModel').PartnerTeamMutationResult>;
  scopes: readonly import('../shared/partner/partner.types').DshPartnerOperationalScope[];
};

const PARTNER_ORDER_REJECTION_REASONS = [
  { id: 'out-of-stock', label: 'بعض الأصناف غير متوفرة' },
  { id: 'busy', label: 'المتجر مزدحم جداً حالياً' },
  { id: 'closing-soon', label: 'المتجر سيغلق قريباً' },
  { id: 'technical-issue', label: 'مشكلة تقنية في استقبال الطلبات' },
  { id: 'other', label: 'سبب آخر' },
] satisfies DshPartnerOrderRejectionScreenProps['rejectionReasons'];

function getPartnerOrderRejectionState(state: Props['partnerOrdersState']): NonNullable<DshPartnerOrderRejectionScreenProps['state']> {
  if (state === 'loading') return 'loading';
  if (state === 'error' || state === 'offline') return 'error';
  return 'ready';
}

function getPartnerOrderRejectionItems(
  order: PartnerOrderItem | undefined,
  activeOrderId: string,
  initialOrderId: string,
): DshPartnerOrderRejectionScreenProps['items'] {
  return [{
    id: order?.id ?? (activeOrderId || initialOrderId),
    name: order?.itemsSummaryLabel ?? order?.itemsCountLabel ?? 'تفاصيل الطلب',
    quantity: 1,
  }];
}

export function DshPartnerRouteRenderer(props: Props): React.ReactElement {
  const {
    route, initialOrderId, activeOrderId, ordersSearchMode, accountHubSection,
    editingProductId, selectedSupportScreen, supportCommandContext,
    partnerOrdersState, partnerOrders, runtimePartnerProfile, selectedStoreScope,
    deliveryOpsSummary, dshClientId,
    renderMainShell, renderSurfaceShell,
    setRoute, setActiveOrderId, setOrdersSearchMode, openOrdersBoard, openOrdersSearch, openAccountHub,
    goBackToHub, openSupportDirectory, returnToSupportDirectory, openSupportScreen,
    openInventoryManagement, openStoreCourier, openSupportCommandFromOperationalFlow,
    handleMarkReady, setEditingProductId,
    selectedStoreScopeId, openStoreScope, refreshOrders,
    teamMembers, isTeamLoading, teamError, onInviteMember, onMemberAction,
    scopes,
  } = props;

  // 'all' means no single store is selected (multi-store scope). Represent that
  // as `undefined` rather than an empty-string store id, matching the optional
  // `canonicalStoreId?: string` contract used elsewhere in app-partner.
  const activeStoreRuntimeId: string | undefined = selectedStoreScopeId === 'all' ? undefined : selectedStoreScopeId;
  // Store-scoped screens (product/category/courier editing) require a concrete
  // store id; they are only reachable when a specific store is selected, but
  // fall back to '' defensively rather than silently reusing the 'all' sentinel.
  const activeStoreIdForStoreScopedScreens = activeStoreRuntimeId ?? '';
  const activePartnerOrder = React.useMemo(
    () => partnerOrders.find(order => order.id === activeOrderId) ?? partnerOrders[0],
    [activeOrderId, partnerOrders],
  );

  // Validate binding contract for the current route in development
  assertRouteHasBindingContract(route);

  if (route === 'home') {
    // storeOpen/listingEnabled intentionally omitted below: no real store-status
    // data is available at this call site (selectedStoreScope only carries
    // scopeId/storeId/displayName/role/permissions). DshPartnerHubSurface
    // defaults both to `true` internally and derives live values itself from
    // its own state/fetches. Follow-up: plumb real store open/listing status
    // into DshPartnerSurfaceState so it can be passed here explicitly instead
    // of relying on the surface's internal default.
    return renderSurfaceShell(
      <DshPartnerHubSurface
        section={accountHubSection} onSectionChange={props.setAccountHubSection}
        storeName={runtimePartnerProfile.storeName} branchLabel={selectedStoreScope.displayName}
        cityLabel={runtimePartnerProfile.cityLabel} managerLabel={runtimePartnerProfile.managerLabel}
        todayHoursLabel={runtimePartnerProfile.todayHoursLabel} activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
        activeOrdersCount={deliveryOpsSummary.outForDelivery + deliveryOpsSummary.handoffReady}
        urgentOrdersCount={deliveryOpsSummary.delayedRisk} pendingActionsCount={deliveryOpsSummary.handoffReady}
        onOpenOrdersBoard={openOrdersBoard} onOpenOrdersSearch={openOrdersSearch}
        onOpenInventoryManagement={openInventoryManagement} onOpenStoreScope={openStoreScope}
        onOpenSupportDirectory={() => openSupportDirectory({ source: 'hub' })} onOpenWalletHub={() => openAccountHub('wallet')}
        onOpenBell={() => { setActiveOrderId(initialOrderId); setRoute('bell'); }}
        onOpenOperationalFlow={(flowId) => openSupportCommandFromOperationalFlow(flowId, 'hub')}
        onOpenSupportScreen={(screenId) => openSupportScreen(screenId, 'hub')}
        onOpenStoreCourierSetup={openStoreCourier}
        {...(activeStoreRuntimeId !== undefined ? { canonicalStoreId: activeStoreRuntimeId } : {})}
        dshClientId={dshClientId ?? null}
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
        onRetry={refreshOrders}
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
      <ProductEditScreen storeId={activeStoreIdForStoreScopedScreens} productId={editingProductId ?? ''}
        onBack={() => setRoute('inventory-management')}
        onSaved={() => { setEditingProductId(undefined); setRoute('inventory-management'); }}
      />,
    ) as React.ReactElement;
  }

  if (route === 'category-management') return renderSurfaceShell(<CategoryManagementScreen storeId={activeStoreIdForStoreScopedScreens} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'product-media') return renderSurfaceShell(<ProductMediaScreen productId={editingProductId ?? ''} storeId={activeStoreIdForStoreScopedScreens} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'product-overrides') return renderSurfaceShell(<ProductOverridesScreen storeId={activeStoreIdForStoreScopedScreens} productId={editingProductId ?? ''} onBack={() => setRoute('inventory-management')} />) as React.ReactElement;
  if (route === 'store-courier') return renderSurfaceShell(<DshPartnerStoreCourierScreen storeId={activeStoreIdForStoreScopedScreens} scopes={scopes} onBack={() => openAccountHub('operations')} />) as React.ReactElement;
  if (route === 'team') return renderSurfaceShell(
    <PartnerTeamManagementScreen
      storeName={runtimePartnerProfile.storeName}
      branchLabel={runtimePartnerProfile.branchLabel}
      members={teamMembers}
      isLoading={isTeamLoading ?? false}
      error={teamError ?? null}
      onInviteMember={onInviteMember}
      onMemberAction={onMemberAction}
    />
  ) as React.ReactElement;

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
      <DshPartnerOrderRejectionScreen
        state={getPartnerOrderRejectionState(partnerOrdersState)}
        orderCode={activePartnerOrder?.orderCode ?? `#${activeOrderId || initialOrderId}`}
        amount={activePartnerOrder?.amountLabel ?? '—'}
        items={getPartnerOrderRejectionItems(activePartnerOrder, activeOrderId, initialOrderId)}
        rejectionReasons={PARTNER_ORDER_REJECTION_REASONS}
        onAccept={() => openSupportCommandFromOperationalFlow('order-accept', 'orders')}
        onReject={() => openSupportCommandFromOperationalFlow('order-reject', 'orders')}
        onBack={openOrdersBoard}
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
      storeName={runtimePartnerProfile.storeName} branchLabel={selectedStoreScope.displayName}
      cityLabel={runtimePartnerProfile.cityLabel} managerLabel={runtimePartnerProfile.managerLabel}
      todayHoursLabel={runtimePartnerProfile.todayHoursLabel} activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
      onOpenOrdersBoard={openOrdersBoard} onOpenInventoryManagement={openInventoryManagement}
      onOpenStoreScope={openStoreScope} onOpenWalletHub={() => openAccountHub('wallet')}
      onOpenSupportDirectory={() => openSupportDirectory({ source: 'hub' })}
      onOpenOperationalFlow={(flowId) => openSupportCommandFromOperationalFlow(flowId, 'hub')}
      onOpenSupportScreen={(screenId) => openSupportScreen(screenId, 'hub')}
      onOpenStoreCourierSetup={openStoreCourier}
    />,
  ) as React.ReactElement;
}
