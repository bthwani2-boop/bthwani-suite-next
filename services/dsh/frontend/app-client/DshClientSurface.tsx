import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "./shell/AppHeader";
import { BottomNavBar, type BottomNavItem } from "./shell/BottomNavBar";
import { useDshClientPlatform } from "./client-platform-context";
import { LoadingState, brandScale, colorRoles, Icon, StateView } from "@bthwani/ui-kit";
import { HomeDiscoveryRoute } from "./home-discovery/HomeDiscoveryRoute";
import { StoreDiscoveryRoute } from "./store/StoreDiscoveryRoute";
import { StoreDetailRoute } from "./store/StoreDetailRoute";
import { ClientCheckoutRoute } from "./checkout/ClientCheckoutRoute";
import { OrdersListScreen } from "./orders/OrdersListScreen";
import { WltClientWalletPanel } from "./finance/WltClientWalletPanel";
import { MySpaceScreen } from "./account/MySpaceScreen";
import { MyProfileScreen } from "./account/MyProfileScreen";
import { AddressLocationScreen } from "./account/AddressLocationScreen";
import { IdentityHubScreen } from "./account/IdentityHubScreen";
import { BenefitsHubScreen } from "./account/BenefitsHubScreen";
import { PreferencesHubScreen } from "./account/PreferencesHubScreen";
import { NotificationCenterScreen } from "./notifications/NotificationCenterScreen";
import { OrderTrackingScreen } from "./orders/OrderTrackingScreen";
import { OrderChatScreen } from "./orders/OrderChatScreen";
import { PickupSessionScreen } from "./orders/PickupSessionScreen";
import { SupportTicketScreen } from "./support/SupportTicketScreen";
import { TicketDetailScreen } from "./support/TicketDetailScreen";
import { SheinForm } from "../shared/shein/SheinForm";
import { AwnakForm } from "../shared/awnak/AwnakForm";
import { ClientSpecialRequestsScreen, useSpecialRequestsController } from "../shared/special-requests";
import type { DshHomeSpecialRequestTarget } from "../shared/home-discovery";
import { useOrderTruthCollectionController, toOrderTruthSummary, type OrderTruth } from "../shared/order-truth";
import { fetchActiveCart } from "../commerce/cart";
import { dshClientRouteFromActionUrl, type DshClientNavigation, type DshClientRoute } from "./client-navigation";

type ClientTab = "home" | "stores" | "orders" | "special" | "wallet" | "profile" | "cart";

export type DshClientSurfaceProps = {
  readonly route: DshClientRoute;
  readonly navigation: DshClientNavigation;
};

const NAV_ITEMS: BottomNavItem[] = [
  { id: "profile", label: "حسابي", icon: <Icon name="person-outline" size={22} color={colorRoles.brandStructure} />, activeIcon: <Icon name="person" size={22} color={colorRoles.brandAction} /> },
  { id: "wallet", label: "محفظتي", icon: <Icon name="wallet-outline" size={22} color={colorRoles.brandStructure} />, activeIcon: <Icon name="wallet" size={22} color={colorRoles.brandAction} /> },
  { id: "orders", label: "طلباتي", icon: <Icon name="bag-outline" size={22} color={colorRoles.brandStructure} />, activeIcon: <Icon name="bag" size={22} color={colorRoles.brandAction} /> },
  { id: "home", label: "الرئيسية", icon: <Icon name="home-outline" size={22} color={colorRoles.brandStructure} />, activeIcon: <Icon name="home" size={22} color={colorRoles.brandAction} /> },
];

function routeTab(route: DshClientRoute): ClientTab {
  switch (route.kind) {
    case "home": return "home";
    case "stores":
    case "store": return "stores";
    case "orders":
    case "order":
    case "order-pickup":
    case "order-chat": return "orders";
    case "special-requests":
    case "special-request-shein":
    case "special-request-awnak": return "special";
    case "wallet": return "wallet";
    case "cart": return "cart";
    case "profile":
    case "profile-commercial":
    case "profile-addresses":
    case "profile-identity":
    case "profile-benefits":
    case "profile-preferences":
    case "support":
    case "support-ticket":
    case "notifications": return "profile";
  }
}

