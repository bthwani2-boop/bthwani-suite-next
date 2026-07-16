import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Circle, Rect, Path } from "react-native-svg";
import { AppHeader } from "../../../../apps/app-client/runtime/src/shell/AppHeader";
import { BottomNavBar, type BottomNavItem } from "../../../../apps/app-client/runtime/src/shell/BottomNavBar";
import { brandScale, colorRoles, StateView } from '@bthwani/ui-kit';

// Import routes/screens
import { HomeDiscoveryRoute } from "./home-discovery/HomeDiscoveryRoute";
import { StoreDiscoveryRoute } from "./store/StoreDiscoveryRoute";
import { StoreDetailRoute } from "./store/StoreDetailRoute";
import { ClientCheckoutRoute } from "./checkout/ClientCheckoutRoute";
import { OrdersListScreen } from "./orders/OrdersListScreen";
import { MySpaceScreen } from "./account/MySpaceScreen";
import { AppearanceHubScreen } from "./account/AppearanceHubScreen";
import { AddressLocationScreen } from "./account/AddressLocationScreen";
import { IdentityHubScreen } from "./account/IdentityHubScreen";
import { PreferencesHubScreen } from "./account/PreferencesHubScreen";
import { BenefitsHubScreen } from "./account/BenefitsHubScreen";
import { NotificationCenterScreen } from "./notifications/NotificationCenterScreen";
import { OrderTrackingScreen } from "./orders/OrderTrackingScreen";
import { SupportTicketScreen } from "./support/SupportTicketScreen";
import { TicketDetailScreen } from "./support/TicketDetailScreen";

const ICON_SIZE = 22;
const ICON_COLOR_ACTIVE = colorRoles.brandAction;
const ICON_COLOR_INACTIVE = colorRoles.brandStructure;
const ICON_COLOR_WHITE = colorRoles.surfaceBase;

function OrdersIcon({ active }: { active?: boolean }) {
  const c = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2" stroke={c} strokeWidth={active ? 2.2 : 1.8} />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </Svg>
  );
}

