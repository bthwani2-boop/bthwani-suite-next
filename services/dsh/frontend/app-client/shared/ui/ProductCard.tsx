import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

type Props = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly imageSource?: ImageSourcePropType | null;
  readonly categoryLabel?: string;
  readonly price: { readonly value: number; readonly currency: string };
  readonly isFavorited?: boolean;
  readonly onFavorite?: () => void;
  readonly onAdd?: () => void;
  readonly onImagePress?: () => void;
};

export function ProductCard({
  title,
  subtitle,
  imageSource,
  categoryLabel,
  price,
  isFavorited,
  onFavorite,
  onAdd,
  onImagePress,
}: Props) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onImagePress} style={styles.imageArea}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <Pressable onPress={onFavorite} style={styles.favoriteBtn}>
          <Text style={styles.favoriteIcon}>{isFavorited ? "❤️" : "🤍"}</Text>
        </Pressable>
      </Pressable>

      <View style={styles.info}>
        {categoryLabel ? (
          <Text style={styles.category} numberOfLines={1}>{categoryLabel}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.price}>
            {price.value.toFixed(0)} {price.currency}
          </Text>
          <Pressable onPress={onAdd} style={styles.addBtn}>
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
  },
  imageArea: {
    height: 140,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: colorRoles.surfaceMuted,
  },
  favoriteBtn: {
    position: "absolute",
    top: spacing[2],
    left: spacing[2],
    width: 32,
    height: 32,
    borderRadius: radius.round,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: 14,
  },
  info: {
    padding: spacing[3],
    gap: spacing[1],
  },
  category: {
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.brandAction,
    textAlign: "right",
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 11,
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[1],
  },
  price: {
    fontSize: 14,
    fontWeight: "900",
    color: colorRoles.brandStructure,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.round,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    color: colorRoles.textInverse,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
});
