import React from "react";
import { StateView } from "@bthwani/ui-kit";
import type {
  DshPartnerOperationalFlowId,
  DshPartnerRoute,
  DshPartnerSupportCommandContext,
  DshPartnerSupportRouteId,
  PartnerHubSection,
} from "./dsh-partner.types";
import type { DshPartnerOperationalScope } from "../shared/partner/partner.types";
import { DshPartnerHubSurface } from "./account/PartnerHubScreen";
import { AuctionStatusUpdateScreen } from "./account/AuctionStatusUpdateScreen";
import { ConversationScreen } from "./orders/PartnerConversationScreen";
import { InventoryActionScreen } from "./catalog/InventoryActionScreen";
import { NotificationsScreen } from "./account/NotificationsScreen";
import { OnboardingActionScreen } from "./account/OnboardingActionScreen";
import { OrderActionScreen } from "./orders/OrderActionScreen";
import { OrderIssueScreen } from "./orders/OrderIssueScreen";
import { VideoUploadScreen } from "./account/VideoUploadScreen";
import { OrdersInboxScreen } from "./orders/OrdersInboxScreen";
import {
  DshPartnerOrderRejectionScreen,
  type DshPartnerOrderRejectionScreenProps,
} from "./orders/DshPartnerOrderRejectionScreen";
import { DshPartnerStoreCourierScreen } from "./store/DshPartnerStoreCourierScreen";
import { PartnerTeamManagementScreen } from "./team/PartnerTeamManagementScreen";
import { PartnerEntryScreen } from "./account/PartnerEntryScreen";
import { PartnerSupportScreen } from "./account/PartnerSupportScreen";
import { PartnerCatalogManagementScreen } from "./catalog/PartnerCatalogManagementScreen";
import { ProductEditScreen } from "./catalog/ProductEditScreen";
import { CategoryManagementScreen } from "./catalog/CategoryManagementScreen";
import { ProductMediaScreen } from "./catalog/ProductMediaScreen";
import { ProductOverridesScreen } from "./catalog/ProductOverridesScreen";
import { DSH_PARTNER_BINDING_CONTRACTS } from "./dsh-partner-binding.contracts";
import type { PartnerOrderItem } from "../shared/orders/orders.contract";

function hasRouteBindingContract(route: DshPartnerRoute): boolean {
  return DSH_PARTNER_BINDING_CONTRACTS.some(
    (contract) => contract.surfaceId === route,
  );
}

type Props = {
  route: DshPartnerRoute;
  initialOrderId: string;
  activeOrderId: string;
  ordersSearchMode: boolean;
  accountHubSection: PartnerHubSection;
  editingProductId: string | undefined;
  selectedSupportScreen: DshPartnerSupportRouteId;
  supportCommandContext: DshPartnerSupportCommandContext;
  partnerOrdersState:
    | "ready"
    | "loading"
    | "empty"
    | "error"
    | "offline"
    | "disabled"
    | "partial";
  partnerOrders: readonly PartnerOrderItem[];
  runtimePartnerProfile: {
    storeName: string;
    branchLabel: string;
    cityLabel: string;
    managerLabel: string;
    todayHoursLabel: string;
    activeZoneLabel: string;
  };
  selectedStoreScope: DshPartnerOperationalScope;
  selectedStoreScopeId: string;
  deliveryOpsSummary: {
    outForDelivery: number;
    handoffReady: number;
    deliveredToday: number;
    delayedRisk: number;
  };
  dshClientId: string | undefined;
  renderMainShell: (content: React.ReactNode) => React.ReactElement;
  renderSurfaceShell: (content: React.ReactNode) => React.ReactElement;
  setRoute: (route: DshPartnerRoute) => void;
  setActiveOrderId: (id: string) => void;
  setOrdersSearchMode: (value: boolean) => void;
  setAccountHubSection: (section: PartnerHubSection) => void;
  setEditingProductId: (id: string | undefined) => void;
  setSupportState: (next: {
    screenId: DshPartnerSupportRouteId;
    commandContext: DshPartnerSupportCommandContext;
  }) => void;
  openOrdersBoard: () => void;
  openOrdersSearch: () => void;
  openAccountHub: (section: PartnerHubSection) => void;
  goBackToHub: () => void;
  openSupportDirectory: (
    context?: Partial<DshPartnerSupportCommandContext>,
  ) => void;
  returnToSupportDirectory: () => void;
  openSupportScreen: (
    screenId: DshPartnerSupportRouteId,
    source?: DshPartnerSupportCommandContext["source"],
  ) => void;
  openInventoryManagement: () => void;
  openStoreCourier: () => void;
  openStoreScope: () => void;
  openSupportCommandFromOperationalFlow: (
    flowId: DshPartnerOperationalFlowId,
    source?: DshPartnerSupportCommandContext["source"],
  ) => void;
  handleMarkReady: (orderId: string) => void;
  refreshOrders: () => void;
  teamMembers: readonly import("./team/partner-team.types").PartnerTeamMember[];
  isTeamLoading?: boolean;
  teamError?: string | null;
  onInviteMember: (
    identity: string,
  ) => Promise<import("./team/usePartnerTeamModel").PartnerTeamMutationResult>;
  onMemberAction: (
    memberId: string,
    action: string,
  ) => Promise<import("./team/usePartnerTeamModel").PartnerTeamMutationResult>;
  scopes: readonly import("../shared/partner/partner.types").DshPartnerOperationalScope[];
};

