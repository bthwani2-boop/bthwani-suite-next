import React from "react";
import { StateView } from "@bthwani/ui-kit";
import type {
  DshPartnerOperationalFlowId,
  DshPartnerAppearanceState,
  DshPartnerSupportCommandContext,
  DshPartnerSupportRouteId,
  PartnerHubSection,
} from "./dsh-partner.types";
import type { DshPartnerOperationalScope } from "../shared/partner/partner.types";
import { defaultSupportCommandContext } from "../shared/support/support.partner-context";
import { isCommandCenterInlineManagedRoute } from "../shared/support/support.partner-policies";
import { DshPartnerHubSurface } from "./account/PartnerHubScreen";
import { ConversationScreen } from "./orders/PartnerConversationScreen";
import { InventoryActionScreen } from "./catalog/InventoryActionScreen";
import { NotificationsScreen } from "./account/NotificationsScreen";
import { OrderActionScreen } from "./orders/OrderActionScreen";
import { OrderIssueScreen } from "./orders/OrderIssueScreen";
import { DshPartnerStoreCourierScreen } from "./store/DshPartnerStoreCourierScreen";
import { PartnerTeamManagementScreen } from "./team/PartnerTeamManagementScreen";
import { PartnerEntryScreen } from "./account/PartnerEntryScreen";
import { PartnerSupportScreen } from "./account/PartnerSupportScreen";
import { PartnerCommercialSummaryScreen } from "./account/PartnerCommercialSummaryScreen";
import { PartnerCatalogManagementScreen } from "./catalog/PartnerCatalogManagementScreen";
import { ProductEditScreen } from "./catalog/ProductEditScreen";
import { CategoryManagementScreen } from "./catalog/CategoryManagementScreen";
import { ProductMediaScreen } from "./catalog/ProductMediaScreen";
import { ProductControlsScreen } from "./catalog/ProductControlsScreen";
import { hasDshPartnerBindingContract } from "./dsh-partner-binding.contracts";
import {
  buildDshPartnerSupportDirectoryRoute,
  buildDshPartnerSupportDirectoryRouteFromFlow,
  buildDshPartnerSupportScreenRoute,
  type DshPartnerNavigation,
  type DshPartnerNavigationRoute,
} from "./partner-navigation";
import type {
  PartnerOrderItem,
  DshPartnerOrderAlertItem,
  DshPartnerOrderAlertId,
} from "../shared/orders/orders.contract";
import type { GovernedPartnerOrderItem } from "../shared/partner/partner.adapters";

type PartnerSupportSource = NonNullable<DshPartnerSupportCommandContext["source"]>;

export type DshPartnerRouteRendererProps = {
  readonly route: DshPartnerNavigationRoute;
  readonly navigation: DshPartnerNavigation;
  readonly appearance: DshPartnerAppearanceState;
  readonly partnerOrdersState:
    | "ready"
    | "loading"
    | "empty"
    | "error"
    | "offline"
    | "disabled"
    | "partial";
  readonly partnerOrders: readonly GovernedPartnerOrderItem[];
  readonly runtimePartnerProfile: {
    readonly storeName: string;
    readonly branchLabel: string;
    readonly cityLabel: string;
    readonly managerLabel: string;
    readonly todayHoursLabel: string;
    readonly activeZoneLabel: string;
  };
  readonly selectedStoreScope: DshPartnerOperationalScope;
  readonly deliveryOpsSummary: {
    readonly outForDelivery: number;
    readonly handoffReady: number;
    readonly deliveredToday: number;
    readonly delayedRisk: number;
  };
  readonly dshClientId?: string;
  readonly renderMainShell: (content: React.ReactNode) => React.ReactElement;
  readonly renderSurfaceShell: (content: React.ReactNode) => React.ReactElement;
  readonly openStoreScope: () => void;
  readonly refreshOrders: () => void | Promise<void>;
  readonly teamMembers: readonly import("./team/partner-team.types").PartnerTeamMember[];
  readonly isTeamLoading: boolean;
  readonly teamError: string | null;
  readonly onInviteMember: (identity: string) => Promise<import("./team/usePartnerTeamModel").PartnerTeamMutationResult>;
  readonly onMemberAction: (memberId: string, action: string) => Promise<import("./team/usePartnerTeamModel").PartnerTeamMutationResult>;
  readonly scopes: readonly DshPartnerOperationalScope[];
};

