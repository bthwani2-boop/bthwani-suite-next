import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { ProductCard, colorRoles } from "@bthwani/ui-kit";
import type { DshStoreDetailViewModel } from "../../shared/store";
import type {
  CatalogCategory,
  CatalogProduct,
} from "../../shared/catalog/client-catalog.types";
import type { CatalogMedia } from "../../shared/catalog/catalog.types";
import type { DshFulfillmentDeliveryMode } from "../../shared/delivery/delivery.contract";
import { StoreDetailHeroSection } from "./StoreDetailHeroSection";
import { StoreDetailInfoCard } from "./StoreDetailInfoCard";
import { StoreDetailCarousel } from "./StoreDetailCarousel";
import { StoreDetailCategoryRail } from "./StoreDetailCategoryRail";
import { StoreMeasurementSheet } from "./StoreMeasurementSheet";

const CARD_HEIGHT = 126;
const CARD_GAP = 2;
const SNAP_INTERVAL = CARD_HEIGHT + CARD_GAP;
const FALLBACK_FULFILLMENT_MODE: DshFulfillmentDeliveryMode = "pickup";

type Props = Readonly<{
  store: DshStoreDetailViewModel;
  categories: readonly CatalogCategory[];
  products: readonly CatalogProduct[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (
    product: CatalogProduct,
    quantity: number,
    mode: DshFulfillmentDeliveryMode,
  ) => Promise<boolean>;
  cartActionError?: string | null;
  onBack?: (() => void) | undefined;
  onGoToCart?: (() => void) | undefined;
}>;

function canOrderProduct(product: CatalogProduct): boolean {
  return product.isActive && product.stockStatus !== "out_of_stock";
}

function toProductCardPrice(priceReference: string) {
  const numeric = Number(priceReference);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return { value: numeric, currency: "د.ي" } as const;
  }
  return {
    label: priceReference.trim() || "يُثبت السعر عند الإضافة",
  } as const;
}

