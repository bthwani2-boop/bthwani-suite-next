import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Linking, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../../../apps/app-client/runtime/src/shell/AppHeader";
import {
  BottomNavBar,
  type BottomNavItem,
} from "../../../../apps/app-client/runtime/src/shell/BottomNavBar";
import {
  openClientExternalUrl,
  performClientSelectionHaptic,
} from "../../../../apps/app-client/runtime/src/platform/client-platform-actions";
import { brandScale, colorRoles, Icon, StateView } from "@bthwani/ui-kit";
import { HomeDiscoveryRoute } from "./home-discovery/HomeDiscoveryRoute";
import { StoreDiscoveryRoute } from "./store/StoreDiscoveryRoute";
import { StoreDetailRoute } from "./store/StoreDetailRoute";
import { ClientCheckoutRoute } from "./checkout/ClientCheckoutRoute";
import { OrdersListScreen } from "./orders/OrdersListScreen";
import { MySpaceScreen } from "./account/MySpaceScreen";
import { AddressLocationScreen } from "./account/AddressLocationScreen";
import { IdentityHubScreen } from "./account/IdentityHubScreen";
import { BenefitsHubScreen } from "./account/BenefitsHubScreen";
import { PreferencesHubScreen } from "./account/PreferencesHubScreen";
import { NotificationCenterScreen } from "./notifications/NotificationCenterScreen";
import { OrderTrackingScreen } from "./orders/OrderTrackingScreen";
import { PickupSessionScreen } from "./orders/PickupSessionScreen";
import { SupportTicketScreen } from "./support/SupportTicketScreen";
import { TicketDetailScreen } from "./support/TicketDetailScreen";
import { SheinForm } from "../shared/shein/SheinForm";
import { AwnakForm } from "../shared/awnak/AwnakForm";
import {
  ClientSpecialRequestsScreen,
  useSpecialRequestsController,
} from "../shared/special-requests";
import { generateSpecialRequestIdempotencyKey } from "../shared/special-requests/special-requests.idempotency";
import { notificationActionFromDeepLink } from "../shared/notifications/client-notification-deep-link";

type ClientTab = "home" | "stores" | "orders" | "special" | "profile" | "cart";
type ProfileRoute =
  | "profile"
  | "addresses"
  | "identity"
  | "benefits"
  | "preferences"
  | "support";
type SpecialRequestRoute = "shein" | "awnak";

const NAV_ITEMS: BottomNavItem[] = [
  {
    id: "profile",
    label: "حسابي",
    icon: <Icon name="person-outline" size={22} color={colorRoles.brandStructure} />,
    activeIcon: <Icon name="person" size={22} color={colorRoles.brandAction} />,
  },
  {
    id: "special",
    label: "طلبات خاصة",
    icon: <Icon name="sparkles-outline" size={22} color={colorRoles.brandStructure} />,
    activeIcon: <Icon name="sparkles" size={22} color={colorRoles.brandAction} />,
  },
  {
    id: "orders",
    label: "طلباتي",
    icon: <Icon name="bag-outline" size={22} color={colorRoles.brandStructure} />,
    activeIcon: <Icon name="bag" size={22} color={colorRoles.brandAction} />,
  },
  {
    id: "home",
    label: "الرئيسية",
    icon: <Icon name="home-outline" size={22} color={colorRoles.brandStructure} />,
    activeIcon: <Icon name="home" size={22} color={colorRoles.brandAction} />,
  },
];

function isClientTab(value: string): value is ClientTab {
  return value === "home"
    || value === "stores"
    || value === "orders"
    || value === "special"
    || value === "profile"
    || value === "cart";
}