const PARTNER_ORDER_REJECTION_REASONS = [
  { id: "out-of-stock", label: "بعض الأصناف غير متوفرة" },
  { id: "busy", label: "المتجر مزدحم جداً حالياً" },
  { id: "closing-soon", label: "المتجر سيغلق قريباً" },
  { id: "technical-issue", label: "مشكلة تقنية في استقبال الطلبات" },
  { id: "other", label: "سبب آخر" },
] satisfies DshPartnerOrderRejectionScreenProps["rejectionReasons"];

const STORE_SCOPED_ROUTES = new Set<DshPartnerRoute>([
  "inventory-management",
  "product-edit",
  "category-management",
  "product-media",
  "product-overrides",
  "store-courier",
  "team",
]);

const PRODUCT_SCOPED_ROUTES = new Set<DshPartnerRoute>([
  "product-edit",
  "product-media",
  "product-overrides",
]);

function getPartnerOrderRejectionState(
  state: Props["partnerOrdersState"],
): NonNullable<DshPartnerOrderRejectionScreenProps["state"]> {
  if (state === "loading") return "loading";
  if (state === "error" || state === "offline") return "error";
  return "ready";
}

function getPartnerOrderRejectionItems(
  order: PartnerOrderItem | undefined,
  activeOrderId: string,
  initialOrderId: string,
): DshPartnerOrderRejectionScreenProps["items"] {
  return [
    {
      id: order?.id ?? (activeOrderId || initialOrderId),
      name:
        order?.itemsSummaryLabel ??
        order?.itemsCountLabel ??
        "تفاصيل الطلب",
      quantity: 1,
    },
  ];
}

