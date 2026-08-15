import React from "react";
import { StyleSheet, View, Image } from "react-native";
import {
  Badge,
  Surface,
  Text,
  alpha,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import type { DshFulfillmentMode } from "../../shared/cart";
import type { DshStoreDetailViewModel } from "../../shared/store";

function fulfillmentLabel(mode: DshFulfillmentMode): string {
  switch (mode) {
    case "bthwani_delivery":
      return "توصيل بثواني";
    case "partner_delivery":
      return "توصيل المتجر";
    case "pickup":
      return "استلام ذاتي";
  }
}

export function StoreConfirmationHero({
  itemCount,
  fulfillmentMode,
  ready,
  store,
}: {
  readonly itemCount: number;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly ready: boolean;
  readonly store: DshStoreDetailViewModel | null;
}) {
  return (
    <Surface tone="default" style={styles.storeHero}>
      {store?.heroImageSource ? (
        <Image source={store.heroImageSource} style={styles.storeHeroBg} />
      ) : null}
      <View style={styles.storeHeroOverlay}>
        <View style={styles.storeHeroHeader}>
          {store?.logoImageSource ? (
            <Image source={store.logoImageSource} style={styles.storeLogo} />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Text style={{ fontSize: 20 }}>{store?.placeholderEmoji ?? "🏪"}</Text>
            </View>
          )}
          <View style={styles.storeHeroInfo}>
            <Text role="bodyStrong" style={styles.storeHeroTitle}>
              {store?.displayName ?? "تأكيد الطلب"}
            </Text>
            <Text role="caption" style={styles.storeHeroSubtitle}>
              {itemCount} منتج · {fulfillmentLabel(fulfillmentMode)}
            </Text>
          </View>
          {!ready ? (
            <Badge label="تحتاج مراجعة" tone="warning" />
          ) : (
            <Badge label="جاهز للتأكيد" tone="success" />
          )}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  storeHero: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colorRoles.surfaceWarm,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  storeHeroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    opacity: 0.15,
  },
  storeHeroOverlay: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  storeHeroHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
  storeLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  storeLogoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: alpha(colorRoles.brandAction, 0.1),
    alignItems: "center",
    justifyContent: "center",
  },
  storeHeroInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  storeHeroTitle: {
    color: colorRoles.brandStructure,
    fontWeight: "800",
  },
  storeHeroSubtitle: {
    color: colorRoles.textSecondary,
    marginTop: 1,
  },
});