const STORE_SCOPED_ROUTES = new Set<DshPartnerNavigationRoute["kind"]>([
  "inventory-management",
  "product-edit",
  "category-management",
  "product-media",
  "product-controls",
  "store-courier",
  "team",
]);

const ORDER_BOUND_SUPPORT_ROUTES = new Set<DshPartnerSupportRouteId>([
  "order-handoff",
  "order-ready",
]);

function derivePartnerOrderAlerts(orders: readonly PartnerOrderItem[]): DshPartnerOrderAlertItem[] {
  const alerts: DshPartnerOrderAlertItem[] = [];
  orders.forEach((order) => {
    let alertId: DshPartnerOrderAlertId | undefined;
    let title = '';
    let description = '';
    let urgent = false;
    if (order.status === 'needs_accept') {
      alertId = 'order_needs_accept';
      title = 'طلب يحتاج قبولًا فوريًا';
      description = 'الطلب يحتاج قرار قبول سريع قبل بدء التجهيز.';
      urgent = !!order.urgent;
    } else if (order.issueRequired) {
      alertId = 'order_issue_required';
      title = 'طلب يحتاج معالجة مشكلة';
      description = 'الطلب يحتاج قرارًا واضحًا بشأن مشكلة تشغيلية.';
      urgent = true;
    } else if (order.slaRisk) {
      alertId = 'order_sla_risk';
      title = 'خطر تأخير التجهيز';
      description = 'الطلب متأخر أو قارب على تجاوز الوقت المحدد للتحضير.';
      urgent = true;
    } else if (order.status === 'ready' || order.status === 'items_ready') {
      alertId = 'order_ready';
      title = 'طلب جاهز للتسليم';
      description = 'الطلب أصبح جاهزًا ويحتاج نقلًا فوريًا إلى مسار التسليم.';
    } else if (order.status === 'handoff') {
      alertId = 'order_handoff_pending';
      title = 'تسليم للكابتن بانتظار الإغلاق';
      description = 'الطلب بانتظار تثبيت التسليم للكابتن.';
    }
    if (alertId) {
      alerts.push({
        id: `alert-${order.id}-${alertId}`,
        orderId: order.id,
        alertId,
        title,
        description,
        timeLabel: order.elapsedLabel,
        status: order.unread ? 'new' : 'seen',
        urgent,
      });
    }
  });
  return alerts;
}