function isNestedRoute(route: DshClientRoute): boolean {
  return !["home", "stores", "orders", "special-requests", "wallet", "cart", "profile"].includes(route.kind);
}

function isClientTab(value: string): value is ClientTab {
  return value === "home" || value === "stores" || value === "orders" || value === "special" || value === "wallet" || value === "profile" || value === "cart";
}

export function DshClientSurface({ route, navigation }: DshClientSurfaceProps) {
  const insets = useSafeAreaInsets();
  const { selectionHaptic, openExternalUrl } = useDshClientPlatform();
  const activeTab = routeTab(route);
  const [activeCartDiscovery, setActiveCartDiscovery] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [cartRetryToken, setCartRetryToken] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationActionError, setNotificationActionError] = useState<string | null>(null);
  const specialRequestController = useSpecialRequestsController();
  const { state: ordersState } = useOrderTruthCollectionController("client");

  const activeOrder = useMemo(() => {
    if (ordersState.kind !== "success" && ordersState.kind !== "partial") return null;
    return ordersState.orders.find((order) => order.currentOwner !== "terminal" && !["delivered", "returned_to_store"].includes(order.status) && !order.status.startsWith("cancelled_") && !order.status.startsWith("failed_")) ?? null;
  }, [ordersState]);

  const navigate = useCallback((nextRoute: DshClientRoute, mode: "push" | "replace" = "push") => {
    void selectionHaptic();
    navigation.navigate(nextRoute, mode);
  }, [navigation, selectionHaptic]);

  const cartStoreId = route.kind === "cart" ? route.storeId : undefined;
  useEffect(() => {
    if (route.kind !== "cart" || cartStoreId) {
      setActiveCartDiscovery("idle");
      return undefined;
    }
    let mounted = true;
    setActiveCartDiscovery("loading");
    void fetchActiveCart().then((cart) => {
      if (!mounted) return;
      if (cart) {
        setActiveCartDiscovery("idle");
        navigation.navigate({ kind: "cart", storeId: cart.storeId }, "replace");
      } else setActiveCartDiscovery("empty");
    }).catch(() => {
      if (mounted) setActiveCartDiscovery("error");
    });
    return () => { mounted = false; };
  }, [navigation, route.kind, cartStoreId, cartRetryToken]);

  const openOrderTracking = useCallback((orderId: string) => navigate({ kind: "order", orderId }), [navigate]);
  const openPickupSession = useCallback((orderId: string) => navigate({ kind: "order-pickup", orderId }), [navigate]);
  const openOrderSupport = useCallback((orderId: string, fulfillmentMode?: OrderTruth["fulfillmentMode"]) => {
    navigate({ kind: "order-chat", orderId, ...(fulfillmentMode ? { fulfillmentMode } : {}) });
  }, [navigate]);
  const openNotificationActionUrl = useCallback((actionUrl: string) => {
    const target = dshClientRouteFromActionUrl(actionUrl);
    if (!target) {
      setNotificationActionError("هذا الإجراء غير مدعوم في تطبيق العميل. افتح الإشعار من التطبيق أو حدّثه من جديد.");
      return;
    }
    setNotificationActionError(null);
    navigation.navigate(target);
  }, [navigation]);
  const openHomeMarketingAction = useCallback((actionType: string, actionTarget: string) => {
    const target = actionTarget.trim();
    setNotificationActionError(null);
    if (actionType === "store" && target) {
      navigate({ kind: "store", storeId: target });
      return;
    }
    if (actionType === "external" && target) {
      void openExternalUrl(target)
        .then((opened) => {
          if (!opened) setNotificationActionError("تعذر فتح الرابط التسويقي الآمن. تحقق من الاتصال أو افتح العرض لاحقًا.");
        })
        .catch(() => setNotificationActionError("تعذر فتح الرابط التسويقي الآمن. تحقق من الاتصال أو افتح العرض لاحقًا."));
      return;
    }
    setNotificationActionError("هذا الإجراء التسويقي غير مدعوم أو لا يملك وجهة صالحة.");
  }, [navigate, openExternalUrl]);
  const openSpecialRequestType = useCallback((requestType: DshHomeSpecialRequestTarget) => {
    navigate({ kind: requestType === "SHEIN_ASSISTED_PURCHASE" ? "special-request-shein" : "special-request-awnak" });
  }, [navigate]);

  const nestedRoute = isNestedRoute(route);
  const showHeader = route.kind === "home";
  const showBottomNav = !nestedRoute;
  let content: React.ReactNode;

  switch (route.kind) {
    case "notifications":
      content = <NotificationCenterScreen onBack={navigation.back} onOpenActionUrl={openNotificationActionUrl} />;
      break;
    case "order-chat":
      content = <OrderChatScreen orderId={route.orderId} fulfillmentMode={route.fulfillmentMode ?? "bthwani_delivery"} onBack={navigation.back} onOpenNotifications={() => navigate({ kind: "notifications" })} />;
      break;
    case "order-pickup":
      content = <PickupSessionScreen orderId={route.orderId} onBack={navigation.back} />;
      break;
    case "order":
      content = <OrderTrackingScreen orderId={route.orderId} onBack={navigation.back} onOpenPickup={openPickupSession} onOpenOrderSupport={openOrderSupport} onOpenNotifications={() => navigate({ kind: "notifications" })} />;
      break;
    case "special-request-shein":
      content = <SheinForm onBack={navigation.back} onViewRequests={() => navigate({ kind: "special-requests" }, "replace")} onSubmit={(data) => specialRequestController.submit({ requestType: "SHEIN_ASSISTED_PURCHASE", ...data })} />;
      break;
    case "special-request-awnak":
      content = <AwnakForm onBack={navigation.back} onViewRequests={() => navigate({ kind: "special-requests" }, "replace")} onSubmit={(data) => specialRequestController.submit({ requestType: "AWNAK_ERRAND", ...data })} />;
      break;
    case "home":
      content = <HomeDiscoveryRoute searchQuery={searchQuery} onStorePress={(storeId) => navigate({ kind: "store", storeId })} onSpecialRequestPress={openSpecialRequestType} onMarketingAction={openHomeMarketingAction} />;
      break;
    case "special-requests":
      content = <ClientSpecialRequestsScreen onBack={() => navigate({ kind: "home" }, "replace")} onCreateShein={() => navigate({ kind: "special-request-shein" })} onCreateAwnak={() => navigate({ kind: "special-request-awnak" })} />;
      break;
    case "stores":
      content = <StoreDiscoveryRoute onStorePress={(storeId) => navigate({ kind: "store", storeId })} />;
      break;
    case "store":
      content = <StoreDetailRoute storeId={route.storeId} onBack={navigation.back} onGoToCart={() => navigate({ kind: "cart", storeId: route.storeId })} />;
      break;
    case "orders":
      content = <OrdersListScreen onOpenOrder={openOrderTracking} onOpenSpecialRequests={() => navigate({ kind: "special-requests" })} onOpenNotifications={() => navigate({ kind: "notifications" })} />;
      break;
    case "wallet":
      content = <WltClientWalletPanel />;
      break;
    case "cart":
      if (!route.storeId) {
        if (activeCartDiscovery === "loading" || activeCartDiscovery === "idle") content = <LoadingState title="جاري تحميل السلة المحفوظة…" />;
        else if (activeCartDiscovery === "error") content = <StateView tone="danger" title="تعذر تحميل السلة" description="تعذر اكتشاف السلة المحفوظة من DSH." actionLabel="إعادة المحاولة" onActionPress={() => setCartRetryToken((value) => value + 1)} />;
        else content = <StateView title="السلة فارغة" description="لم توجد سلة نشطة. أضف منتجًا من كتالوج أحد المتاجر." actionLabel="تصفح المتاجر" onActionPress={() => navigate({ kind: "stores" })} />;
      } else {
        content = <ClientCheckoutRoute storeId={route.storeId} onBack={navigation.back} onBrowseCatalog={() => navigate({ kind: "stores" })} onManageAddresses={() => navigate({ kind: "profile-addresses", ...(route.storeId ? { returnStoreId: route.storeId } : {}) })} onSuccess={openOrderTracking} />;
      }
      break;
    case "profile-commercial":
      content = <MyProfileScreen onBack={navigation.back} />;
      break;
    case "profile-addresses":
      {
        const returnStoreId = route.returnStoreId;
        content = <AddressLocationScreen onBack={navigation.back} {...(returnStoreId ? { onOpenCheckout: () => navigate({ kind: "cart", storeId: returnStoreId }, "replace") } : {})} />;
      }
      break;
    case "profile-identity":
      content = <IdentityHubScreen onBack={navigation.back} />;
      break;
    case "profile-benefits":
      content = <BenefitsHubScreen onBack={navigation.back} />;
      break;
    case "profile-preferences":
      content = <PreferencesHubScreen onBack={navigation.back} />;
      break;
    case "support-ticket":
      content = <TicketDetailScreen ticketId={route.ticketId} onBack={navigation.back} />;
      break;
    case "support":
      content = <SupportTicketScreen onBack={navigation.back} onOpenTicket={(ticketId) => navigate({ kind: "support-ticket", ticketId })} {...(route.orderId ? { orderId: route.orderId } : {})} />;
      break;
    case "profile":
      content = <MySpaceScreen onOpenOrders={() => navigate({ kind: "orders" })} onOpenAddresses={() => navigate({ kind: "profile-addresses" })} onOpenIdentity={() => navigate({ kind: "profile-identity" })} onOpenBenefits={() => navigate({ kind: "profile-benefits" })} onOpenPreferences={() => navigate({ kind: "profile-preferences" })} onOpenProfile={() => navigate({ kind: "profile-commercial" })} onOpenSupport={() => navigate({ kind: "support" })} />;
      break;
  }

  return (
    <View style={[styles.root, { paddingTop: showHeader || route.kind === "store" ? 0 : insets.top }]}>
      {showHeader ? (
        <AppHeader
          title="بثواني"
          topInset={insets.top}
          direction="rtl"
          {...(activeOrder ? { tickerStatusLabel: "طلب نشط", tickerMessage: `طلبك #${activeOrder.orderNumber} · ${toOrderTruthSummary(activeOrder).statusLabel}`, onTickerPress: () => navigate({ kind: "order", orderId: activeOrder.id }) } : {})}
          searchSlot={isSearchActive ? <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="ابحث عن متجر أو فئة..." placeholderTextColor={colorRoles.textMuted} style={{ height: 36, backgroundColor: colorRoles.surfaceBase, borderRadius: 18, paddingHorizontal: 16, textAlign: "right", flex: 1, fontSize: 14 }} autoFocus /> : undefined}
          actions={[
            { icon: <Icon name={isSearchActive ? "close-outline" : "search-outline"} size={20} color={colorRoles.surfaceBase} />, accessibilityLabel: "بحث", onPress: () => { void selectionHaptic(); if (isSearchActive) setSearchQuery(""); setIsSearchActive((value) => !value); } },
            { icon: <Icon name="notifications-outline" size={20} color={colorRoles.surfaceBase} />, accessibilityLabel: "الإشعارات", onPress: () => navigate({ kind: "notifications" }) },
            { icon: <Icon name="cart-outline" size={20} color={colorRoles.surfaceBase} />, accessibilityLabel: "عربة التسوق", onPress: () => navigate({ kind: "cart" }) },
          ]}
        />
      ) : null}
      <View style={styles.content}>
        {notificationActionError ? (
          <StateView
            tone="warning"
            title="تعذر فتح الإشعار"
            description={notificationActionError}
            actionLabel="إغلاق"
            onActionPress={() => setNotificationActionError(null)}
          />
        ) : null}
        {content}
      </View>
      {showBottomNav ? (
        <BottomNavBar
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={(id) => {
            if (!isClientTab(id)) return;
            const target: DshClientRoute = id === "home" ? { kind: "home" } : id === "stores" ? { kind: "stores" } : id === "orders" ? { kind: "orders" } : id === "wallet" ? { kind: "wallet" } : id === "profile" ? { kind: "profile" } : id === "special" ? { kind: "special-requests" } : { kind: "cart" };
            navigate(target);
          }}
          launcherIcon={<Icon name="grid-outline" size={26} color={colorRoles.surfaceBase} />}
          launcherLabel="الخدمات"
          onLauncherPress={() => navigate(activeTab === "stores" ? { kind: "home" } : { kind: "stores" })}
          direction="rtl"
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: brandScale.surface[50] }, content: { flex: 1 } });
