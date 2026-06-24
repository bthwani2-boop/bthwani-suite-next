import React, { memo, type ReactNode } from "react";
import { Image, YStack } from "tamagui";
import { colorRoles } from "../../tokens/colors";
import { Surface, SurfaceProps } from "../Surface";
import { Text } from "../Text";
import { Inline } from "../_shared";
import { asUiComponent } from "../../internal/tamagui-compat";

const FlexYStack = asUiComponent(YStack);

export type CardProps = SurfaceProps & {
  interactive?: boolean;
};

export function Card({ interactive = false, ...props }: CardProps) {
  return (
    <Surface
      tone="raised"
      {...(interactive
        ? {
            hoverStyle: { borderColor: "$action", y: -1 },
            pressStyle: { opacity: 0.92, y: 0 }
          }
        : {})}
      {...props}
    />
  );
}

// ─── INFO CARD ───
export type InfoCardProps = {
  readonly icon?: ReactNode;
  readonly title: string;
};

export function InfoCard({ icon, title }: InfoCardProps) {
  return (
    <Card padding="$3">
      <Inline gap="$3" width="100%">
        {icon}
        <Text role="body" style={styles.infoText}>{title}</Text>
      </Inline>
    </Card>
  );
}

// ─── PRODUCT CARD ───
export type ProductCardPrice = {
  readonly value?: number;
  readonly label?: string;
  readonly currency?: string;
};

export type ProductCardProps = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly imageSource?: { uri: string } | number | null;
  readonly categoryLabel?: string;
  readonly preparationTime?: string;
  readonly price?: ProductCardPrice;
  readonly oldPrice?: ProductCardPrice;
  readonly isFavorited?: boolean;
  readonly onAdd?: () => void;
  readonly onFavorite?: () => void;
  readonly onImagePress?: () => void;
};

export const ProductCard = memo(function ProductCard({
  title,
  imageSource,
  categoryLabel,
  price,
  isFavorited,
  onAdd,
  onFavorite,
  onImagePress,
}: ProductCardProps) {
  const priceStr = price?.label ?? (price?.value != null ? `${price.value} ${price.currency ?? "ر.ي"}` : "");

  return (
    <Card style={styles.productCard}>
      {/* Product Image Zone (Right Side) */}
      <FlexYStack onPress={onImagePress} pressStyle={{ opacity: 0.95 }} style={styles.productImageWrap}>
        {imageSource ? (
          <Image source={imageSource} style={styles.productImage} />
        ) : (
          <YStack style={styles.productImagePlaceholder} />
        )}

        {onFavorite ? (
          <FlexYStack
            onPress={onFavorite}
            pressStyle={{ opacity: 0.8 }}
            style={styles.productFavoriteButton}
          >
            <Text role="body" style={styles.heartIcon}>
              {isFavorited ? "❤️" : "🤍"}
            </Text>
          </FlexYStack>
        ) : null}
      </FlexYStack>

      {/* Product Details (Left Side) */}
      <YStack style={styles.productBody}>
        <Text role="bodyStrong" style={styles.productTitle} numberOfLines={1}>
          {title}
        </Text>

        <Text role="body" style={styles.productPrice}>
          {priceStr}
        </Text>

        <YStack style={styles.productBottomRow}>
          {categoryLabel ? (
            <YStack style={styles.productMetaBadge}>
              <Text role="caption" style={styles.productCategoryText}>
                {categoryLabel}
              </Text>
            </YStack>
          ) : null}
        </YStack>

        {onAdd ? (
          <FlexYStack
            onPress={onAdd}
            pressStyle={{ opacity: 0.8 }}
            style={styles.productAddButton}
          >
            <Text style={styles.cartBtnIcon}>🛒</Text>
          </FlexYStack>
        ) : null}
      </YStack>
    </Card>
  );
});

const styles = {
  infoText: {
    flex: 1,
    textAlign: "right",
  },
  productCard: {
    width: "100%",
    height: 112,
    borderRadius: 18,
    flexDirection: "row-reverse",
    alignItems: "stretch",
    overflow: "hidden",
    padding: 0,
    gap: 0,
  },
  productImageWrap: {
    width: 112,
    height: "100%",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colorRoles.surfaceMuted,
  },
  productFavoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colorRoles.surfaceBase,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  heartIcon: {
    fontSize: 13,
  },
  productBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
    alignItems: "flex-end",
    position: "relative",
  },
  productTitle: {
    color: colorRoles.textPrimary,
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    textAlign: "right",
  },
  productPrice: {
    color: colorRoles.textPrimary,
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    textAlign: "right",
    marginTop: 4,
  },
  productBottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 6,
  },
  productMetaBadge: {
    backgroundColor: colorRoles.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  productCategoryText: {
    fontSize: 10,
    color: colorRoles.textSecondary,
  },
  productAddButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 36,
    height: 36,
    backgroundColor: colorRoles.brandAction,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnIcon: {
    color: colorRoles.textInverse,
    fontSize: 14,
  },
} as const;
