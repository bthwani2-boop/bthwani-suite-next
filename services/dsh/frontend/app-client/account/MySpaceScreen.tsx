import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Icon,
  MobileScrollView,
  Text,
  TopBar,
  brandScale,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import { ActorWalletPanel } from "../../shared/finance-wlt-link/actor-wallet";

export type MySpaceScreenProps = {
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
  | "preferences"
  | "support";

type TabConfig = {
  id: MySpaceTab;
  label: string;
  summary: string;
  iconName: string;
};

const TABS: readonly TabConfig[] = [
  { id: "orders", label: "طلباتي", summary: "الطلب والتاريخ والتتبع", iconName: "bag-outline" },
  { id: "addresses", label: "العناوين والموقع", summary: "إدارة العناوين وتعليمات التوصيل", iconName: "location-outline" },
  { id: "identity", label: "الملف الشخصي", summary: "البيانات الشخصية والأمان", iconName: "person-outline" },
  { id: "benefits", label: "المزايا والولاء", summary: "النقاط والاشتراكات والعروض المعتمدة", iconName: "gift-outline" },
  { id: "preferences", label: "تفضيلات الإشعارات", summary: "إعدادات محفوظة في DSH ومقروءة بعد التعديل", iconName: "notifications-outline" },
  { id: "support", label: "الدعم والمساعدة", summary: "تذاكر الدعم ومتابعة المشاكل", iconName: "help-buoy-outline" },
];

function MySpaceRow({
  title,
  subtitle,
  iconName,
  onPress,
}: {
  title: string;
  subtitle: string;
  iconName: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}، ${subtitle}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIconContainer}>
        <Icon name={iconName} size={21} color={colorRoles.brandAction} />
      </View>
      <View style={styles.rowText}>
        <Text role="bodyStrong" style={styles.rowTitle}>{title}</Text>
        <Text role="bodySm" tone="muted" style={styles.rowSummary}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

export function MySpaceScreen({
  onOpenOrders,
  onOpenAddresses,
  onOpenIdentity,
  onOpenBenefits,
  onOpenPreferences,
  onOpenSupport,
}: MySpaceScreenProps) {
  const handleRowPress = (id: MySpaceTab) => {
    switch (id) {
      case "orders": return onOpenOrders?.();
      case "addresses": return onOpenAddresses?.();
      case "identity": return onOpenIdentity?.();
      case "benefits": return onOpenBenefits?.();
      case "preferences": return onOpenPreferences?.();
      case "support": return onOpenSupport?.();
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="مساحتي" />

      <MobileScrollView fill padding={4} gap={3} contentContainerStyle={styles.scrollContent}>
        <ActorWalletPanel actorType="client" title="محفظتي" embedded />

        {TABS.map((tab) => (
          <MySpaceRow
            key={tab.id}
            title={tab.label}
            subtitle={tab.summary}
            iconName={tab.iconName}
            onPress={() => handleRowPress(tab.id)}
          />
        ))}
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
  chevron: {
    fontSize: 20,
    color: colorRoles.brandStructure,
    transform: [{ scaleX: -1 }],
  },
});
