import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { colorRoles, spacing, radius, colorPalette } from "@bthwani/ui-kit";

type Props = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly unitLabel?: string | undefined;
  readonly imageSource?: ImageSourcePropType | null | undefined;
  readonly categoryLabel?: string | undefined;
  readonly price: { readonly value: number; readonly currency: string };
  readonly originalPrice?: number | undefined;
  readonly discountPercent?: number | undefined;
  readonly stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | undefined;
  readonly isFavorited?: boolean | undefined;
  readonly onFavorite?: (() => void) | undefined;
  readonly onAdd?: (() => void) | undefined;
  readonly onImagePress?: (() => void) | undefined;
};

function DiscountBadge({ percent }: { readonly percent: number }) {
  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountBadgeText}>{percent}%-</Text>
    </View>
  );
}

function StockLabel({ status }: { readonly status: "in_stock" | "low_stock" | "out_of_stock" }) {
  if (status === "in_stock") return null;
  const isOut = status === "out_of_stock";
  return (
    <View style={[styles.stockLabel, isOut ? styles.stockLabelOut : styles.stockLabelLow]}>
      <Text style={styles.stockLabelText}>
        {isOut ? "نفد المخزون" : "كمية محدودة"}
      </Text>
    </View>
  );
}

export function ProductCard({
  title,
  subtitle,
  unitLabel,
  imageSource,
  categoryLabel,
  price,
  originalPrice,
  discountPercent,
  stockStatus = "in_stock",
  isFavorited,
  onFavorite,
  onAdd,
  onImagePress,
}: Props) {
  const isOutOfStock = stockStatus === "out_of_stock";
  const hasDiscount =
    discountPercent != null && discountPercent > 0 && originalPrice != null;

  return (
    <View style={styles.card}>
      {/* ── Image area (left side in RTL) ── */}
      <Pressable onPress={onImagePress} style={styles.imageArea}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}

        {/* Discount badge — top-left corner of image */}
        {hasDiscount && discountPercent != null ? (
          <DiscountBadge percent={discountPercent} />
        ) : null}

        {/* Favorite button — top-right corner of image */}
        <Pressable
          onPress={onFavorite}
          style={styles.favoriteBtn}
          hitSlop={8}
          accessibilityLabel={isFavorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          <Text style={styles.favoriteIcon}>{isFavorited ? "❤️" : "🤍"}</Text>
        </Pressable>
      </Pressable>

      {/* ── Info area (right side in RTL) ── */}
      <View style={styles.info}>
        {/* Category chip */}
        {categoryLabel ? (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
        ) : null}

        {/* Title + unit */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {unitLabel ? (
            <Text style={styles.unitLabel}>{unitLabel}</Text>
          ) : null}
        </View>

        {/* Subtitle/description */}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {/* Stock label */}
        {stockStatus !== "in_stock" ? (
          <StockLabel status={stockStatus} />
        ) : null}

        {/* Price row */}
        <View style={styles.footer}>
          <View style={styles.priceStack}>
            {/* Original price with strikethrough */}
            {hasDiscount && originalPrice != null ? (
              <Text style={styles.originalPrice}>
                {originalPrice.toFixed(0)} {price.currency}
              </Text>
            ) : null}
            <Text style={[styles.price, isOutOfStock && styles.priceDisabled]}>
              {price.value.toFixed(0)}{" "}
              <Text style={styles.priceCurrency}>{price.currency}</Text>
            </Text>
          </View>

          {/* Add to cart button */}
          <Pressable
            onPress={isOutOfStock ? undefined : onAdd}
            style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
            disabled={isOutOfStock}
            accessibilityLabel="إضافة للسلة"
            hitSlop={4}
          >
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    flexDirection: "row-reverse",   // RTL: info on right, image on left
    shadowColor: colorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Image ──────────────────────────────────────────
  imageArea: {
    width: 130,
    alignSelf: "stretch",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: colorRoles.surfaceMuted,
  },

  // ── Discount badge ────────────────────────────────
  discountBadge: {
    position: "absolute",
    bottom: spacing[2],
    left: spacing[2],
    backgroundColor: colorRoles.danger,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: colorPalette.white,
    fontSize: 11,
    fontWeight: "800",
  },

  // ── Favorite button ───────────────────────────────
  favoriteBtn: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 32,
    height: 32,
    borderRadius: radius.round,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colorPalette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  favoriteIcon: {
    fontSize: 14,
  },

  // ── Info ──────────────────────────────────────────
  info: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[1],
    alignItems: "flex-end",  // RTL: content aligns to right
  },

  // ── Category chip ─────────────────────────────────
  categoryChip: {
    backgroundColor: colorRoles.brandActionSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.brandAction,
    textAlign: "right",
  },

  // ── Title ─────────────────────────────────────────
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[1],
    flexWrap: "wrap",
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: colorRoles.textPrimary,
    textAlign: "right",
    flexShrink: 1,
  },
  unitLabel: {
    fontSize: 10,
    color: colorRoles.textSecondary,
    fontWeight: "600",
  },

  // ── Subtitle ──────────────────────────────────────
  subtitle: {
    fontSize: 11,
    color: colorRoles.textSecondary,
    textAlign: "right",
  },

  // ── Stock labels ──────────────────────────────────
  stockLabel: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  stockLabelOut: {
    backgroundColor: colorPalette.redSoft,
  },
  stockLabelLow: {
    backgroundColor: colorPalette.yellowSoft,
  },
  stockLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.textPrimary,
  },

  // ── Footer / Price row ────────────────────────────
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    width: "100%",
  },
  priceStack: {
    alignItems: "flex-end",
    gap: 1,
  },
  originalPrice: {
    fontSize: 11,
    color: colorRoles.textSecondary,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
    color: colorRoles.brandStructure,
  },
  priceCurrency: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceDisabled: {
    color: colorRoles.textSecondary,
  },

  // ── Add button ────────────────────────────────────
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colorRoles.brandAction,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnDisabled: {
    backgroundColor: colorRoles.borderSubtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: colorRoles.textInverse,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
    includeFontPadding: false,
  },
});
