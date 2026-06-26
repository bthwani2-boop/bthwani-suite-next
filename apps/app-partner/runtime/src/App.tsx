import React, { useState, useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Circle, Path } from "react-native-svg";
import {
  brandRoots,
  colorRoles,
  neutralScale,
  statusScale,
  alpha,
  spacing,
} from "@bthwani/ui-kit";
import { PartnerActivationStatusScreen } from "../../../../services/dsh/frontend/app-partner/onboarding";
import { PartnerStoreScreen } from "../../../../services/dsh/frontend/app-partner/store";
import { PartnerCatalogManagementScreen } from "../../../../services/dsh/frontend/app-partner/catalog";
import { PartnerOrdersScreen } from "../../../../services/dsh/frontend/app-partner/orders";
import { PartnerSupportScreen } from "../../../../services/dsh/frontend/app-partner/support";

const DEV_STORE_ID = "dev-store-001";

type Tab = "status" | "store" | "catalog" | "orders" | "support";

const TABS: { id: Tab; label: string }[] = [
  { id: "status", label: "حالتي" },
  { id: "store", label: "متجري" },
  { id: "catalog", label: "الكتالوج" },
  { id: "orders", label: "الطلبات" },
  { id: "support", label: "الدعم" },
];

const BRAND = brandRoots.brandAction; // #FF500D (Orange)
const WHITE = brandRoots.surfaceBase; // #FFFFFF
const CORNER = 32;
const ICON_SIZE = 22;
const ICON_COLOR_INACTIVE = "#64748B";

// SVG Icons
function StatusIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StoreIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CatalogIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function OrdersIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.27 6.96 12 12.01l8.73-5.05" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 22.08V12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SupportIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <Path d="M4.93 4.93 9.17 9.17M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// Curved Premium Header
type PartnerAppHeaderProps = {
  title: string;
  subtitle?: string;
  topInset?: number;
};

function PartnerAppHeader({ title, subtitle, topInset = 0 }: PartnerAppHeaderProps) {
  return (
    <View
      style={[
        headerStyles.container,
        { backgroundColor: BRAND, paddingTop: topInset + spacing[2] },
      ]}
    >
      <View style={headerStyles.row}>
        <View style={headerStyles.titleArea}>
          <Text style={headerStyles.titleText}>{title}</Text>
          {subtitle ? (
            <Text style={[headerStyles.subtitleText, { color: alpha(WHITE, 0.88) }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// Curved Premium Bottom Navigation Bar
function LocalBottomNavBar({
  activeId,
  onSelect,
  bottomInset = 0,
}: {
  activeId: Tab;
  onSelect: (id: Tab) => void;
  bottomInset?: number;
}) {
  const totalHeight = 64 + bottomInset;

  return (
    <View style={[navStyles.bar, { height: totalHeight, paddingBottom: bottomInset }]}>
      <View style={navStyles.row}>
        {TABS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={navStyles.navButton}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {item.id === "status" && <StatusIcon active={isActive} />}
              {item.id === "store" && <StoreIcon active={isActive} />}
              {item.id === "catalog" && <CatalogIcon active={isActive} />}
              {item.id === "orders" && <OrdersIcon active={isActive} />}
              {item.id === "support" && <SupportIcon active={isActive} />}
              <Text style={[navStyles.navLabel, isActive && navStyles.activeColor]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function App() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("status");

  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "status":
        return {
          title: "حالة تأهيل متجرك",
          subtitle: "متابعة مرحلة التفعيل الحالية للمتجر في المنصة",
        };
      case "store":
        return {
          title: "مركز تشغيل المتجر",
          subtitle: "إدارة متجرك والاطلاع على حالة الاتصال والظهور",
        };
      case "catalog":
        return {
          title: "كتالوج المنتجات",
          subtitle: "إضافة وتعديل الأقسام والمنتجات المتاحة",
        };
      case "orders":
        return {
          title: "طلبات المتجر",
          subtitle: "تجهيز وقبول الطلبات الواردة من العملاء",
        };
      case "support":
        return {
          title: "دعم الشريك",
          subtitle: "تواصل مع الدعم الفني لحل مشكلات متجرك",
        };
    }
  }, [activeTab]);

  return (
    <View style={styles.root}>
      <PartnerAppHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        topInset={insets.top}
      />
      <View style={styles.screen}>
        {activeTab === "status" && <PartnerActivationStatusScreen />}
        {activeTab === "store" && <PartnerStoreScreen />}
        {activeTab === "catalog" && <PartnerCatalogManagementScreen />}
        {activeTab === "orders" && <PartnerOrdersScreen storeId={DEV_STORE_ID} />}
        {activeTab === "support" && <PartnerSupportScreen />}
      </View>
      <LocalBottomNavBar
        activeId={activeTab}
        onSelect={setActiveTab}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: CORNER,
    borderBottomRightRadius: CORNER,
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  titleArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
});

const navStyles = StyleSheet.create({
  bar: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 16,
  },
  row: {
    flex: 1,
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: spacing[2],
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: ICON_COLOR_INACTIVE,
  },
  activeColor: {
    color: BRAND,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});

export default App;
