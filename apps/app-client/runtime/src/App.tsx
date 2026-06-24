import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Circle, Rect, Path } from "react-native-svg";
import {
  AppHeader,
  BottomNavBar,
  brandRoots,
  brandScale,
  colorRoles,
  type BottomNavItem,
} from "@bthwani/ui-kit";
import { HomeDiscoveryRoute } from "../../../../services/dsh/frontend/app-client/home-discovery/HomeDiscoveryRoute";
import { StoreDiscoveryRoute } from "../../../../services/dsh/frontend/app-client/store/StoreDiscoveryRoute";
import { PublishedCatalogScreen } from "../../../../services/dsh/frontend/app-client/catalog";
import { ClientCheckoutRoute } from "../../../../services/dsh/frontend/app-client/checkout/ClientCheckoutRoute";

// ─── Inline icon helpers ───────────────────────────────────────
const ICON_SIZE          = 22;
const ICON_COLOR_ACTIVE  = brandRoots.brandAction;
const ICON_COLOR_INACTIVE = colorRoles.textMuted;
const ICON_COLOR_WHITE   = brandRoots.surfaceBase;

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

// ─── Header action icons ───────────────────────────────────────

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={ICON_COLOR_WHITE} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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

function CartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M3 6h18M16 10a4 4 0 01-8 0" stroke={ICON_COLOR_WHITE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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

// ─── Bottom nav — order matches reference design:
//     RTL visual: الرئيسية | طلباتي | [الخدمات launcher] | المحفظة | حسابي
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

// ─── App shell ────────────────────────────────────────────────
function App() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const commerceStoreId = selectedStoreId ?? "store-1001";

  const isViewingStorefront = activeTab === "stores" && selectedStoreId !== null;

  return (
    <View style={styles.root}>
      {/* Header — RTL: right=actions(search+notification+cart), center=title+location, left=avatar */}
      {!isViewingStorefront && (
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
            },
            {
              icon: <CartIcon />,
              accessibilityLabel: "عربة التسوق",
              badgeCount: 0,
            },
          ]}
        />
      )}

      <View style={styles.content}>
        {activeTab === "home" ? (
          <HomeDiscoveryRoute
            onStorePress={(storeId) => {
              setSelectedStoreId(storeId);
              setActiveTab("stores");
            }}
          />
        ) : activeTab === "stores" ? (
          selectedStoreId === null
            ? <StoreDiscoveryRoute onStorePress={setSelectedStoreId} />
            : <PublishedCatalogScreen
                storeId={selectedStoreId}
                onBack={() => setSelectedStoreId(null)}
              />
        ) : activeTab === "wallet" ? (
          <ClientCheckoutRoute
            storeId={commerceStoreId}
            serviceAreaCode="sana"
            onBrowseCatalog={() => setActiveTab("stores")}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Bottom nav — RTL: الرئيسية | طلباتي | الخدمات | المحفظة | حسابي */}
      {/* Launcher opens StoreDiscovery (DSH-001 surface) */}
      {!isViewingStorefront && (
        <BottomNavBar
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={setActiveTab}
          launcherIcon={<ServicesIcon />}
          launcherLabel="الخدمات"
          onLauncherPress={() => setActiveTab(activeTab === "stores" ? "home" : "stores")}
          direction="rtl"
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

export default App;

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
