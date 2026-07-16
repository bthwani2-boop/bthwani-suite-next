import React from 'react';
import { I18nManager, ScrollView, StyleSheet, View, Modal, TouchableWithoutFeedback, Text, Pressable, Dimensions } from 'react-native';
import { colorRoles, spacing, radius, elevation, alpha } from '@bthwani/ui-kit';
import { Screen, LoadingState, EmptyState, ErrorState, OfflineState } from '@bthwani/ui-kit';
import type { HomeDiscoveryState, DiscoveryFilterKind } from '../../shared/home-discovery';
import { applyDiscoveryFilter } from '../../shared/home-discovery';
import { HomeHeroBannerSection } from './HomeHeroBannerSection';
import { HomePromoSection } from './HomePromoSection';
import { HomeFilterRailSection } from './HomeFilterRailSection';
import { HomeStoreFeedSection } from './HomeStoreFeedSection';

const { width: screenWidth } = Dimensions.get('window');

type Props = {
  state: HomeDiscoveryState;
  activeFilter: DiscoveryFilterKind;
  onFilterChange: (kind: DiscoveryFilterKind) => void;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialCategoryPress?: ((nodeId: string) => void) | undefined;
  onRetry?: (() => void) | undefined;
};

export function HomeDiscoveryShell({ state, activeFilter, onFilterChange, onStorePress, onSpecialCategoryPress, onRetry }: Props) {
  const isRtl = I18nManager.isRTL;
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState({ x: 0, y: 0 });

  const handleCategoriesPress = React.useCallback((event: any) => {
    if (event?.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      setDropdownPosition({
        x: pageX,
        y: pageY + 30,
      });
      setShowDropdown(true);
    }
  }, []);

  if (state.kind === 'loading') {
    return (
      <Screen padded={false}>
        <LoadingState title="جاري التحميل..." />
      </Screen>
    );
  }

  if (state.kind === 'error') {
    return (
      <Screen padded={false}>
        {onRetry ? (
          <ErrorState
            title="حدث خطأ"
            description={state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={onRetry}
          />
        ) : (
          <ErrorState
            title="حدث خطأ"
            description={state.message}
          />
        )}
      </Screen>
    );
  }

  if (state.kind === 'service_unavailable') {
    return (
      <Screen padded={false}>
        {onRetry ? (
          <OfflineState
            title="الخدمة غير متاحة مؤقتًا"
            description="يرجى المحاولة مرة أخرى لاحقًا"
            actionLabel="إعادة المحاولة"
            onActionPress={onRetry}
          />
        ) : (
          <OfflineState
            title="الخدمة غير متاحة مؤقتًا"
            description="يرجى المحاولة مرة أخرى لاحقًا"
          />
        )}
      </Screen>
    );
  }

  if (state.kind === 'empty') {
    return (
      <Screen padded={false}>
        <EmptyState title="لا توجد متاجر" description="لا توجد متاجر متاحة في منطقتك حاليًا" />
      </Screen>
    );
  }

  const { banners, promos, filters, categories, stores } = state.data;

  const filteredStores = applyDiscoveryFilter(stores, activeFilter)
    .filter((store) => activeCategoryId === null || store.categoryId === activeCategoryId);

  // Position logic (center card under press position and bound to screen edges)
  const dropdownWidth = 230;
  const leftPos = Math.min(
    screenWidth - dropdownWidth - 16,
    Math.max(16, dropdownPosition.x - dropdownWidth / 2)
  );

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isRtl && styles.contentRtl]}
        showsVerticalScrollIndicator={false}
      >
        {banners.length > 0 && (
          <HomeHeroBannerSection banners={banners} />
        )}
        {promos.length > 0 && (
          <HomePromoSection
            promos={promos}
            onCategoriesPress={handleCategoriesPress}
          />
        )}
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

      {/* Floating Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.dropdownCard,
                {
                  position: 'absolute',
                  top: dropdownPosition.y,
                  left: leftPos,
                  width: dropdownWidth,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownHeaderTitle}>الفئات</Text>
              </View>
              <View style={styles.dropdownDivider} />

              <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                {/* Clear Filter / All option */}
                <Pressable
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    { flexDirection: isRtl ? 'row-reverse' : 'row' },
                    pressed && styles.dropdownItemPressed,
                    activeCategoryId === null && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setActiveCategoryId(null);
                    setShowDropdown(false);
                  }}
                >
                  {/* Leftmost Selection Indicator */}
                  <View style={styles.selectionIndicator}>
                    {activeCategoryId === null && <Text style={styles.checkmark}>✓</Text>}
                  </View>

                  {/* Middle Label */}
                  <Text style={[styles.dropdownLabel, activeCategoryId === null && styles.dropdownLabelActive]}>
                    جميع الفئات
                  </Text>

                  {/* Rightmost Emoji Icon Container */}
                  <View style={[styles.emojiContainer, activeCategoryId === null && styles.emojiContainerActive]}>
                    <Text style={styles.dropdownEmoji}>🎛️</Text>
                  </View>
                </Pressable>

                {categories.map((cat) => {
                  const isSelected = activeCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        { flexDirection: isRtl ? 'row-reverse' : 'row' },
                        pressed && styles.dropdownItemPressed,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setShowDropdown(false);
                        if (cat.id === 'node-shein' || cat.id === 'node-awnak') {
                          onSpecialCategoryPress?.(cat.id);
                        } else {
                          setActiveCategoryId(isSelected ? null : cat.id);
                        }
                      }}
                    >
                      {/* Leftmost Selection Indicator */}
                      <View style={styles.selectionIndicator}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>

                      {/* Middle Label */}
                      <Text style={[styles.dropdownLabel, isSelected && styles.dropdownLabelActive]}>
                        {cat.label}
                      </Text>

                      {/* Rightmost Emoji Icon Container */}
                      <View style={[styles.emojiContainer, isSelected && styles.emojiContainerActive]}>
                        <Text style={styles.dropdownEmoji}>{cat.iconUrl || '📦'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  content: {
    paddingBottom: spacing[8],
  },
  contentRtl: {
    // RTL handled at component level; shell just ensures layout direction
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownCard: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.08),
    padding: spacing[2],
    ...elevation.overlay,
    maxHeight: 320,
  },
  dropdownHeader: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  dropdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colorRoles.textMuted,
    textAlign: 'right',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colorRoles.borderSubtle,
    marginVertical: spacing[1],
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  dropdownItem: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
    borderRadius: radius.md,
    marginVertical: 2,
  },
  dropdownItemPressed: {
    backgroundColor: alpha(colorRoles.brandAction, 0.05),
  },
  dropdownItemActive: {
    backgroundColor: alpha(colorRoles.brandAction, 0.08),
  },
  emojiContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colorRoles.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiContainerActive: {
    backgroundColor: colorRoles.brandActionSoft,
  },
  dropdownEmoji: {
    fontSize: 16,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colorRoles.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  dropdownLabelActive: {
    color: colorRoles.brandAction,
    fontWeight: '700',
  },
  selectionIndicator: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: colorRoles.brandAction,
  },
});