export function DshPartnerRouteRenderer(props: Props): React.ReactElement {
  const {
    route,
    initialOrderId,
    activeOrderId,
    ordersSearchMode,
    accountHubSection,
    editingProductId,
    selectedSupportScreen,
    supportCommandContext,
    partnerOrdersState,
    partnerOrders,
    runtimePartnerProfile,
    selectedStoreScope,
    deliveryOpsSummary,
    dshClientId,
    renderMainShell,
    renderSurfaceShell,
    setRoute,
    setActiveOrderId,
    setOrdersSearchMode,
    openOrdersBoard,
    openOrdersSearch,
    openAccountHub,
    goBackToHub,
    openSupportDirectory,
    returnToSupportDirectory,
    openSupportScreen,
    openInventoryManagement,
    openStoreCourier,
    openSupportCommandFromOperationalFlow,
    handleMarkReady,
    setEditingProductId,
    selectedStoreScopeId,
    openStoreScope,
    refreshOrders,
    teamMembers,
    isTeamLoading,
    teamError,
    onInviteMember,
    onMemberAction,
    scopes,
  } = props;

  const activeStoreRuntimeId =
    selectedStoreScopeId === "all" ? undefined : selectedStoreScopeId;
  const activePartnerOrder = React.useMemo(
    () =>
      partnerOrders.find((order) => order.id === activeOrderId) ??
      partnerOrders[0],
    [activeOrderId, partnerOrders],
  );

  if (!hasRouteBindingContract(route)) {
    return renderSurfaceShell(
      <StateView
        title="المسار غير مربوط"
        description={`لا يملك المسار ${route} عقد ربط مسجلاً، ولذلك تم إيقافه بدلاً من عرضه جزئيًا.`}
        tone="danger"
        actionLabel="العودة إلى لوحة الشريك"
        onActionPress={goBackToHub}
      />,
    );
  }

  if (STORE_SCOPED_ROUTES.has(route) && !activeStoreRuntimeId) {
    return renderSurfaceShell(
      <StateView
        title="اختر متجرًا محددًا"
        description="هذه العملية لا تقبل نطاق كل المتاجر. اختر متجرًا يملكه حساب الشريك أولًا."
        tone="warning"
        actionLabel="اختيار المتجر"
        onActionPress={openStoreScope}
      />,
    );
  }

  if (PRODUCT_SCOPED_ROUTES.has(route) && !editingProductId) {
    return renderSurfaceShell(
      <StateView
        title="اختر منتجًا"
        description="هذه العملية تحتاج منتجًا مركزيًا محددًا من كتالوج المتجر."
        tone="warning"
        actionLabel="فتح إدارة الكتالوج"
        onActionPress={() => setRoute("inventory-management")}
      />,
    );
  }

  if (route === "home") {
    return renderSurfaceShell(
      <DshPartnerHubSurface
        section={accountHubSection}
        onSectionChange={props.setAccountHubSection}
        storeName={runtimePartnerProfile.storeName}
        branchLabel={selectedStoreScope.displayName}
        cityLabel={runtimePartnerProfile.cityLabel}
        managerLabel={runtimePartnerProfile.managerLabel}
        todayHoursLabel={runtimePartnerProfile.todayHoursLabel}
        activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
        storeOpen={false}
        listingEnabled={false}
        activeOrdersCount={
          deliveryOpsSummary.outForDelivery + deliveryOpsSummary.handoffReady
        }
        urgentOrdersCount={deliveryOpsSummary.delayedRisk}
        pendingActionsCount={deliveryOpsSummary.handoffReady}
        onOpenOrdersBoard={openOrdersBoard}
        onOpenOrdersSearch={openOrdersSearch}
        onOpenInventoryManagement={openInventoryManagement}
        onOpenStoreScope={openStoreScope}
        onOpenSupportDirectory={() =>
          openSupportDirectory({ source: "hub" })
        }
        onOpenWalletHub={() => openAccountHub("wallet")}
        onOpenBell={() => {
          setActiveOrderId(initialOrderId);
          setRoute("bell");
        }}
        onOpenOperationalFlow={(flowId) =>
          openSupportCommandFromOperationalFlow(flowId, "hub")
        }
        onOpenSupportScreen={(screenId) =>
          openSupportScreen(screenId, "hub")
        }
        onOpenStoreCourierSetup={openStoreCourier}
        {...(activeStoreRuntimeId
          ? { canonicalStoreId: activeStoreRuntimeId }
          : {})}
        dshClientId={dshClientId ?? null}
      />,
    );
  }

  if (route === "entry") {
    const entryState =
      partnerOrdersState === "loading"
        ? "loading"
        : partnerOrdersState === "offline"
          ? "offline"
          : partnerOrdersState === "error"
            ? "error"
            : "ready";
    return renderSurfaceShell(
      <PartnerEntryScreen
        state={entryState}
        onOpenOrdersBoardPress={openOrdersBoard}
        onOpenOrderDetailPress={openOrdersBoard}
        onOpenMaintenancePress={() => openAccountHub("profile")}
        onOpenIssueQueuePress={() =>
          openSupportCommandFromOperationalFlow("order-issue-queue", "orders")
        }
      />,
    );
  }

  if (route === "bell") {
    return renderSurfaceShell(
      <NotificationsScreen
        {...(activeOrderId && activeOrderId !== initialOrderId
          ? { activeOrderId }
          : {})}
        onOpenInbox={openOrdersBoard}
        onOpenOrderSupport={(orderId) => {
          setActiveOrderId(orderId);
          openSupportCommandFromOperationalFlow("order-alerts", "bell");
        }}
        onOpenAlertsSupport={(flowId) =>
          openSupportCommandFromOperationalFlow(flowId, "bell")
        }
        onBack={openOrdersBoard}
        onRetry={() => setRoute("bell")}
      />,
    );
  }

  if (route === "inbox") {
    return renderMainShell(
      <OrdersInboxScreen
        state={partnerOrdersState}
        items={partnerOrders}
        searchMode={ordersSearchMode}
        onCloseSearch={() => setOrdersSearchMode(false)}
        onMarkReady={handleMarkReady}
        onRetry={refreshOrders}
      />,
    );
  }

  if (route === "inventory-management") {
    return renderSurfaceShell(
      <PartnerCatalogManagementScreen storeId={activeStoreRuntimeId} />,
    );
  }

  if (route === "product-edit") {
    return renderSurfaceShell(
      <ProductEditScreen
        storeId={activeStoreRuntimeId}
        productId={editingProductId}
        onBack={() => setRoute("inventory-management")}
        onSaved={() => {
          setEditingProductId(undefined);
          setRoute("inventory-management");
        }}
      />,
    );
  }

  if (route === "category-management") {
    return renderSurfaceShell(
      <CategoryManagementScreen
        storeId={activeStoreRuntimeId}
        onBack={() => setRoute("inventory-management")}
      />,
    );
  }

  if (route === "product-media") {
    return renderSurfaceShell(
      <ProductMediaScreen
        productId={editingProductId}
        storeId={activeStoreRuntimeId}
        onBack={() => setRoute("inventory-management")}
      />,
    );
  }

  if (route === "product-overrides") {
    return renderSurfaceShell(
      <ProductOverridesScreen
        storeId={activeStoreRuntimeId}
        productId={editingProductId}
        onBack={() => setRoute("inventory-management")}
      />,
    );
  }

  if (route === "store-courier") {
    return renderSurfaceShell(
      <DshPartnerStoreCourierScreen
        storeId={activeStoreRuntimeId}
        scopes={scopes}
        onBack={() => openAccountHub("operations")}
      />,
    );
  }

  if (route === "team") {
    return renderSurfaceShell(
      <PartnerTeamManagementScreen
        storeId={activeStoreRuntimeId}
        storeName={runtimePartnerProfile.storeName}
        branchLabel={runtimePartnerProfile.branchLabel}
        members={teamMembers}
        isLoading={isTeamLoading ?? false}
        error={teamError ?? null}
        onInviteMember={onInviteMember}
        onMemberAction={onMemberAction}
      />,
    );
  }

  if (route === "support-directory") {
    return renderSurfaceShell(
      <PartnerSupportScreen
        onBack={goBackToHub}
        onOpenScreen={openSupportScreen}
        initialFilterId={supportCommandContext.filterId}
        initialCaseId={supportCommandContext.highlightedCaseId ?? null}
        initialIssueCategoryId={
          supportCommandContext.highlightedIssueCategoryId ?? null
        }
        initialSupportRouteId={
          supportCommandContext.preferredSupportRouteId ?? null
        }
      />,
    );
  }

  if (route === "order-rejection") {
    return renderSurfaceShell(
      <DshPartnerOrderRejectionScreen
        state={getPartnerOrderRejectionState(partnerOrdersState)}
        orderCode={
          activePartnerOrder?.orderCode ?? `#${activeOrderId || initialOrderId}`
        }
        amount={activePartnerOrder?.amountLabel ?? "—"}
        items={getPartnerOrderRejectionItems(
          activePartnerOrder,
          activeOrderId,
          initialOrderId,
        )}
        rejectionReasons={PARTNER_ORDER_REJECTION_REASONS}
        onAccept={() =>
          openSupportCommandFromOperationalFlow("order-accept", "orders")
        }
        onReject={() =>
          openSupportCommandFromOperationalFlow("order-reject", "orders")
        }
        onBack={openOrdersBoard}
      />,
    );
  }

  if (route === "support-screen") {
    const categoryId =
      supportCommandContext.highlightedIssueCategoryId ??
      "partner-reject-request";
    const screens: Record<DshPartnerSupportRouteId, React.ReactNode> = {
      "auction-status-update": (
        <AuctionStatusUpdateScreen
          onBack={returnToSupportDirectory}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "chat-read-ack": (
        <ConversationScreen
          activeFlowId="chat-read-ack"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("quick-reply-config")}
        />
      ),
      "chat-send": (
        <ConversationScreen
          activeFlowId="chat-send"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("quick-reply-setup")}
        />
      ),
      "doc-upload": (
        <OnboardingActionScreen
          activeFlowId="doc-upload"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "intake-start": (
        <OnboardingActionScreen
          activeFlowId="intake-start"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "inventory-adjust": (
        <InventoryActionScreen
          activeFlowId="inventory-adjust"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("inventory-update")}
        />
      ),
      "inventory-update": (
        <InventoryActionScreen
          activeFlowId="inventory-update"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "items-upsert": (
        <InventoryActionScreen
          activeFlowId="items-upsert"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-accept": (
        <OrderActionScreen
          activeFlowId="order-accept"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("order-get")}
        />
      ),
      "order-get": (
        <OrderActionScreen
          activeFlowId="order-get"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("order-handoff")}
        />
      ),
      "order-handoff": (
        <OrderActionScreen
          activeFlowId="order-handoff"
          orderId={activePartnerOrder?.id ?? activeOrderId}
          {...(activePartnerOrder?.orderMode
            ? { fulfillmentMode: activePartnerOrder.orderMode }
            : {})}
          teamMembers={teamMembers}
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-issue-queue": (
        <OrderIssueScreen
          activeFlowId="order-issue-queue"
          selectedCategoryId={categoryId}
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-out-for-delivery": (
        <OrderActionScreen
          activeFlowId="order-out-for-delivery"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-prepare": (
        <OrderActionScreen
          activeFlowId="order-prepare"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-ready": (
        <OrderActionScreen
          activeFlowId="order-ready"
          orderId={activePartnerOrder?.id ?? activeOrderId}
          {...(activePartnerOrder?.orderMode
            ? { fulfillmentMode: activePartnerOrder.orderMode }
            : {})}
          teamMembers={teamMembers}
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-reject": (
        <OrderIssueScreen
          activeFlowId="order-reject"
          selectedCategoryId={categoryId}
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "order-store-delivered": (
        <OrderActionScreen
          activeFlowId="order-store-delivered"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "quick-reply-config": (
        <ConversationScreen
          activeFlowId="quick-reply-config"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("quick-reply-settings")}
        />
      ),
      "quick-reply-settings": (
        <ConversationScreen
          activeFlowId="quick-reply-settings"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={() => openSupportScreen("quick-reply-setup")}
        />
      ),
      "quick-reply-setup": (
        <ConversationScreen
          activeFlowId="quick-reply-setup"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "store-nomination": (
        <OnboardingActionScreen
          activeFlowId="store-nomination"
          onBack={returnToSupportDirectory}
          onOpenScreen={openSupportScreen}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
      "video-upload": (
        <VideoUploadScreen
          onBack={returnToSupportDirectory}
          onSecondaryAction={returnToSupportDirectory}
        />
      ),
    };
    return renderSurfaceShell(screens[selectedSupportScreen]);
  }

  return renderSurfaceShell(
    <StateView
      title="مسار شريك غير معروف"
      description={`لم يُعرّف renderer صالح للمسار ${route}.`}
      tone="danger"
      actionLabel="العودة إلى لوحة الشريك"
      onActionPress={goBackToHub}
    />,
  );
}