function WalletIcon({ active }: { active?: boolean }) {
  const c = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="14" rx="2" stroke={c} strokeWidth={active ? 2.2 : 1.8} />
      <Path d="M2 10h20" stroke={c} strokeWidth={active ? 2.2 : 1.8} />
      <Circle cx="17" cy="15" r="1.5" fill={c} />
    </Svg>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  const c = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z"
        stroke={c}
        strokeWidth={active ? 2.2 : 1.8}
        fill={active ? c + "22" : "none"}
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V12h6v9"
        stroke={c}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({ active }: { active?: boolean }) {
  const c = active ? ICON_COLOR_ACTIVE : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={active ? 2.2 : 1.8} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={ICON_COLOR_WHITE} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Minimal notification icon
function NotificationIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10a6 6 0 1112 0v4l2 2H4l2-2v-4z"
        stroke={ICON_COLOR_WHITE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 004 0" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Minimal cart icon
function CartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M3 6h18M16 10a4 4 0 01-8 0" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Minimal grid launcher icon
function ServicesIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" fill={ICON_COLOR_WHITE} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" fill={ICON_COLOR_WHITE} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" fill={ICON_COLOR_WHITE} />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" fill={ICON_COLOR_WHITE} />
    </Svg>
  );
}

const NAV_ITEMS: BottomNavItem[] = [
  {
    id: "profile",
    label: "حسابي",
    icon: <ProfileIcon />,
    activeIcon: <ProfileIcon active />,
  },
  {
    id: "wallet",
    label: "المحفظة",
    icon: <WalletIcon />,
    activeIcon: <WalletIcon active />,
  },
  {
    id: "orders",
    label: "طلباتي",
    icon: <OrdersIcon />,
    activeIcon: <OrdersIcon active />,
  },
  {
    id: "home",
    label: "الرئيسية",
    icon: <HomeIcon />,
    activeIcon: <HomeIcon active />,
  },
];

export function DshClientSurface() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [subroute, setSubroute] = useState<string>("profile");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [appearanceMode, setAppearanceMode] = useState<string>("lightPremium");

  const commerceStoreId: string | null = selectedStoreId;

  const goBack = () => {
    if (showNotifications) {
      setShowNotifications(false);
      return true;
    }
    if (activeOrderId) {
      setActiveOrderId(null);
      return true;
    }
    if ((activeTab as string) === "stores" && selectedStoreId !== null) {
      setSelectedStoreId(null);
      return true;
    }
    if ((activeTab as string) === "stores" && selectedStoreId === null) {
      setActiveTab("home");
      return true;
    }
    if (activeTicketId) {
      setActiveTicketId(null);
      return true;
    }
    if (activeTab === "profile" && subroute !== "profile") {
      setSubroute("profile");
      return true;
    }
    if (activeTab !== "home") {
      setActiveTab("home");
      return true;
    }
    return false; // Exit app
  };

  useEffect(() => {
    const backAction = () => {
      return goBack();
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [showNotifications, activeOrderId, activeTab, selectedStoreId, subroute, activeTicketId]);

  // Determine header and navigation bar visibility
  const showHeader = activeTab === "home" && !showNotifications && !activeOrderId;
  const showBottomNav = activeTab === "home" && !showNotifications && !activeOrderId;

  return (
    <View style={[styles.root, { paddingTop: showHeader ? 0 : insets.top }]}>
      {showHeader && (
        <AppHeader
          title="بثواني"
          locationLabel="صنعاء، حي الأصبحي"
          topInset={insets.top}
          direction="rtl"
          tickerMessage="مباشر"
          tickerStatusLabel="مباشر"
          actions={[
            {
              icon: <SearchIcon />,
              accessibilityLabel: "بحث",
            },
            {
              icon: <NotificationIcon />,
              accessibilityLabel: "الإشعارات",
              badgeCount: 0,
              onPress: () => setShowNotifications(true),
            },
            {
              icon: <CartIcon />,
              accessibilityLabel: "عربة التسوق",
              badgeCount: 0,
              onPress: () => {
                setActiveTab("cart");
              },
            },
          ]}
        />
      )}

      <View style={styles.content}>
        {showNotifications ? (
          <NotificationCenterScreen />
        ) : activeOrderId ? (
          <OrderTrackingScreen
            orderId={activeOrderId}
            onBack={() => setActiveOrderId(null)}
          />
        ) : activeTab === "home" ? (
          <HomeDiscoveryRoute
            onStorePress={(storeId) => {
              setSelectedStoreId(storeId);
              setActiveTab("stores");
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
          <OrdersListScreen
            onOpenOrder={setActiveOrderId}
          />
        ) : activeTab === "wallet" ? (
          <StateView
            title="محفظة بثواني"
            description="الرصيد وإدارة طرق الدفع ستتوفر قريباً."
            actionLabel="تصفح المتاجر"
            onActionPress={() => setActiveTab("stores")}
          />
        ) : activeTab === "cart" ? (
          commerceStoreId === null ? (
            <StateView
              title="السلة فارغة"
              description="يلزم اختيار متجر أولاً لعرض السلة وإتمام الطلب."
              actionLabel="تصفح المتاجر"
              onActionPress={() => setActiveTab("stores")}
            />
          ) : (
            <ClientCheckoutRoute
              storeId={commerceStoreId}
              serviceAreaCode="sana"
              onBrowseCatalog={() => setActiveTab("stores")}
              onSuccess={(intentId) => {
                setActiveOrderId(intentId);
              }}
            />
          )
        ) : activeTab === "profile" ? (
          subroute === "appearance" ? (
            <AppearanceHubScreen
              appearanceMode={appearanceMode as any}
              onAppearanceModeChange={setAppearanceMode}
            />
          ) : subroute === "addresses" ? (
            <AddressLocationScreen />
          ) : subroute === "identity" ? (
            <IdentityHubScreen />
          ) : subroute === "preferences" ? (
            <PreferencesHubScreen />
          ) : subroute === "benefits" ? (
            <BenefitsHubScreen />
          ) : subroute === "support" ? (
            activeTicketId ? (
              <TicketDetailScreen ticketId={activeTicketId} />
            ) : (
              <SupportTicketScreen onOpenTicket={setActiveTicketId} />
            )
          ) : (
            <MySpaceScreen
              appearanceMode={appearanceMode as any}
              onAppearanceModeChange={setAppearanceMode}
              onOpenOrders={() => setActiveTab("orders")}
              onOpenWallet={() => setActiveTab("wallet")}
              onOpenBenefits={() => setSubroute("benefits")}
              onOpenAddresses={() => setSubroute("addresses")}
              onOpenIdentity={() => setSubroute("identity")}
              onOpenAppearance={() => setSubroute("appearance")}
              onOpenPreferences={() => setSubroute("preferences")}
              onOpenSupport={() => setSubroute("support")}
            />
          )
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {showBottomNav && (
        <BottomNavBar
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={setActiveTab}
          launcherIcon={<ServicesIcon />}
          launcherLabel="الخدمات"
          onLauncherPress={() => {
            if ((activeTab as string) === "stores") {
              setActiveTab("home");
            } else {
              setSelectedStoreId(null);
              setActiveTab("stores");
            }
          }}
          direction="rtl"
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandScale.surface[50],
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
  },
});
