import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, Button, Surface, Text, alpha, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { DshCart, DshCartItem, DshCartItemValidation, DshFulfillmentMode } from "../../shared/cart";
import { formatWltMoney } from "@bthwani/wlt/dsh";

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

function validationMessage(validation: DshCartItemValidation): string {
  switch (validation.status) {
    case "price_changed":
      return "تغير سعر المنتج. يرجى اعتماد السعر الجديد للمتابعة.";
    case "unavailable":
      return "هذا المنتج غير متوفر حالياً في المتجر.";
    case "assortment_unavailable":
      return "لم يعد هذا المنتج متوفراً.";
    case "assortment_changed":
      return "تم تحديث بيانات هذا المنتج في المتجر.";
    case "unpriced":
      return "السعر غير محدد حالياً لهذا المنتج.";
    case "product_unlinked":
      return "المنتج غير متوفر حالياً.";
    case "ready":
      return "";
  }
}

function CartItemValidationNotice({
  validation,
  disabled,
  onAcceptCurrentPrice,
}: {
  readonly validation: DshCartItemValidation | undefined;
  readonly disabled: boolean;
  readonly onAcceptCurrentPrice: () => void;
}) {
  if (!validation || validation.status === "ready") return null;
  return (
    <View style={styles.validationBox}>
      <Text role="caption" style={styles.errorText}>{validationMessage(validation)}</Text>
      {validation.status === "price_changed" && validation.currentUnitPriceMinorUnits !== undefined ? (
        <>
          <Text role="caption" style={styles.mutedText}>
            السعر الحالي: {formatWltMoney(validation.currentUnitPriceMinorUnits, validation.currentCurrency ?? validation.snapshotCurrency)}
          </Text>
          <Button
            label="اعتماد السعر الحالي"
            tone="secondary"
            size="sm"
            disabled={disabled}
            onPress={onAcceptCurrentPrice}
          />
        </>
      ) : null}
    </View>
  );
}

export function CartItemsSection({
  cart,
  validationByItemId,
  actionPending,
  actionError,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: {
  readonly cart: DshCart;
  readonly validationByItemId: ReadonlyMap<string, DshCartItemValidation>;
  readonly actionPending: boolean;
  readonly actionError: string | null;
  readonly onUpdateQuantity: (
    masterProductId: string,
    productName: string,
    quantity: number,
    priceReference?: string | undefined,
    options?: readonly string[] | undefined,
    note?: string | undefined,
  ) => void;
  readonly onRemoveItem: (cartId: string, itemId: string) => void;
  readonly onClearCart: (cart: DshCart) => void;
}) {
  return (
    <Surface tone="default" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text role="bodyStrong" style={styles.sectionTitle}>المنتجات</Text>
        <Badge label={fulfillmentLabel(cart.fulfillmentMode)} tone="info" />
      </View>

      {cart.items.map((item: DshCartItem) => {
        const validation = validationByItemId.get(item.id);
        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemText}>
              <Text role="bodyStrong" style={styles.itemTitle}>{item.productName}</Text>
              <Text role="caption" style={styles.priceText}>
                سعر الوحدة المثبت: {formatWltMoney(item.unitPriceMinorUnits, item.currency)}
              </Text>
              {item.options && item.options.length > 0 ? (
                <Text role="caption" style={styles.mutedText}>
                  الخيارات: {item.options.join("، ")}
                </Text>
              ) : null}
              {item.note ? (
                <Text role="caption" style={styles.mutedText}>
                  ملاحظة: {item.note}
                </Text>
              ) : null}
              <Text role="caption" style={styles.mutedText}>الكمية الحالية: {item.quantity}</Text>
            </View>
            <CartItemValidationNotice
              validation={validation}
              disabled={actionPending}
              onAcceptCurrentPrice={() => onUpdateQuantity(
                item.masterProductId,
                item.productName,
                item.quantity,
                item.priceReference,
                item.options,
                item.note,
              )}
            />
            <View style={styles.itemActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`زيادة كمية ${item.productName}`}
                disabled={actionPending}
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(
                  item.masterProductId,
                  item.productName,
                  item.quantity + 1,
                  item.priceReference,
                  item.options,
                  item.note,
                )}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`تقليل كمية ${item.productName}`}
                disabled={actionPending}
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(
                  item.masterProductId,
                  item.productName,
                  item.quantity - 1,
                  item.priceReference,
                  item.options,
                  item.note,
                )}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>
              <Button
                label="حذف"
                tone="secondary"
                size="sm"
                disabled={actionPending}
                onPress={() => onRemoveItem(item.cartId, item.id)}
              />
            </View>
          </View>
        );
      })}

      <Button
        label="إفراغ السلة"
        tone="secondary"
        disabled={actionPending}
        onPress={() => onClearCart(cart)}
      />
      {actionError ? (
        <Text role="caption" style={styles.errorText}>
          {actionError}
        </Text>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 13, fontWeight: "bold" },
  itemCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.sm,
    padding: 8,
    gap: 6,
    backgroundColor: alpha(colorRoles.surfaceWarm, 0.4),
  },
  itemText: { alignItems: "flex-end", gap: 2 },
  itemTitle: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 13, fontWeight: "bold" },
  priceText: { color: colorRoles.brandAction, textAlign: "right", fontSize: 12, fontWeight: "600" },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", fontSize: 11, lineHeight: 15 },
  validationBox: {
    gap: 4,
    padding: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: alpha(colorRoles.danger, 0.05),
  },
  itemActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  quantityButtonText: { color: colorRoles.brandStructure, fontSize: 16, fontWeight: "900" },
  errorText: { color: colorRoles.danger, textAlign: "right", fontSize: 11, lineHeight: 15 },
});
