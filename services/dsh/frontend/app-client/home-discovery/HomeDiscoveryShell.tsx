import React from 'react';
import { I18nManager, ScrollView, StyleSheet, View } from 'react-native';
import { colorRoles, spacing } from '@bthwani/ui-kit';
import { Screen, LoadingState, EmptyState, ErrorState, OfflineState } from '@bthwani/ui-kit';
import type { HomeDiscoveryState, DiscoveryFilterKind } from '../../shared/home-discovery';
import { applyDiscoveryFilter } from '../../shared/home-discovery';
import { HomeHeroBannerSection } from './HomeHeroBannerSection';
import { HomePromoSection } from './HomePromoSection';
import { HomeFilterRailSection } from './HomeFilterRailSection';
import { HomeCategorySection } from './HomeCategorySection';
import { HomeStoreFeedSection } from './HomeStoreFeedSection';

type Props = {
  state: HomeDiscoveryState;
  activeFilter: DiscoveryFilterKind;
  onFilterChange: (kind: DiscoveryFilterKind) => void;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onRetry?: (() => void) | undefined;
};

export function HomeDiscoveryShell({ state, activeFilter, onFilterChange, onStorePress, onRetry }: Props) {
  const isRtl = I18nManager.isRTL;

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

  const filteredStores = applyDiscoveryFilter(stores, activeFilter);

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
          <HomePromoSection promos={promos} />
        )}
        <HomeFilterRailSection
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
        {categories.length > 0 && (
          <HomeCategorySection categories={categories} />
        )}
        <HomeStoreFeedSection
          stores={filteredStores}
          activeFilter={activeFilter}
          onStorePress={onStorePress}
        />
      </ScrollView>
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
});