export function DshPartnerRouteRenderer(props: DshPartnerRouteRendererProps): React.ReactElement {
  const {
    route,
    navigation,
    appearance,
    partnerOrdersState,
    partnerOrders,
    runtimePartnerProfile,
    selectedStoreScope,
    deliveryOpsSummary,
    dshClientId,
    renderMainShell,
    renderSurfaceShell,
    openStoreScope,
    refreshOrders,
    teamMembers,
    isTeamLoading,
    teamError,
    onInviteMember,
    onMemberAction,
    scopes,
  } = props;

  const scopedStoreId = selectedStoreScope.storeId;
  const productId = route.kind === "product-edit" || route.kind === "product-media" || route.kind === "product-controls"
    ? route.productId
    : undefined;
  const activeOrderId = "orderId" in route ? route.orderId : undefined;
  const supportCommandContext = route.kind === "support-directory" || route.kind === "support-screen"
    ? route.context
    : defaultSupportCommandContext;
  const selectedSupportScreen = route.kind === "support-screen"
    ? route.screenId
    : supportCommandContext.preferredSupportRouteId ?? "order-issue-queue";
  const activePartnerOrder = activeOrderId
    ? partnerOrders.find((order) => order.id === activeOrderId)
    : undefined;

  const openOrdersBoard = () => navigation.navigate({ kind: "inbox" });
  const openOrdersSearch = () => navigation.navigate({ kind: "inbox", search: true });
  const openAccountHub = (section: PartnerHubSection) => navigation.navigate({ kind: "home", section });
  const openSupportDirectory = (context?: Partial<DshPartnerSupportCommandContext>, orderId = activeOrderId) => {
    navigation.navigate(buildDshPartnerSupportDirectoryRoute(context, orderId));
  };
  const openSupportScreen = (
    screenId: DshPartnerSupportRouteId,
    source: PartnerSupportSource = supportCommandContext.source ?? "operations",
    orderId = activeOrderId,
  ) => navigation.navigate(buildDshPartnerSupportScreenRoute(screenId, source, orderId));
  const openSupportFlow = (
    flowId: DshPartnerOperationalFlowId,
    source: PartnerSupportSource = supportCommandContext.source ?? "operations",
    orderId = activeOrderId,
  ) => navigation.navigate(buildDshPartnerSupportDirectoryRouteFromFlow(flowId, source, orderId));
  const returnToSupportDirectory = () => {
    navigation.navigate({
      kind: "support-directory",
      context: supportCommandContext,
      ...(activeOrderId ? { orderId: activeOrderId } : {}),
    }, "replace");
  };

  if (!hasDshPartnerBindingContract(route.kind)) {
    return renderSurfaceShell(
      <StateView
        title="المسار غير مربوط"
        description={`لا يملك المسار ${route.kind} عقد ربط مسجلاً، ولذلك تم إيقافه بدلاً من عرضه جزئيًا.`}
        tone="danger"
        actionLabel="العودة إلى لوحة الشريك"
        onActionPress={() => navigation.navigate({ kind: "home", section: "hub" }, "replace")}
      />,
    );
  }

  if (STORE_SCOPED_ROUTES.has(route.kind) && !scopedStoreId) {
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

  if ((route.kind === "product-edit" || route.kind === "product-media" || route.kind === "product-controls") && !productId?.trim()) {
    return renderSurfaceShell(
      <StateView
        title="اختر منتجًا"
        description="هذه العملية تحتاج منتجًا مركزيًا محددًا من كتالوج المتجر."
        tone="warning"
        actionLabel="فتح إدارة الكتالوج"
        onActionPress={() => navigation.navigate({ kind: "inventory-management" }, "replace")}
      />,
    );
  }

  if (route.kind === "home") {
    return renderSurfaceShell(
      <DshPartnerHubSurface
        appearance={appearance}
        section={route.section}
        onSectionChange={(section) => navigation.navigate({ kind: "home", section }, "replace")}
        storeName={runtimePartnerProfile.storeName}
        branchLabel={selectedStoreScope.displayName}
        cityLabel={runtimePartnerProfile.cityLabel}
        managerLabel={runtimePartnerProfile.managerLabel}
        todayHoursLabel={runtimePartnerProfile.todayHoursLabel}
        activeZoneLabel={runtimePartnerProfile.activeZoneLabel}
        activeOrdersCount={deliveryOpsSummary.outForDelivery + deliveryOpsSummary.handoffReady}
        urgentOrdersCount={deliveryOpsSummary.delayedRisk}
        pendingActionsCount={deliveryOpsSummary.handoffReady}
        onOpenOrdersBoard={openOrdersBoard}
        onOpenOrdersSearch={openOrdersSearch}
        onOpenInventoryManagement={() => navigation.navigate({ kind: "inventory-management" })}
        onOpenStoreScope={openStoreScope}
        onOpenSupportDirectory={() => openSupportDirectory({ source: "hub" })}
        onOpenWalletHub={() => openAccountHub("wallet")}
        onOpenBell={() => navigation.navigate({ kind: "bell" })}
        onOpenStoreCourierSetup={() => navigation.navigate({ kind: "store-courier" })}
        onOpenTeamManagement={() => navigation.navigate({ kind: "team" })}
        onOpenCommercialModel={() => navigation.navigate({ kind: "commercial-model" })}
        canonicalStoreId={scopedStoreId}
        dshClientId={dshClientId ?? null}
      />,
    );
  }

  if (route.kind === "entry") {
    return renderSurfaceShell(
      <PartnerEntryScreen
        state={partnerOrdersState}
        onOpenOrdersBoardPress={openOrdersBoard}
        onOpenOrderDetailPress={openOrdersBoard}
        onOpenMaintenancePress={() => openAccountHub("profile")}
        onOpenIssueQueuePress={() => openSupportFlow("order-issue-queue", "orders")}
      />,
    );
  }

  if (route.kind === "bell") {
    return renderSurfaceShell(
      <NotificationsScreen
        {...(route.orderId ? { activeOrderId: route.orderId } : {})}
        alerts={derivePartnerOrderAlerts(partnerOrders)}
        onOpenInbox={openOrdersBoard}
        onOpenOrderSupport={(orderId) => openSupportFlow("order-alerts", "bell", orderId)}
        onOpenAlertsSupport={(flowId) => openSupportFlow(flowId, "bell", route.orderId)}
        onBack={navigation.back}
        onRetry={() => void refreshOrders()}
      />,
    );
  }

  if (route.kind === "inventory-management") {
    return renderSurfaceShell(<PartnerCatalogManagementScreen storeId={scopedStoreId} />);
  }

  if (route.kind === "product-edit") {
    return renderSurfaceShell(
      <ProductEditScreen
        storeId={scopedStoreId}
        productId={route.productId}
        onBack={navigation.back}
        onSaved={() => navigation.navigate({ kind: "inventory-management" }, "replace")}
      />,
    );
  }

  if (route.kind === "category-management") {
    return renderSurfaceShell(
      <CategoryManagementScreen storeId={scopedStoreId} onBack={navigation.back} />,
    );
  }

  if (route.kind === "product-media") {
    return renderSurfaceShell(
      <ProductMediaScreen productId={route.productId} storeId={scopedStoreId} onBack={navigation.back} />,
    );
  }

  if (route.kind === "product-controls") {
    return renderSurfaceShell(
      <ProductControlsScreen storeId={scopedStoreId} productId={route.productId} onBack={navigation.back} />,
    );
  }

  if (route.kind === "store-courier") {
    return renderSurfaceShell(
      <DshPartnerStoreCourierScreen
        storeId={scopedStoreId}
        scopes={scopes}
        onBack={() => openAccountHub("operations")}
      />,
    );
  }

  if (route.kind === "team") {
    return renderSurfaceShell(
      <PartnerTeamManagementScreen
        storeId={scopedStoreId}
        storeName={runtimePartnerProfile.storeName}
        branchLabel={runtimePartnerProfile.branchLabel}
        members={teamMembers}
        isLoading={isTeamLoading}
        error={teamError}
        onInviteMember={onInviteMember}
        onMemberAction={onMemberAction}
      />,
    );
  }

  if (route.kind === "commercial-model") {
    return renderSurfaceShell(
      <PartnerCommercialSummaryScreen storeId={scopedStoreId || null} onBack={() => openAccountHub("operations")} />,
    );
  }

  if (route.kind === "support-directory") {
    return renderSurfaceShell(
      <PartnerSupportScreen
        onBack={navigation.back}
        onOpenScreen={(screenId) => {
          const next = buildDshPartnerSupportScreenRoute(
            screenId,
            route.context.source ?? "operations",
            route.orderId,
          );
          if (isCommandCenterInlineManagedRoute(screenId)) {
            navigation.navigate({
              kind: "support-directory",
              context: next.context,
              ...(route.orderId ? { orderId: route.orderId } : {}),
            }, "replace");
          } else {
            navigation.navigate(next);
          }
        }}
        initialFilterId={route.context.filterId}
        initialCaseId={route.context.highlightedCaseId ?? null}
        initialIssueCategoryId={route.context.highlightedIssueCategoryId ?? null}
        initialSupportRouteId={route.context.preferredSupportRouteId ?? null}
      />,
    );
  }

  if (route.kind === "support-screen") {
    if (ORDER_BOUND_SUPPORT_ROUTES.has(route.screenId) && !route.orderId) {
      return renderSurfaceShell(
        <StateView
          title="حدد الطلب أولًا"
          description="هذه العملية تحتاج معرّف طلب صريحًا في Route ولا يجوز تخمين الطلب من القائمة."
          tone="warning"
          actionLabel="العودة إلى الطلبات"
          onActionPress={() => navigation.navigate({ kind: "inbox" }, "replace")}
        />,
      );
    }

    const categoryId = route.context.highlightedIssueCategoryId ?? "partner-reject-request";
    const screens: Record<DshPartnerSupportRouteId, React.ReactNode> = {
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
          orderId={route.orderId ?? ""}
          {...(activePartnerOrder?.orderMode ? { fulfillmentMode: activePartnerOrder.orderMode } : {})}
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
          orderId={route.orderId ?? ""}
          {...(activePartnerOrder?.orderMode ? { fulfillmentMode: activePartnerOrder.orderMode } : {})}
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
    };
    return renderSurfaceShell(screens[selectedSupportScreen]);
  }

  return renderSurfaceShell(
    <StateView
      title="مسار شريك غير معروف"
      description={`لم يُعرّف renderer صالح للمسار ${route.kind}.`}
      tone="danger"
      actionLabel="العودة إلى لوحة الشريك"
      onActionPress={() => navigation.navigate({ kind: "home", section: "hub" }, "replace")}
    />,
  );
}
