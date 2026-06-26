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
import { PartnerIntakeScreen } from "../../../../services/dsh/frontend/app-field/partner-intake";
import { FieldStoreVerificationScreen } from "../../../../services/dsh/frontend/app-field/store";
import { DshFieldVisitScreen } from "../../../../services/dsh/frontend/app-field/field-readiness";
import { DshFieldReadinessChecklistScreen } from "../../../../services/dsh/frontend/app-field/field-readiness";
import type { DshFieldVisit } from "../../../../services/dsh/frontend/shared/field-readiness";

const DEV_STORE_ID = "dev-store-001";

const DEV_VISIT: DshFieldVisit = {
  id: "dev-visit-001",
  storeId: DEV_STORE_ID,
  fieldAgentId: "dev-agent-001",
  visitType: "onboarding",
  status: "in_progress",
  notes: "",
  startedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type Tab = "intake" | "verification" | "visit" | "checklist";

const TABS: { id: Tab; label: string }[] = [
  { id: "intake", label: "استقبال شريك" },
  { id: "verification", label: "التحقق" },
  { id: "visit", label: "الزيارة" },
  { id: "checklist", label: "القائمة" },
];

const BRAND = brandRoots.brandAction; // #FF500D (Orange)
const WHITE = brandRoots.surfaceBase; // #FFFFFF
const CORNER = 32;
const ICON_SIZE = 22;
const ICON_COLOR_INACTIVE = "#64748B";

// SVG Icons
function IntakeIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 21c0-3.3-2.7-6-6-6H10c-3.3 0-6 2.7-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 8h4M21 6v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function VerificationIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m9 11 2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VisitIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChecklistIcon({ active }: { active?: boolean }) {
  const color = active ? BRAND : ICON_COLOR_INACTIVE;
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Curved Premium Header
type FieldAppHeaderProps = {
  title: string;
  subtitle?: string;
  topInset?: number;
};

function FieldAppHeader({ title, subtitle, topInset = 0 }: FieldAppHeaderProps) {
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
              {item.id === "intake" && <IntakeIcon active={isActive} />}
              {item.id === "verification" && <VerificationIcon active={isActive} />}
              {item.id === "visit" && <VisitIcon active={isActive} />}
              {item.id === "checklist" && <ChecklistIcon active={isActive} />}
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
  const [activeTab, setActiveTab] = useState<Tab>("intake");

  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "intake":
        return {
          title: "استقبال شريك جديد",
          subtitle: "تسجيل بيانات ومستندات شريك جديد في النظام",
        };
      case "verification":
        return {
          title: "مساحة التحقق الميداني",
          subtitle: "مراجعة جاهزية بيانات المتجر واعتماده",
        };
      case "visit":
        return {
          title: "زيارات المتجر الميدانية",
          subtitle: "سجّل زيارتك وتابع حالة التأهيل للمتجر",
        };
      case "checklist":
        return {
          title: "قائمة التحقق الميداني",
          subtitle: "تقييم جاهزية المتجر للاعتماد وتدريب الموظفين",
        };
    }
  }, [activeTab]);

  return (
    <View style={styles.root}>
      <FieldAppHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        topInset={insets.top}
      />
      <View style={styles.screen}>
        {activeTab === "intake" && <PartnerIntakeScreen />}
        {activeTab === "verification" && <FieldStoreVerificationScreen />}
        {activeTab === "visit" && <DshFieldVisitScreen storeId={DEV_STORE_ID} />}
        {activeTab === "checklist" && <DshFieldReadinessChecklistScreen visit={DEV_VISIT} />}
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
