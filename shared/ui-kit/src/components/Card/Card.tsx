import React, { memo, type ReactNode } from "react";
import { YStack, XStack, Image } from "tamagui";
import { colorRoles, colorPalette } from "../../tokens/colors";
import { Surface, SurfaceProps } from "../Surface";
import { Text } from "../Text";
import { Inline, Block } from "../_shared";
import { asUiComponent } from "../../internal/tamagui-compat";

const FlexYStack = asUiComponent(YStack);

export type CardProps = SurfaceProps & {
  interactive?: boolean | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  footer?: ReactNode | undefined;
};

export function Card({
  interactive = false,
  title,
  subtitle,
  footer,
  children,
  ...props
}: CardProps) {
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
    >
      <Block gap="$3" width="100%">
        {title || subtitle ? (
          <Block gap="$1">
            {title ? <Text role="bodyStrong">{title}</Text> : null}
            {subtitle ? <Text role="bodySm" tone="secondary">{subtitle}</Text> : null}
          </Block>
        ) : null}
        {children}
        {footer ? (
          <Block width="100%">
            {footer}
          </Block>
        ) : null}
      </Block>
    </Surface>
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
  const isNumericPrice = price?.value != null && !Number.isNaN(price.value);
  const priceStr = price?.label ?? (isNumericPrice ? `${price.value} ${price.currency ?? "د.ي"}` : "");

  return (
    <YStack style={styles.productCard}>
      {/* Product Details (Left Side in LTR) */}
      <YStack style={styles.productBody}>
        <Text role="bodyStrong" style={styles.productTitle} numberOfLines={1}>
          {title}
        </Text>

        {priceStr ? (
          <Text role="body" style={styles.productPrice}>
            {priceStr}
          </Text>
        ) : null}

        {categoryLabel ? (
          <YStack style={styles.productMetaBadge}>
            <Text role="caption" style={styles.productCategoryText}>
              {categoryLabel}
            </Text>
          </YStack>
        ) : null}
      </YStack>

      {/* Product Image Zone (Right Side in LTR) */}
      <FlexYStack onPress={onImagePress} pressStyle={{ opacity: 0.95 }} style={styles.productImageWrap}>
        {/* Inner container to clip the image to rounded corners */}
        <YStack style={styles.imageInnerContainer}>
          {imageSource ? (
            <Image source={imageSource} style={styles.productImage} />
          ) : (
            <YStack style={styles.productImagePlaceholder} />
          )}
        </YStack>

        {/* Favorite Heart Button (Top-Right of image zone, corner-hugging) */}
        {onFavorite ? (
          <FlexYStack
            onPress={onFavorite}
            pressStyle={{ opacity: 0.8 }}
            style={styles.productFavoriteButton}
          >
            <Text role="body" style={[styles.heartIcon, isFavorited && styles.heartIconActive]}>
              {isFavorited ? "♥" : "♡"}
            </Text>
          </FlexYStack>
        ) : null}
      </FlexYStack>

      {/* Add to Cart Button (Bottom-Left of entire card, corner-hugging) */}
      {onAdd ? (
        <FlexYStack
          onPress={onAdd}
          pressStyle={{ opacity: 0.8 }}
          style={styles.productAddButton}
        >
          <Text style={styles.cartBtnIcon}>🛒</Text>
          {/* Small white circular badge containing an orange plus sign in top-left */}
          <YStack style={styles.addPlusBadge}>
            <Text style={styles.addPlusText}>+</Text>
          </YStack>
        </FlexYStack>
      ) : null}
    </YStack>
  );
});

const styles = {
  infoText: {
    flex: 1,
    textAlign: "right",
  },
  productCard: {
    direction: "ltr", // Force details on left, image on right
    width: "100%",
    height: 130,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden", // Clip image and badges inside card container
    padding: 0, // Flush to edges
    gap: 0,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: "rgba(10, 47, 92, 0.08)",
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 10,
    position: "relative",
  },
  productBody: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "space-between", // Space items out vertically
    alignItems: "flex-end",
    position: "relative",
  },
  productTitle: {
    color: colorRoles.brandStructure,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    fontWeight: "800",
    textAlign: "right",
  },
  productPrice: {
    color: colorRoles.brandStructure,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    fontWeight: "900",
    textAlign: "right",
  },
  productMetaBadge: {
    backgroundColor: colorPalette.grayBorder,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  productCategoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: colorRoles.textSecondary,
  },
  productImageWrap: {
    width: 176, // Match target image width ratio
    height: "100%",
    position: "relative",
  },
  imageInnerContainer: {
    width: "100%",
    height: "100%",
    borderTopRightRadius: 24, // Match card corner radius
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    overflow: "hidden", // Clip image
    backgroundColor: colorPalette.tanBg, // Sand placeholder color
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colorPalette.tanBg,
  },
  productFavoriteButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderTopRightRadius: 24, // Hugs top-right card corner radius
    borderBottomLeftRadius: 24,
    backgroundColor: colorRoles.surfaceBase,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(10, 47, 92, 0.08)",
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  heartIcon: {
    fontSize: 18,
    color: colorRoles.brandAction,
  },
  heartIconActive: {
    color: colorRoles.brandAction,
  },
  productAddButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 44,
    height: 36,
    borderBottomLeftRadius: 24, // Hugs bottom-left card corner radius
    borderTopRightRadius: 24,
    backgroundColor: colorRoles.brandAction,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colorRoles.brandAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  cartBtnIcon: {
    color: colorRoles.textInverse,
    fontSize: 16,
  },
  addPlusBadge: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colorPalette.white,
    justifyContent: "center",
    alignItems: "center",
  },
  addPlusText: {
    color: colorRoles.brandAction,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
} as const;
