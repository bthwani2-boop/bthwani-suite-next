import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Icon,
  MobileScrollView,
  Text,
  TopBar,
  spacing,
  SegmentedControl,
  colorRoles,
  brandScale,
} from "@bthwani/ui-kit";

export type BThwaniAppearanceMode = "lightPremium" | "darkGlass";

export type MySpaceScreenProps = {
  appearanceMode?: BThwaniAppearanceMode;
  onAppearanceModeChange?: (mode: BThwaniAppearanceMode) => void;
  onOpenOrders?: () => void;
  onOpenAddresses?: () => void;
  onOpenIdentity?: () => void;
  onOpenBenefits?: () => void;
  onOpenPreferences?: () => void;
  onOpenSupport?: () => void;
};

type MySpaceTab =
  | "orders"
  | "addresses"
  | "identity"
  | "benefits"
  | "appearance"
  | "language"
  | "preferences"
  | "support";

type TabConfig = {
  id: MySpaceTab;
  label: string;
  summary: string;
  iconName: string;
};

const TABS: TabConfig[] = [
  { id: "orders", label: "طلباتي", summary: "الطلب والتاريخ والتتبع", iconName: "bag-outline" },
  { id: "addresses", label: "العناوين والموقع", summary: "إدارة العناوين وموقع التوصيل", iconName: "location-outline" },
  { id: "identity", label: "الملف الشخصي", summary: "البيانات الشخصية والأمان", iconName: "person-outline" },
  { id: "benefits", label: "المزايا والولاء", summary: "النقاط والاشتراكات والعروض المعتمدة", iconName: "gift-outline" },
  { id: "appearance", label: "المظهر", summary: "فاتح أبيض أو داكن زجاجي", iconName: "color-palette-outline" },
  { id: "language", label: "اللغة", summary: "العربية أو الإنجليزية", iconName: "globe-outline" },
  { id: "preferences", label: "تفضيلات التوصيل", summary: "إعدادات خاصة بالتسليم والاستبدال", iconName: "options-outline" },
  { id: "support", label: "الدعم والمساعدة", summary: "تذاكر الدعم ومتابعة المشاكل", iconName: "help-buoy-outline" },
];

function MySpaceRow({
  title,
  subtitle,
  iconName,
  onPress,
  actionElement,
}: {
  title: string;
  subtitle: string;
  iconName: string;
  onPress?: () => void;
  actionElement?: React.ReactNode;
}) {
  return (
    <Pressable
      disabled={Boolean(actionElement)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && !actionElement && styles.rowPressed]}
    >
      <View style={styles.rowIconContainer}>
        <Icon name={iconName} size={21} color={colorRoles.brandAction} />
      </View>
      <View style={styles.rowText}>
        <Text role="bodyStrong" style={styles.rowTitle}>{title}</Text>
        <Text role="bodySm" tone="muted" style={styles.rowSummary}>{subtitle}</Text>
      </View>
      {actionElement ? (
        <View style={styles.actionWrapper}>{actionElement}</View>
      ) : (
        <Text style={styles.chevron}>‹</Text>
      )}
    </Pressable>
  );
}

export function MySpaceScreen({
  appearanceMode = "lightPremium",
  onAppearanceModeChange,
  onOpenOrders,
  onOpenAddresses,
  onOpenIdentity,
  onOpenBenefits,
  onOpenPreferences,
  onOpenSupport,
}: MySpaceScreenProps) {
  const [lang, setLang] = useState<string>("ar");

  const handleRowPress = (id: MySpaceTab) => {
    switch (id) {
      case "orders": return onOpenOrders?.();
      case "addresses": return onOpenAddresses?.();
      case "identity": return onOpenIdentity?.();
      case "benefits": return onOpenBenefits?.();
      case "preferences": return onOpenPreferences?.();
      case "support": return onOpenSupport?.();
      default: return undefined;
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="مساحتي" />

      <MobileScrollView fill padding={4} gap={3} contentContainerStyle={styles.scrollContent}>
        {TABS.map((tab) => {
          let actionElement: React.ReactNode = undefined;

          if (tab.id === "appearance") {
            actionElement = (
              <SegmentedControl
                items={[
                  { value: "lightPremium", label: "فاتح" },
                  { value: "darkGlass", label: "داكن" },
                ]}
                value={appearanceMode === "darkGlass" ? "darkGlass" : "lightPremium"}
                onValueChange={(nextValue) => {
                  onAppearanceModeChange?.(nextValue as BThwaniAppearanceMode);
                }}
              />
            );
          } else if (tab.id === "language") {
            actionElement = (
              <SegmentedControl
                items={[
                  { value: "ar", label: "عربي" },
                  { value: "en", label: "EN" },
                ]}
                value={lang}
                onValueChange={setLang}
              />
            );
          }

          return (
            <MySpaceRow
              key={tab.id}
              title={tab.label}
              subtitle={tab.summary}
              iconName={tab.iconName}
              actionElement={actionElement}
              onPress={() => handleRowPress(tab.id)}
            />
          );
        })}
      </MobileScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  rowPressed: {
    backgroundColor: colorRoles.surfaceBase,
  },
  rowIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: brandScale.action[50],
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  rowSummary: {
    textAlign: "right",
  },
  actionWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  chevron: {
    fontSize: 20,
    color: colorRoles.brandStructure,
    transform: [{ scaleX: -1 }],
  },
});
