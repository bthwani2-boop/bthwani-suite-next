import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { ProductCard, colorRoles } from '@bthwani/ui-kit';
import type { DshStoreDetailViewModel } from '../../shared/store';
import type { CatalogCategory, CatalogProduct, CatalogMedia } from '../../shared/catalog/catalog.types';
import { StoreDetailHeroSection } from './StoreDetailHeroSection';
import { StoreDetailInfoCard } from './StoreDetailInfoCard';
import { StoreDetailCarousel } from './StoreDetailCarousel';
import { StoreDetailCategoryRail } from './StoreDetailCategoryRail';

// Donor-exact card metrics for parallax snap
const CARD_HEIGHT = 126;
const CARD_GAP = 2;
const SNAP_INTERVAL = CARD_HEIGHT + CARD_GAP;

type Props = Readonly<{
  store: DshStoreDetailViewModel;
  categories: readonly CatalogCategory[];
  products: readonly CatalogProduct[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onBack?: (() => void) | undefined;
}>;

export function StoreDetailShell({
  store,
  categories,
  products,
  favoriteIds,
  onToggleFavorite,
  onBack,
}: Props) {
  const isRTL = I18nManager.isRTL;
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedMode, setSelectedMode] = useState('bthwani_delivery');

  const scrollY = useRef(new Animated.Value(0)).current;

  const changeCategory = useCallback((id: string) => {
    if (id === selectedCategoryId) return;
    setSelectedCategoryId(id);
    if (Platform.OS !== 'web') Vibration.vibrate(8);
  }, [selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return products;
    if (selectedCategoryId === 'favorites') return products.filter((p) => favoriteIds.has(p.id));
    if (selectedCategoryId === 'popular') return products.filter((p) => p.isActive);
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId, favoriteIds]);

  const bannerItems = useMemo(
    () =>
      products.slice(0, 12).map((p) => {
        const media = p.media.find(
          (m: CatalogMedia) => m.state === 'complete' && m.publicUrl != null,
        );
        return {
          id: p.id,
          title: p.name,
          subtitle: p.description,
          badge: categories.find((c) => c.id === p.categoryId)?.name ?? 'عام',
          image: media?.publicUrl ? { uri: media.publicUrl } : null,
          cta: 'تفاصيل',
          onPress: () => {},
        };
      }),
    [products, categories],
  );

  const listHeader = useMemo(
    () => (
      <>
        <StoreDetailHeroSection
          store={store}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          onBack={onBack}
          scrollY={scrollY}
        />
        <StoreDetailInfoCard isRTL={isRTL} />
        {bannerItems.length > 0 && <StoreDetailCarousel bannerItems={bannerItems} />}
        <StoreDetailCategoryRail
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={changeCategory}
          favoriteIds={favoriteIds}
        />
      </>
    ),
    [store, selectedMode, onBack, scrollY, isRTL, bannerItems, categories, selectedCategoryId, favoriteIds, changeCategory],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CatalogProduct; index: number }) => {
      const inputRange = [
        (index - 1) * SNAP_INTERVAL,
        index * SNAP_INTERVAL,
        (index + 1) * SNAP_INTERVAL,
      ];
      const scale = scrollY.interpolate({ inputRange, outputRange: [0.986, 1, 0.986], extrapolate: 'clamp' });
      const translateY = scrollY.interpolate({ inputRange, outputRange: [8, 0, 8], extrapolate: 'clamp' });
      const opacity = scrollY.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });

      const media = item.media.find(
        (m: CatalogMedia) => m.state === 'complete' && m.publicUrl != null,
      );
      const imageSource = media?.publicUrl ? { uri: media.publicUrl } : null;

      return (
        <Animated.View
          style={[
            {
              transform: [{ scale }, { translateY }],
              opacity,
              marginBottom: CARD_GAP,
              marginHorizontal: 12,
            },
          ]}
          pointerEvents="box-none"
        >
          <ProductCard
            id={item.id}
            title={item.name}
            subtitle={item.description}
            imageSource={imageSource}
            categoryLabel={categories.find((c) => c.id === item.categoryId)?.name ?? 'عام'}
            price={{ value: parseFloat(item.priceReference || '0'), currency: 'د.ي' }}
            isFavorited={favoriteIds.has(item.id)}
            onFavorite={() => onToggleFavorite(item.id)}
            onAdd={() => {}}
            onImagePress={() => {}}
          />
        </Animated.View>
      );
    },
    [categories, favoriteIds, onToggleFavorite, scrollY],
  );

  const emptyComponent = (
    <View style={styles.emptyFeed}>
      <Text style={styles.emptyFeedEmoji}>🍽️</Text>
      <Text style={styles.emptyFeedTitle}>لا توجد منتجات في هذا القسم</Text>
      <Text style={styles.emptyFeedText}>جرّب اختيار قسم آخر من القائمة أعلاه</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Animated.FlatList<CatalogProduct>
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        data={filteredProducts as CatalogProduct[]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        showsVerticalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.contentContainer}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  contentContainer: {
    paddingBottom: 60,
  },
  emptyFeed: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 20,
    backgroundColor: colorRoles.surfaceBase,
    marginHorizontal: 12,
  },
  emptyFeedEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colorRoles.brandStructure,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyFeedText: {
    fontSize: 13,
    color: colorRoles.textSecondary,
    textAlign: 'center',
  },
});