export function StoreDetailShell({
  store,
  categories,
  products,
  favoriteIds,
  onToggleFavorite,
  onAddToCart,
  cartActionError,
  onBack,
  onGoToCart,
}: Props) {
  const isRTL = I18nManager.isRTL;
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedMode, setSelectedMode] = useState<DshFulfillmentDeliveryMode>(
    () => store.availableFulfillmentModes[0] ?? FALLBACK_FULFILLMENT_MODE,
  );
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const changeCategory = useCallback(
    (id: string) => {
      if (id === selectedCategoryId) return;
      setSelectedCategoryId(id);
      if (Platform.OS !== "web") Vibration.vibrate(8);
    },
    [selectedCategoryId],
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "all") return [...products];
    if (selectedCategoryId === "favorites") {
      return products.filter((product) => favoriteIds.has(product.id));
    }
    if (selectedCategoryId === "popular") {
      return products.filter((product) => product.isActive);
    }
    return products.filter((product) => product.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId, favoriteIds]);

  const closeProduct = useCallback(() => {
    if (isSubmitting) return;
    setSelectedProduct(null);
    setIsAddedToCart(false);
    setMutationError(null);
  }, [isSubmitting]);

  const handleOpenProduct = useCallback((product: CatalogProduct) => {
    if (!canOrderProduct(product)) return;
    setSelectedProduct(product);
    setQuantity(1);
    setIsAddedToCart(false);
    setMutationError(null);
  }, []);

  const bannerItems = useMemo(
    () =>
      products
        .filter(canOrderProduct)
        .slice(0, 12)
        .map((product) => {
          const media = product.media.find(
            (item: CatalogMedia) =>
              item.state === "complete" && item.publicUrl != null,
          );
          return {
            id: product.id,
            title: product.name,
            subtitle: product.description,
            badge:
              categories.find((category) => category.id === product.categoryId)
                ?.name ?? "عام",
            image: media?.publicUrl ? { uri: media.publicUrl } : null,
            cta: "عرض المنتج",
            onPress: () => handleOpenProduct(product),
          };
        }),
    [products, categories, handleOpenProduct],
  );

  const handleAddToCartConfirm = useCallback(async () => {
    if (!selectedProduct || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);
    const accepted = await onAddToCart(
      selectedProduct,
      quantity,
      selectedMode,
    );
    setIsSubmitting(false);
    if (accepted) {
      setIsAddedToCart(true);
    } else {
      setMutationError(
        cartActionError ?? "لم يقبل DSH إضافة المنتج. أعد المحاولة بعد التحقق من تسجيل الدخول والتوافر.",
      );
    }
  }, [
    selectedProduct,
    isSubmitting,
    onAddToCart,
    quantity,
    selectedMode,
    cartActionError,
  ]);

  const listHeader = useMemo(
    () => (
      <>
        <StoreDetailHeroSection
          store={store}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          onCartPress={onGoToCart}
          onBack={onBack}
          scrollY={scrollY}
        />
        <StoreDetailInfoCard isRTL={isRTL} />
        {bannerItems.length > 0 ? (
          <StoreDetailCarousel bannerItems={bannerItems} />
        ) : null}
        <StoreDetailCategoryRail
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={changeCategory}
          favoriteIds={favoriteIds}
        />
      </>
    ),
    [
      store,
      selectedMode,
      onGoToCart,
      onBack,
      scrollY,
      isRTL,
      bannerItems,
      categories,
      selectedCategoryId,
      favoriteIds,
      changeCategory,
    ],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CatalogProduct; index: number }) => {
      const inputRange = [
        (index - 1) * SNAP_INTERVAL,
        index * SNAP_INTERVAL,
        (index + 1) * SNAP_INTERVAL,
      ];
      const scale = scrollY.interpolate({
        inputRange,
        outputRange: [0.986, 1, 0.986],
        extrapolate: "clamp",
      });
      const translateY = scrollY.interpolate({
        inputRange,
        outputRange: [8, 0, 8],
        extrapolate: "clamp",
      });
      const opacity = scrollY.interpolate({
        inputRange,
        outputRange: [0.9, 1, 0.9],
        extrapolate: "clamp",
      });
      const media = item.media.find(
        (entry: CatalogMedia) =>
          entry.state === "complete" && entry.publicUrl != null,
      );
      const imageSource = media?.publicUrl ? { uri: media.publicUrl } : null;
      const orderable = canOrderProduct(item);

      return (
        <Animated.View
          style={{
            transform: [{ scale }, { translateY }],
            opacity,
            marginBottom: CARD_GAP,
            marginHorizontal: 12,
          }}
          pointerEvents="box-none"
        >
          <ProductCard
            id={item.id}
            title={item.name}
            subtitle={
              orderable
                ? item.description
                : `${item.description ? `${item.description} · ` : ""}غير متوفر حاليًا`
            }
            imageSource={imageSource}
            categoryLabel={
              categories.find((category) => category.id === item.categoryId)?.name ??
              "عام"
            }
            price={toProductCardPrice(item.priceReference)}
            isFavorited={favoriteIds.has(item.id)}
            onFavorite={() => onToggleFavorite(item.id)}
            {...(orderable
              ? {
                  onAdd: () => handleOpenProduct(item),
                  onImagePress: () => handleOpenProduct(item),
                }
              : {})}
          />
        </Animated.View>
      );
    },
    [categories, favoriteIds, onToggleFavorite, scrollY, handleOpenProduct],
  );

  return (
    <View style={styles.screen}>
      <Animated.FlatList<CatalogProduct>
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedEmoji}>🍽️</Text>
            <Text style={styles.emptyFeedTitle}>لا توجد منتجات في هذا القسم</Text>
            <Text style={styles.emptyFeedText}>
              جرّب اختيار قسم آخر من القائمة أعلاه
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.contentContainer}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== "web"}
      />

      <StoreMeasurementSheet
        product={selectedProduct}
        quantity={quantity}
        setQuantity={setQuantity}
        isAddedToCart={isAddedToCart}
        isSubmitting={isSubmitting}
        errorMessage={mutationError ?? cartActionError}
        onAddToCart={() => void handleAddToCartConfirm()}
        onGoToCart={() => {
          setSelectedProduct(null);
          onGoToCart?.();
        }}
        onClose={closeProduct}
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
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
    color: colorRoles.brandStructure,
    textAlign: "center",
    marginBottom: 4,
  },
  emptyFeedText: {
    fontSize: 13,
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
});
