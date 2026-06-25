import React, { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingState, ScrollScreen, StateView, Text, colorRoles, alpha } from "@bthwani/ui-kit";
import {
  BannerCarousel,
  type BannerCarouselItem,
  FilterRail,
  type FilterRailItem,
  FloatingActionCircle,
  HeroCover,
  MetricChip,
  ProductCard,
  ServiceModeSegment,
  StatusBadge,
  SearchIcon,
  CartIcon,
  ShareIcon,
} from "../shared/ui";
import { usePublishedCatalogController } from "../../shared/catalog";
import { useStoreDetailController } from "../../shared/store";
import type { CatalogCategory, CatalogProduct } from "../../shared/catalog/catalog.types";

type PublishedCatalogScreenProps = {
  readonly storeId: string;
  readonly onBack?: () => void;
};

export function PublishedCatalogScreen({ storeId, onBack }: PublishedCatalogScreenProps) {
  const storeCtrl = useStoreDetailController(storeId);
  const catalogCtrl = usePublishedCatalogController(storeId);
  const insets = useSafeAreaInsets();

  const [selectedServiceMode, setSelectedServiceMode] = useState<string>("delivery");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const handleRetry = React.useCallback(() => {
    storeCtrl.retry();
    catalogCtrl.retry();
  }, [storeCtrl, catalogCtrl]);

  // Loading States
  if (storeCtrl.state.kind === "loading" || catalogCtrl.state.kind === "loading") {
    return <LoadingState title="جاري تحميل واجهة المتجر…" />;
  }

  // Error States
  if (storeCtrl.state.kind === "error" || storeCtrl.state.kind === "service_unavailable") {
    const errorMsg = storeCtrl.state.kind === "error" ? storeCtrl.state.message : "تعذر الوصول إلى الخادم.";
    return (
      <StateView
        title="عذراً، فشل تحميل المتجر"
        description={errorMsg}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  if (catalogCtrl.state.kind === "error" || catalogCtrl.state.kind === "permission_denied") {
    const errorMsg = catalogCtrl.state.kind === "error" ? catalogCtrl.state.message : "ليس لديك الصلاحيات لعرض كتالوج هذا المتجر.";
    return (
      <StateView
        title="عذراً، فشل تحميل المنتجات"
        description={errorMsg}
        actionLabel="إعادة المحاولة"
        onActionPress={handleRetry}
      />
    );
  }

  // Type narrowing for typescript
  if (storeCtrl.state.kind !== "success" || catalogCtrl.state.kind !== "success") {
    return null;
  }

  const store = storeCtrl.state.store;
  const isStoreOpen = store.isOpen;

  // Catalog categories & products mapping
  const catalog = catalogCtrl.state.catalog;
  const categories = catalog?.categories.filter((c: CatalogCategory) => c.isActive) || [];
  const products = catalog?.products.filter((p: CatalogProduct) => p.isActive) || [];

  // Filter Rail categories
  const filterRailItems: readonly FilterRailItem[] = [
    {
      id: "all",
      label: "جميع الأقسام",
      icon: (
        <Text style={{ fontSize: 13, color: selectedCategoryId === "all" ? colorRoles.textInverse : colorRoles.brandAction }}>
          ≡
        </Text>
      ),
    },
    {
      id: "popular",
      label: "الأكثر طلباً",
      icon: <Text style={{ fontSize: 13 }}>🔥</Text>,
    },
    {
      id: "favorites",
      label: "المفضلة",
      icon: <Text style={{ fontSize: 13 }}>🤍</Text>,
    },
    ...categories.map((c: CatalogCategory) => ({ id: c.id, label: c.name })),
  ];

  // Filter products by selected category
  const filteredProducts = products.filter((p: CatalogProduct) => {
    if (selectedCategoryId === "all") return true;
    if (selectedCategoryId === "favorites") {
      return storeCtrl.favoriteIds.has(p.id);
    }
    if (selectedCategoryId === "popular") {
      return p.isActive;
    }
    return p.categoryId === selectedCategoryId;
  });

  // Construct promo BannerCarousel items from catalog products or defaults
  const bannerCarouselItems: readonly BannerCarouselItem[] = products
    .slice(0, 3)
    .map((p: CatalogProduct) => {
      const firstMedia = p.media && p.media.length > 0 ? p.media[0] : null;
      return {
        id: p.id,
        title: p.name,
        subtitle: p.description,
        badge: categories.find((c: CatalogCategory) => c.id === p.categoryId)?.name || "عام",
        image: (firstMedia && firstMedia.publicUrl) ? { uri: firstMedia.publicUrl } : null,
        cta: "تفاصيل",
        onPress: () => {
          Alert.alert("معاينة المنتج", p.name);
        },
      };
    });

  return (
    <View style={styles.root}>
      {/* Parallax Hero Area */}
      <View style={styles.heroWrapper}>
        <HeroCover coverImage={store.heroImageSource} />

        {/* Floating Top Header Toolbar */}
        <View style={[styles.floatingHeader, { top: Math.max(insets.top, 16) }]}>
          <View style={styles.floatingHeaderLeft}>
            <FloatingActionCircle
              icon={<SearchIcon color={colorRoles.brandStructure} />}
              accessibilityLabel="بحث"
              onPress={() => Alert.alert("بحث", "البحث متوفر قريباً داخل المتجر.")}
            />
            <FloatingActionCircle
              icon={<CartIcon color={colorRoles.brandStructure} />}
              accessibilityLabel="عربة التسوق"
              onPress={() => Alert.alert("العربة", "عربة التسوق ستتوفر قريباً.")}
            />
            <FloatingActionCircle
              icon={<ShareIcon color={colorRoles.brandStructure} />}
              accessibilityLabel="مشاركة"
              onPress={() => Alert.alert("مشاركة", `مشاركة متجر ${store.displayName}`)}
            />
          </View>
        </View>
      </View>

      <ScrollScreen>
        <View style={styles.contentWrap}>
          {/* Overlapping Rounded Store Info Card */}
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              {store.logoImageSource ? (
                <View style={styles.logoContainer}>
                  <Image source={store.logoImageSource} style={styles.logoImage} />
                </View>
              ) : null}

              <View style={styles.nameContainer}>
                <Text role="titleMd" weight="900" style={styles.storeName}>
                  {store.displayName}
                </Text>
                <Text role="bodySm" tone="secondary" style={styles.storeLocation}>
                  📍 {store.locationLabel}
                </Text>
              </View>
            </View>

            {/* Status indicators */}
            <View style={styles.statusRow}>
              <StatusBadge
                label={isStoreOpen ? "مفتوح الآن" : "مغلق الآن"}
                type={isStoreOpen ? "success" : "danger"}
              />
              <StatusBadge label="+967-1-444333" type="brand" />
            </View>

            {/* Service Delivery Modes */}
            <ServiceModeSegment
              options={[
                { id: "delivery", label: "توصيل بثواني", icon: <Text style={{ fontSize: 13 }}>🚲</Text> },
                { id: "pickup", label: "استلام", icon: <Text style={{ fontSize: 13 }}>🏪</Text> },
              ]}
              selectedId={selectedServiceMode}
              onChange={setSelectedServiceMode}
            />

            {/* Metrics Chips Row */}
            <View style={styles.metricsRow}>
              {store.distanceLabel ? (
                <MetricChip label={store.distanceLabel} />
              ) : null}
              {store.etaLabel ? (
                <MetricChip label={store.etaLabel} />
              ) : null}
              {store.ratingLabel ? (
                <MetricChip label={`⭐️ ${store.ratingLabel}`} />
              ) : null}
            </View>
          </View>

          {/* Opening hours & store summary Single Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.infoIcon}>🕒</Text>
              </View>
              <Text role="bodySm" tone="secondary" style={styles.infoText}>
                أوقات العمل: 08:00 - 23:00
              </Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colorRoles.borderSubtle, paddingTop: 10, marginTop: 10 }]}>
              <View style={styles.iconContainer}>
                <Text style={styles.infoIcon}>🛍️</Text>
              </View>
              <Text role="bodySm" tone="secondary" style={styles.infoText}>
                ملخص المتجر: أكثر من ١,٢٠٠ من المواد الغذائية الطازجة والاحتياجات اليومية
              </Text>
            </View>
          </View>

          {/* Promotions Banner Carousel */}
          {bannerCarouselItems.length > 0 ? (
            <View style={styles.carouselSection}>
              <BannerCarousel banners={bannerCarouselItems} variant="secondary" />
            </View>
          ) : null}

          {/* Categories Title */}
          <View style={styles.sectionHeader}>
            <Text role="titleSm" weight="900" style={styles.sectionTitle}>
              قائمة الأصناف
            </Text>
          </View>

          {/* Filter Rail categories */}
          {filterRailItems.length > 1 ? (
            <FilterRail
              items={filterRailItems}
              selectedId={selectedCategoryId}
              onChange={setSelectedCategoryId}
            />
          ) : null}

          {/* Product Feed Grid */}
          <View style={styles.productsGrid}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p: CatalogProduct) => {
                const firstMedia = p.media[0];
                const imageSource = (firstMedia && firstMedia.publicUrl)
                  ? { uri: firstMedia.publicUrl }
                  : null;
                const isFav = storeCtrl.favoriteIds.has(p.id);

                return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    title={p.name}
                    subtitle={p.description}
                    unitLabel={p.unitLabel}
                    imageSource={imageSource}
                    categoryLabel={categories.find((c: CatalogCategory) => c.id === p.categoryId)?.name || "عام"}
                    price={{ value: parseFloat(p.priceReference || "0"), currency: "ر.ي" }}
                    originalPrice={
                      p.originalPriceReference
                        ? parseFloat(p.originalPriceReference)
                        : undefined
                    }
                    discountPercent={p.discountPercent}
                    stockStatus={p.stockStatus}
                    isFavorited={isFav}
                    onFavorite={() => storeCtrl.toggleFavorite(p.id)}
                    onAdd={() => Alert.alert("السلة", `تمت إضافة ${p.name} بنجاح.`)}
                    onImagePress={() => Alert.alert("معاينة", p.name)}
                  />
                );
              })
            ) : (
              <View style={styles.emptyProducts}>
                <Text role="body" tone="secondary" style={styles.emptyText}>
                  🍽️ لا توجد منتجات متوفرة حالياً في هذا القسم.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  heroWrapper: {
    height: 260,
    width: "100%",
    position: "relative",
  },
  floatingHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  floatingHeaderLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerIconText: {
    fontSize: 16,
    color: colorRoles.brandStructure,
  },
  contentWrap: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colorRoles.surfaceWarm,
    paddingBottom: 40,
  },
  identityCard: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  identityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colorRoles.brandAction,
    overflow: "hidden",
    backgroundColor: colorRoles.surfaceBase,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  nameContainer: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  storeName: {
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  storeLocation: {
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  metricsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  infoBox: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  infoText: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: colorRoles.textSecondary,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: alpha(colorRoles.brandStructure, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 13,
  },
  carouselSection: {
    marginTop: 16,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  productsGrid: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  emptyProducts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
  },
});
