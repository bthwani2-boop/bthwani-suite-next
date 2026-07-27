import React from "react";
import {
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { ClientRemoteImage } from "../../../../../apps/app-client/runtime/src/media/ClientRemoteImage";
import { createClientEphemeralId } from "../../../../../apps/app-client/runtime/src/platform/client-platform-actions";
import {
  applyDiscoveryFilter,
  fetchHomePublicReels,
  recordHomeMarketingEvent,
  type BannerViewModel,
  type CategoryViewModel,
  type DiscoveryFilterKind,
  type DshHomeSpecialRequestTarget,
  type HomeDiscoveryState,
  type HomePublicReel,
  type PromoViewModel,
} from "../../shared/home-discovery";
import { HomeFilterRailSection } from "./HomeFilterRailSection";
import { HomeHeroBannerSection } from "./HomeHeroBannerSection";
import { HomePromoSection } from "./HomePromoSection";
import { HomeReelsSection } from "./HomeReelsSection";
import { HomeStoreFeedSection } from "./HomeStoreFeedSection";

type Props = {
  state: HomeDiscoveryState;
  activeFilter: DiscoveryFilterKind;
  onFilterChange: (kind: DiscoveryFilterKind) => void;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialRequestPress?: ((requestType: DshHomeSpecialRequestTarget) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
  onRetry?: (() => void) | undefined;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .toLocaleLowerCase("ar")
    .trim();
}

function isSpecialRequestTarget(value: string): value is DshHomeSpecialRequestTarget {
  return value === "SHEIN_ASSISTED_PURCHASE" || value === "AWNAK_ERRAND";
}

export function HomeDiscoveryShell({
  state,
  activeFilter,
  onFilterChange,
  onStorePress,
  onSpecialRequestPress,
  onMarketingAction,
  onRetry,
}: Props) {
  const isRtl = I18nManager.isRTL;
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [reels, setReels] = React.useState<readonly HomePublicReel[]>([]);
  const [viewerRef] = React.useState(() => createClientEphemeralId("home"));
  const scrollRef = React.useRef<ScrollView>(null);
  const reelsOffsetY = React.useRef(0);
  const recordedImpressions = React.useRef(new Set<string>());

  const emitMarketingEvent = React.useCallback((
    eventType: "impression" | "click",
    contentKind: "banners" | "promos",
    contentId: string,
  ) => {
    if (state.kind !== "success") return;
    if (contentId.startsWith("derived-store-")) return;
    void recordHomeMarketingEvent({
      eventType,
      contentKind,
      contentId,
      viewerRef,
      cityCode: state.data.context.cityCode,
      serviceAreaCode: state.data.context.serviceAreaCode,
      audienceSegment: state.data.context.audienceSegment,
    }).catch(() => undefined);
  }, [state, viewerRef]);

  React.useEffect(() => {
    if (state.kind !== "success") {
      setReels([]);
      return;
    }

    setReels([]);
    let cancelled = false;
    void fetchHomePublicReels(10)
      .then((items) => {
        if (!cancelled) setReels(items);
      })
      .catch(() => {
        if (!cancelled) setReels([]);
      });

    return () => {
      cancelled = true;
    };
  }, [
    state.kind,
    state.kind === "success" ? state.data.context.cityCode : "",
    state.kind === "success" ? state.data.context.serviceAreaCode : "",
  ]);

  React.useEffect(() => {
    if (state.kind !== "success" || activeCategoryId === null) return;
    const categoryStillExists = state.data.categories.some(
      (category) => category.destinationType === "catalog_domain"
        && category.destinationTarget === activeCategoryId,
    );
    if (!categoryStillExists) setActiveCategoryId(null);
  }, [activeCategoryId, state]);

  React.useEffect(() => {
    if (state.kind !== "success") return;
    const contextKey = `${state.data.context.cityCode}:${state.data.context.serviceAreaCode}`;
    const content = [
      ...state.data.banners.map((item) => ({ kind: "banners" as const, id: item.id })),
      ...state.data.promos.map((item) => ({ kind: "promos" as const, id: item.id })),
    ];
    for (const item of content) {
      const key = `${contextKey}:${item.kind}:${item.id}`;
      if (recordedImpressions.current.has(key)) continue;
      recordedImpressions.current.add(key);
      emitMarketingEvent("impression", item.kind, item.id);
    }
  }, [emitMarketingEvent, state]);

  const openCategoryDestination = React.useCallback((category: CategoryViewModel) => {
    if (
      category.destinationType === "special_request"
      && isSpecialRequestTarget(category.destinationTarget)
    ) {
      onSpecialRequestPress?.(category.destinationTarget);
      return;
    }
    if (category.destinationType === "catalog_domain") {
      setActiveCategoryId((current) =>
        current === category.destinationTarget ? null : category.destinationTarget,
      );
    }
  }, [onSpecialRequestPress]);

  const executeMarketingAction = React.useCallback((actionType: string, actionTarget: string) => {
    const target = actionTarget.trim();
    if (!target || actionType === "none") return;
    if (actionType === "category") {
      const category = state.kind === "success"
        ? state.data.categories.find((item) => item.id === target || item.destinationTarget === target)
        : undefined;
      if (category) openCategoryDestination(category);
      return;
    }
    onMarketingAction?.(actionType, target);
  }, [onMarketingAction, openCategoryDestination, state]);

  const handleBannerPress = React.useCallback((banner: BannerViewModel) => {
    emitMarketingEvent("click", "banners", banner.id);
    executeMarketingAction(banner.actionType, banner.actionTarget);
  }, [emitMarketingEvent, executeMarketingAction]);

  const handlePromoPress = React.useCallback((promo: PromoViewModel) => {
    emitMarketingEvent("click", "promos", promo.id);
    executeMarketingAction(promo.actionType, promo.actionTarget);
  }, [emitMarketingEvent, executeMarketingAction]);

  const handleVideoPress = React.useCallback(() => {
    scrollRef.current?.scrollTo({ y: reelsOffsetY.current, animated: true });
  }, []);

  const handleReelPress = React.useCallback((reel: HomePublicReel) => {
    onMarketingAction?.(reel.targetType, reel.targetId);
  }, [onMarketingAction]);

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
  const normalizedQuery = normalizeSearchText(searchText);
  const filteredStores = applyDiscoveryFilter(stores, activeFilter)
    .filter((store) => activeCategoryId === null || store.categoryId === activeCategoryId)
    .filter((store) => {
      if (!normalizedQuery) return true;
      const haystack = normalizeSearchText([
        store.displayName,
        store.categoryLabel,
        store.slug,
        ...store.deliveryModeLabels,
      ].filter(Boolean).join(" "));
      return haystack.includes(normalizedQuery);
    });

  return (
    <Screen padded={false}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {banners.length > 0 ? (
          <HomeHeroBannerSection banners={banners} onBannerPress={handleBannerPress} />
        ) : null}
        <HomePromoSection
          promos={promos}
          onPromoPress={handlePromoPress}
          onCategoriesPress={() => setShowDropdown(true)}
          {...(reels.length > 0 ? { onVideoPress: handleVideoPress } : {})}
        />
        <View
          onLayout={(event) => {
            reelsOffsetY.current = event.nativeEvent.layout.y;
          }}
        >
          <HomeReelsSection reels={reels} onReelPress={handleReelPress} />
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            accessibilityLabel="البحث في المتاجر والفئات"
            value={searchText}
            onChangeText={setSearchText}
            placeholder="ابحث عن متجر أو فئة"
            placeholderTextColor={colorRoles.textMuted}
            maxLength={120}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
            textAlign="right"
          />
          {searchText ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مسح البحث"
              hitSlop={8}
              onPress={() => setSearchText("")}
              style={styles.clearSearch}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          ) : null}
        </View>

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
                    const selected = category.destinationType === "catalog_domain"
                      && activeCategoryId === category.destinationTarget;
                    return (
                      <CategoryOption
                        key={category.id}
                        label={category.label}
                        icon={category.iconUrl || "📦"}
                        selected={selected}
                        isRtl={isRtl}
                        onPress={() => {
                          setShowDropdown(false);
                          openCategoryDestination(category);
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
  const iconIsImageUrl = /^https?:\/\//i.test(icon) || icon.startsWith("/");

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
      accessibilityLabel={`${label}${selected ? "، محدد" : ""}`}
    >
      <View style={styles.selectionIndicator}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.dropdownLabel, selected && styles.dropdownLabelActive]}>{label}</Text>
      <View style={[styles.emojiContainer, selected && styles.emojiContainerActive]}>
        {iconIsImageUrl ? (
          <ClientRemoteImage
            uri={icon}
            style={styles.dropdownIconImage}
            contentFit="contain"
            accessibilityLabel={`أيقونة ${label}`}
          />
        ) : (
          <Text style={styles.dropdownEmoji}>{icon}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  content: { paddingBottom: spacing[8] },
  searchWrap: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    position: "relative",
    justifyContent: "center",
  },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.round,
    paddingHorizontal: spacing[4],
    paddingLeft: 44,
    color: colorRoles.textPrimary,
    backgroundColor: colorRoles.surfaceMuted,
  },
  clearSearch: {
    position: "absolute",
    left: spacing[3],
    width: 30,
    height: 30,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  clearSearchText: {
    color: colorRoles.textSecondary,
    fontSize: 20,
    lineHeight: 22,
  },
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
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  checkmark: { fontSize: 12, fontWeight: "800", color: colorRoles.brandAction },
  dropdownLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  dropdownLabelActive: { color: colorRoles.brandAction, fontWeight: "800" },
  emojiContainer: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceMuted,
    overflow: "hidden",
  },
  emojiContainerActive: { backgroundColor: alpha(colorRoles.brandAction, 0.1) },
  dropdownEmoji: { fontSize: 18 },
  dropdownIconImage: {
    width: 24,
    height: 24,
  },
});
