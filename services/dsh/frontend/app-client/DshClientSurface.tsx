import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../../../apps/app-client/runtime/src/shell/AppHeader";
import {
  BottomNavBar,
  type BottomNavItem,
} from "../../../../apps/app-client/runtime/src/shell/BottomNavBar";
import { brandScale, colorRoles, Icon, StateView } from "@bthwani/ui-kit";
import { HomeDiscoveryRoute } from "./home-discovery/HomeDiscoveryRoute";
import { StoreDiscoveryRoute } from "./store/StoreDiscoveryRoute";
import { StoreDetailRoute } from "./store/StoreDetailRoute";
import { ClientCheckoutRoute } from "./checkout/ClientCheckoutRoute";
import { OrdersListScreen } from "./orders/OrdersListScreen";
import {
  MySpaceScreen,
  type BThwaniAppearanceMode,
} from "./account/MySpaceScreen";
import { AppearanceHubScreen } from "./account/AppearanceHubScreen";
import { AddressLocationScreen } from "./account/AddressLocationScreen";
import { IdentityHubScreen } from "./account/IdentityHubScreen";
import { BenefitsHubScreen } from "./account/BenefitsHubScreen";
import { PreferencesHubScreen } from "./account/PreferencesHubScreen";
import { NotificationCenterScreen } from "./notifications/NotificationCenterScreen";
import { OrderTrackingScreen } from "./orders/OrderTrackingScreen";
import { SupportTicketScreen } from "./support/SupportTicketScreen";
import { TicketDetailScreen } from "./support/TicketDetailScreen";
import { SheinForm } from "../shared/shein/SheinForm";
import { AwnakForm } from "../shared/awnak/AwnakForm";
import { useSpecialRequestsController } from "../shared/special-requests/use-special-requests-controller";
import { generateSpecialRequestIdempotencyKey } from "../shared/special-requests/special-requests.idempotency";

type ClientTab = "home" | "stores" | "orders" | "profile" | "cart";
type ProfileRoute =
  | "profile"
  | "appearance"
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
  return value === "home" || value === "stores" || value === "orders" || value === "profile" || value === "cart";
}

export function DshClientSurface() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ClientTab>("home");
  const [profileRoute, setProfileRoute] = useState<ProfileRoute>("profile");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [appearanceMode, setAppearanceMode] = useState<BThwaniAppearanceMode>("lightPremium");
  const [activeSpecialRequest, setActiveSpecialRequest] = useState<SpecialRequestRoute | null>(null);

  const specialRequestController = useSpecialRequestsController();

  const openOrderTracking = useCallback((orderId: string) => {
    setActiveTab("orders");
    setActiveOrderId(orderId);
  }, []);

  const openAddressBookFromCart = useCallback(() => {
    setProfileRoute("addresses");
    setActiveTab("profile");
  }, []);

  const returnFromAddressBookToCart = useCallback(() => {
    setProfileRoute("profile");
    setActiveTab("cart");
  }, []);

  const goBack = useCallback(() => {
    if (showNotifications) {
      setShowNotifications(false);
      return true;
    }
    if (activeSpecialRequest !== null) {
      setActiveSpecialRequest(null);
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
    if (activeTab === "stores") {
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
  }, [activeOrderId, activeSpecialRequest, activeTab, activeTicketId, profileRoute, selectedStoreId, showNotifications]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  const nestedRoute =
    showNotifications ||
    activeSpecialRequest !== null ||
    activeOrderId !== null ||
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
              onPress: () => setShowNotifications(true),
            },
            {
              icon: <Icon name="cart-outline" size={20} color={colorRoles.surfaceBase} />,
              accessibilityLabel: "عربة التسوق",
              onPress: () => setActiveTab("cart"),
            },
          ]}
        />
      ) : null}

      <View style={styles.content}>
        {showNotifications ? (
          <NotificationCenterScreen />
        ) : activeOrderId !== null ? (
          <OrderTrackingScreen orderId={activeOrderId} onBack={() => setActiveOrderId(null)} />
        ) : activeSpecialRequest === "shein" ? (
          <SheinForm
            onBack={() => setActiveSpecialRequest(null)}
            onSubmit={(data) => specialRequestController.submit({
              requestType: "SHEIN_ASSISTED_PURCHASE",
              idempotencyKey: generateSpecialRequestIdempotencyKey(),
              ...data,
            })}
          />
        ) : activeSpecialRequest === "awnak" ? (
          <AwnakForm
            onBack={() => setActiveSpecialRequest(null)}
            onSubmit={(data) => specialRequestController.submit({
              requestType: "AWNAK_ERRAND",
              idempotencyKey: generateSpecialRequestIdempotencyKey(),
              ...data,
            })}
          />
        ) : activeTab === "home" ? (
          <HomeDiscoveryRoute
            onStorePress={(storeId) => {
              setSelectedStoreId(storeId);
              setActiveTab("stores");
            }}
            onSpecialCategoryPress={(nodeId) => {
              if (nodeId === "node-shein") setActiveSpecialRequest("shein");
              if (nodeId === "node-awnak") setActiveSpecialRequest("awnak");
            }}
          />
        ) : activeTab === "stores" ? (
          selectedStoreId === null ? (
            <StoreDiscoveryRoute onStorePress={setSelectedStoreId} />
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
              onBrowseCatalog={() => setActiveTab("stores")}
              onManageAddresses={openAddressBookFromCart}
              onSuccess={openOrderTracking}
            />
          )
        ) : profileRoute === "appearance" ? (
          <AppearanceHubScreen
            appearanceMode={appearanceMode}
            onAppearanceModeChange={setAppearanceMode}
          />
        ) : profileRoute === "addresses" ? (
          <AddressLocationScreen
            onBack={() => setProfileRoute("profile")}
            {...(selectedStoreId !== null ? { onOpenCheckout: returnFromAddressBookToCart } : {})}
          />
        ) : profileRoute === "identity" ? (
          <IdentityHubScreen />
        ) : profileRoute === "benefits" ? (
          <BenefitsHubScreen />
        ) : profileRoute === "preferences" ? (
          <PreferencesHubScreen />
        ) : profileRoute === "support" ? (
          activeTicketId !== null ? (
            <TicketDetailScreen ticketId={activeTicketId} />
          ) : (
            <SupportTicketScreen onOpenTicket={setActiveTicketId} />
          )
        ) : (
          <MySpaceScreen
            appearanceMode={appearanceMode}
            onAppearanceModeChange={setAppearanceMode}
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
            if (isClientTab(id)) setActiveTab(id);
          }}
          launcherIcon={<Icon name="grid-outline" size={26} color={colorRoles.surfaceBase} />}
          launcherLabel="الخدمات"
          onLauncherPress={() => setActiveTab(activeTab === "stores" ? "home" : "stores")}
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
