import React from "react";
import {
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineState,
  Screen,
  alpha,
  colorRoles,
  elevation,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import {
  applyDiscoveryFilter,
  buildHomeStoreGroups,
  recordHomeMarketingEvent,
  type BannerViewModel,
  type DiscoveryFilterKind,
  type HomeDiscoveryState,
  type PromoViewModel,
} from "../../shared/home-discovery";
import { HomeFilterRailSection } from "./HomeFilterRailSection";
import { HomeHeroBannerSection } from "./HomeHeroBannerSection";
import { HomePromoSection } from "./HomePromoSection";
import { HomeStoreFeedSection } from "./HomeStoreFeedSection";
import { HomeStoreGroupsSection } from "./HomeStoreGroupsSection";

type Props = {
  state: HomeDiscoveryState;
  activeFilter: DiscoveryFilterKind;
  onFilterChange: (kind: DiscoveryFilterKind) => void;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialCategoryPress?: ((nodeId: string) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
  onRetry?: (() => void) | undefined;
};

export function HomeDiscoveryShell({
  state,
  activeFilter,
  onFilterChange,
  onStorePress,
  onSpecialCategoryPress,
  onMarketingAction,
  onRetry,
}: Props) {
  const isRtl = I18nManager.isRTL;
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const recordedImpressions = React.useRef(new Set<string>());
  const viewerRef = React.useRef(
    `home.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`,
  );

  const emitMarketingEvent = React.useCallback((
    eventType: "impression" | "click",
    contentKind: "banners" | "promos",
    contentId: string,
  ) => {
    if (state.kind !== "success") return;
    void recordHomeMarketingEvent({
      eventType,
      contentKind,
      contentId,
      viewerRef: viewerRef.current,
      cityCode: state.data.context.cityCode,
      serviceAreaCode: state.data.context.serviceAreaCode,
      audienceSegment: state.data.context.audienceSegment,
    });
  }, [state]);

  React.useEffect(() => {
    if (state.kind !== "success") return;
    const content = [
      ...state.data.banners.map((item) => ({ kind: "banners" as const, id: item.id })),
      ...state.data.promos.map((item) => ({ kind: "promos" as const, id: item.id })),
    ];
    for (const item of content) {
      const key = `${item.kind}:${item.id}`;
      if (recordedImpressions.current.has(key)) continue;
      recordedImpressions.current.add(key);
      emitMarketingEvent("impression", item.kind, item.id);
    }
  }, [emitMarketingEvent, state]);

  const executeMarketingAction = React.useCallback((actionType: string, actionTarget: string) => {
    const target = actionTarget.trim();
    if (!target || actionType === "none") return;
    if (actionType === "category") {
      setActiveCategoryId(target);
      return;
    }
    onMarketingAction?.(actionType, target);
  }, [onMarketingAction]);

  const handleBannerPress = React.useCallback((banner: BannerViewModel) => {
    emitMarketingEvent("click", "banners", banner.id);
    executeMarketingAction(banner.actionType, banner.actionTarget);
  }, [emitMarketingEvent, executeMarketingAction]);

  const handlePromoPress = React.useCallback((promo: PromoViewModel) => {
    emitMarketingEvent("click", "promos", promo.id);
    executeMarketingAction(promo.actionType, promo.actionTarget);
  }, [emitMarketingEvent, executeMarketingAction]);

  if (state.kind === "loading") {
    return <Screen padded={false}><LoadingState title="جاري التحميل..." /></Screen>;
  }
  if (state.kind === "error") {
    return (
      <Screen padded={false}>
        <ErrorState
          title="حدث خطأ"
          description={state.message}
          {...(onRetry ? { actionLabel: "إعادة المحاولة", onActionPress: onRetry } : {})}
        />
      </Screen>
    );
  }
  if (state.kind === "service_unavailable") {
    return (
      <Screen padded={false}>
        <OfflineState
          title="الخدمة غير متاحة مؤقتًا"
          description="يرجى المحاولة مرة أخرى لاحقًا"
          {...(onRetry ? { actionLabel: "إعادة المحاولة", onActionPress: onRetry } : {})}
        />
      </Screen>
    );
  }
  if (state.kind === "empty") {
    return (
      <Screen padded={false}>
        <EmptyState title="لا توجد متاجر" description="لا توجد متاجر متاحة في منطقتك حاليًا" />
      </Screen>
    );
  }

  const { banners, promos, filters, categories, stores } = state.data;
  const groups = buildHomeStoreGroups(stores);
  const filteredStores = applyDiscoveryFilter(stores, activeFilter)
    .filter((store) => activeCategoryId === null || store.categoryId === activeCategoryId);

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {banners.length > 0 ? (
          <HomeHeroBannerSection banners={banners} onBannerPress={handleBannerPress} />
        ) : null}
        {promos.length > 0 ? (
          <HomePromoSection
            promos={promos}
            onPromoPress={handlePromoPress}
            onCategoriesPress={() => setShowDropdown(true)}
          />
        ) : null}
        <HomeStoreGroupsSection groups={groups} onStorePress={onStorePress} />
        <HomeFilterRailSection
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
        <HomeStoreFeedSection
          stores={filteredStores}
          activeFilter={activeFilter}
          onStorePress={onStorePress}
        />
      </ScrollView>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownCard}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownHeaderTitle}>الفئات</Text>
                </View>
                <View style={styles.dropdownDivider} />
                <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                  <CategoryOption
                    label="جميع الفئات"
                    icon="🎛️"
                    selected={activeCategoryId === null}
                    isRtl={isRtl}
                    onPress={() => {
                      setActiveCategoryId(null);
                      setShowDropdown(false);
                    }}
                  />
                  {categories.map((category) => {
                    const selected = activeCategoryId === category.id;
                    return (
                      <CategoryOption
                        key={category.id}
                        label={category.label}
                        icon={category.iconUrl || "📦"}
                        selected={selected}
                        isRtl={isRtl}
                        onPress={() => {
                          setShowDropdown(false);
                          if (category.id === "node-shein" || category.id === "node-awnak") {
                            onSpecialCategoryPress?.(category.id);
                          } else {
                            setActiveCategoryId(selected ? null : category.id);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

function CategoryOption({
  label,
  icon,
  selected,
  isRtl,
  onPress,
}: {
  readonly label: string;
  readonly icon: string;
  readonly selected: boolean;
  readonly isRtl: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.dropdownItem,
        isRtl ? styles.rowRtl : styles.rowLtr,
        pressed && styles.dropdownItemPressed,
        selected && styles.dropdownItemActive,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.selectionIndicator}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.dropdownLabel, selected && styles.dropdownLabelActive]}>{label}</Text>
      <View style={[styles.emojiContainer, selected && styles.emojiContainerActive]}>
        <Text style={styles.dropdownEmoji}>{icon}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  content: { paddingBottom: spacing[8] },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[4],
    backgroundColor: alpha(colorRoles.shadowBase, 0.22),
  },
  dropdownCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: 420,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.08),
    padding: spacing[2],
    ...elevation.overlay,
  },
  dropdownHeader: { paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  dropdownHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colorRoles.borderSubtle,
    marginVertical: spacing[1],
  },
  dropdownScroll: { flexGrow: 0 },
  dropdownItem: {
    alignItems: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
    borderRadius: radius.md,
    marginVertical: 2,
  },
  rowRtl: { flexDirection: "row-reverse" },
  rowLtr: { flexDirection: "row" },
  dropdownItemPressed: { backgroundColor: alpha(colorRoles.brandAction, 0.05) },
  dropdownItemActive: { backgroundColor: alpha(colorRoles.brandAction, 0.08) },
  emojiContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colorRoles.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiContainerActive: { backgroundColor: colorRoles.brandActionSoft },
  dropdownEmoji: { fontSize: 16 },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colorRoles.textSecondary,
    textAlign: "right",
    flex: 1,
  },
  dropdownLabelActive: { color: colorRoles.brandAction, fontWeight: "700" },
  selectionIndicator: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  checkmark: { fontSize: 14, fontWeight: "700", color: colorRoles.brandAction },
});