export function DshClientSurface() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ClientTab>("home");
  const [profileRoute, setProfileRoute] = useState<ProfileRoute>("profile");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activePickupOrderId, setActivePickupOrderId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeSpecialRequest, setActiveSpecialRequest] = useState<SpecialRequestRoute | null>(null);

  const specialRequestController = useSpecialRequestsController();

  const activateTab = useCallback((tab: ClientTab) => {
    void performClientSelectionHaptic();
    setShowNotifications(false);
    setActiveSpecialRequest(null);
    setActivePickupOrderId(null);
    setActiveOrderId(null);
    setActiveTicketId(null);
    if (tab === "profile") setProfileRoute("profile");
    setActiveTab(tab);
  }, []);

  const openOrderTracking = useCallback((orderId: string) => {
    setActiveTab("orders");
    setActivePickupOrderId(null);
    setActiveOrderId(orderId);
  }, []);

  const openPickupSession = useCallback((orderId: string) => {
    void performClientSelectionHaptic();
    setActiveTab("orders");
    setActiveOrderId(orderId);
    setActivePickupOrderId(orderId);
  }, []);

  const openStore = useCallback((storeId: string) => {
    void performClientSelectionHaptic();
    setSelectedStoreId(storeId);
    setActiveTab("stores");
  }, []);

  const openNotificationActionUrl = useCallback((actionUrl: string) => {
    const normalized = actionUrl.trim();
    const pickupMatch = /^\/orders\/([^/]+)\/pickup$/.exec(normalized);
    if (pickupMatch?.[1]) {
      setShowNotifications(false);
      openPickupSession(pickupMatch[1]);
      return;
    }
    if (normalized === "/orders/pickup") {
      setShowNotifications(false);
      setActiveTab("orders");
      return;
    }
    const orderMatch = /^\/orders\/([^/]+)$/.exec(normalized);
    if (orderMatch?.[1]) {
      setShowNotifications(false);
      openOrderTracking(orderMatch[1]);
      return;
    }
    if (/^\/special-requests(?:\/[^/]+)?$/.test(normalized)) {
      setShowNotifications(false);
      setActiveSpecialRequest(null);
      setActiveTab("special");
    }
  }, [openOrderTracking, openPickupSession]);

  const openHomeMarketingAction = useCallback((actionType: string, actionTarget: string) => {
    const target = actionTarget.trim();
    if (actionType === "store" && target) {
      openStore(target);
      return;
    }
    if (actionType === "external") {
      void openClientExternalUrl(target);
    }
  }, [openStore]);

  const openAddressBookFromCart = useCallback(() => {
    setProfileRoute("addresses");
    setActiveTab("profile");
  }, []);

  const returnFromAddressBookToCart = useCallback(() => {
    setProfileRoute("profile");
    setActiveTab("cart");
  }, []);

  const openSpecialRequestList = useCallback(() => {
    setActiveSpecialRequest(null);
    setActiveTab("special");
  }, []);

  const goBack = useCallback(() => {
    if (showNotifications) {
      setShowNotifications(false);
      return true;
    }
    if (activeSpecialRequest !== null) {
      setActiveSpecialRequest(null);
      setActiveTab("special");
      return true;
    }
    if (activePickupOrderId !== null) {
      setActivePickupOrderId(null);
      return true;
    }
    if (activeOrderId !== null) {
      setActiveOrderId(null);
      return true;
    }
    if (activeTicketId !== null) {
      setActiveTicketId(null);
      return true;
    }
    if (activeTab === "stores" && selectedStoreId !== null) {
      setSelectedStoreId(null);
      return true;
    }
    if (activeTab === "stores" || activeTab === "special") {
      setActiveTab("home");
      return true;
    }
    if (activeTab === "profile" && profileRoute !== "profile") {
      setProfileRoute("profile");
      return true;
    }
    if (activeTab !== "home") {
      setActiveTab("home");
      return true;
    }
    return false;
  }, [
    activeOrderId,
    activePickupOrderId,
    activeSpecialRequest,
    activeTab,
    activeTicketId,
    profileRoute,
    selectedStoreId,
    showNotifications,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then((url) => {
      if (!active || !url) return;
      const actionUrl = notificationActionFromDeepLink(url);
      if (actionUrl) openNotificationActionUrl(actionUrl);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const actionUrl = notificationActionFromDeepLink(url);
      if (actionUrl) openNotificationActionUrl(actionUrl);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [openNotificationActionUrl]);

  const nestedRoute =
    showNotifications ||
    activeSpecialRequest !== null ||
    activeOrderId !== null ||
    activePickupOrderId !== null ||
    activeTicketId !== null ||
    (activeTab === "stores" && selectedStoreId !== null) ||
    (activeTab === "profile" && profileRoute !== "profile");
  const showHeader = activeTab === "home" && !nestedRoute;
  const showBottomNav = !nestedRoute;

  return (
    <View style={[styles.root, { paddingTop: showHeader ? 0 : insets.top }]}>
      {showHeader ? (
        <AppHeader
          title="بثواني"
          topInset={insets.top}
          direction="rtl"
          actions={[
            {
              icon: <Icon name="notifications-outline" size={20} color={colorRoles.surfaceBase} />,
              accessibilityLabel: "الإشعارات",
              onPress: () => {
                void performClientSelectionHaptic();
                setShowNotifications(true);
              },
            },
            {
              icon: <Icon name="cart-outline" size={20} color={colorRoles.surfaceBase} />,
              accessibilityLabel: "عربة التسوق",
              onPress: () => activateTab("cart"),
            },
          ]}
        />
      ) : null}

      <View style={styles.content}>
        {showNotifications ? (
          <NotificationCenterScreen
            onBack={() => setShowNotifications(false)}
            onOpenActionUrl={openNotificationActionUrl}
          />
        ) : activePickupOrderId !== null ? (
          <PickupSessionScreen
            orderId={activePickupOrderId}
            onBack={() => setActivePickupOrderId(null)}
          />
        ) : activeOrderId !== null ? (
          <OrderTrackingScreen
            orderId={activeOrderId}
            onBack={() => setActiveOrderId(null)}
            onOpenPickup={openPickupSession}
          />
        ) : activeSpecialRequest === "shein" ? (
          <SheinForm
            onBack={openSpecialRequestList}
            onViewRequests={openSpecialRequestList}
            onSubmit={(data) => specialRequestController.submit({
              requestType: "SHEIN_ASSISTED_PURCHASE",
              idempotencyKey: generateSpecialRequestIdempotencyKey(),
              ...data,
            })}
          />
        ) : activeSpecialRequest === "awnak" ? (
          <AwnakForm
            onBack={openSpecialRequestList}
            onViewRequests={openSpecialRequestList}
            onSubmit={(data) => specialRequestController.submit({
              requestType: "AWNAK_ERRAND",
              idempotencyKey: generateSpecialRequestIdempotencyKey(),
              ...data,
            })}
          />
        ) : activeTab === "home" ? (
          <HomeDiscoveryRoute
            onStorePress={openStore}
            onSpecialCategoryPress={(nodeId) => {
              void performClientSelectionHaptic();
              if (nodeId === "node-shein") setActiveSpecialRequest("shein");
              if (nodeId === "node-awnak") setActiveSpecialRequest("awnak");
            }}
            onMarketingAction={openHomeMarketingAction}
          />
        ) : activeTab === "special" ? (
          <ClientSpecialRequestsScreen
            onBack={() => setActiveTab("home")}
            onCreateShein={() => setActiveSpecialRequest("shein")}
            onCreateAwnak={() => setActiveSpecialRequest("awnak")}
          />
        ) : activeTab === "stores" ? (
          selectedStoreId === null ? (
            <StoreDiscoveryRoute onStorePress={openStore} />
          ) : (
            <StoreDetailRoute
              storeId={selectedStoreId}
              onBack={() => setSelectedStoreId(null)}
              onGoToCart={() => setActiveTab("cart")}
            />
          )
        ) : activeTab === "orders" ? (
          <OrdersListScreen onOpenOrder={openOrderTracking} />
        ) : activeTab === "cart" ? (
          selectedStoreId === null ? (
            <StateView
              title="السلة غير محددة"
              description="اختر متجرًا للوصول إلى سلته المحفوظة في DSH."
              actionLabel="تصفح المتاجر"
              onActionPress={() => setActiveTab("stores")}
            />
          ) : (
            <ClientCheckoutRoute
              storeId={selectedStoreId}
              onBack={() => setActiveTab("stores")}
              onBrowseCatalog={() => setActiveTab("stores")}
              onManageAddresses={openAddressBookFromCart}
              onSuccess={openOrderTracking}
            />
          )
        ) : profileRoute === "addresses" ? (
          <AddressLocationScreen
            onBack={() => setProfileRoute("profile")}
            {...(selectedStoreId !== null ? { onOpenCheckout: returnFromAddressBookToCart } : {})}
          />
        ) : profileRoute === "identity" ? (
          <IdentityHubScreen onBack={() => setProfileRoute("profile")} />
        ) : profileRoute === "benefits" ? (
          <BenefitsHubScreen onBack={() => setProfileRoute("profile")} />
        ) : profileRoute === "preferences" ? (
          <PreferencesHubScreen onBack={() => setProfileRoute("profile")} />
        ) : profileRoute === "support" ? (
          activeTicketId !== null ? (
            <TicketDetailScreen
              ticketId={activeTicketId}
              onBack={() => setActiveTicketId(null)}
            />
          ) : (
            <SupportTicketScreen
              onBack={() => setProfileRoute("profile")}
              onOpenTicket={setActiveTicketId}
            />
          )
        ) : (
          <MySpaceScreen
            onOpenOrders={() => setActiveTab("orders")}
            onOpenAddresses={() => setProfileRoute("addresses")}
            onOpenIdentity={() => setProfileRoute("identity")}
            onOpenBenefits={() => setProfileRoute("benefits")}
            onOpenPreferences={() => setProfileRoute("preferences")}
            onOpenSupport={() => setProfileRoute("support")}
          />
        )}
      </View>

      {showBottomNav ? (
        <BottomNavBar
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={(id) => {
            if (isClientTab(id)) activateTab(id);
          }}
          launcherIcon={<Icon name="grid-outline" size={26} color={colorRoles.surfaceBase} />}
          launcherLabel="الخدمات"
          onLauncherPress={() => activateTab(activeTab === "stores" ? "home" : "stores")}
          direction="rtl"
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brandScale.surface[50] },
  content: { flex: 1 },
});
