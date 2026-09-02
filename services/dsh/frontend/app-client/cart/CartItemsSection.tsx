import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, Button, Icon, Surface, Text, alpha, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { DshCart, DshCartItem, DshCartItemValidation, DshFulfillmentMode } from "../../shared/cart";
import { formatWltMoney } from "@bthwani/dsh/wlt";
import { getDshDeliveryModeDefinition } from "../../shared/delivery/delivery.contract";

function fulfillmentLabel(mode: DshFulfillmentMode): string {
  return getDshDeliveryModeDefinition(mode).label;
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
        <View style={styles.priceChangeRow}>
          <Text role="caption" style={styles.mutedText}>
            السعر الجديد: {formatWltMoney(validation.currentUnitPriceMinorUnits, validation.currentCurrency ?? validation.snapshotCurrency)}
          </Text>
          <Button
            label="اعتماد السعر"
            tone="secondary"
            size="sm"
            disabled={disabled}
            onPress={onAcceptCurrentPrice}
          />
        </View>
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
        <View style={styles.headerTitleRow}>
          <Text role="bodyStrong" style={styles.sectionTitle}>المنتجات</Text>
          <Badge label={fulfillmentLabel(cart.fulfillmentMode)} tone="info" />
        </View>
        {cart.items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إفراغ السلة بالكامل"
            disabled={actionPending}
            onPress={() => onClearCart(cart)}
            style={styles.clearLink}
          >
            <Text role="caption" style={styles.clearLinkText}>مسح الكل</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.itemsList}>
        {cart.items.map((item: DshCartItem) => {
          const validation = validationByItemId.get(item.id);
          const itemTotal = item.unitPriceMinorUnits * item.quantity;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemMainRow}>
                {/* 1. Item Icon / Thumbnail (Right side in RTL) */}
                <View style={styles.itemIconBox}>
                  <Text style={{ fontSize: 20 }}>🛍️</Text>
                </View>

                {/* 2. Item Info (Middle) */}
                <View style={styles.itemInfo}>
                  <Text role="bodyStrong" numberOfLines={2} style={styles.itemTitle}>
                    {item.productName}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text role="caption" style={styles.unitPriceText}>
                      {formatWltMoney(item.unitPriceMinorUnits, item.currency)}
                    </Text>
                    {item.quantity > 1 ? (
                      <Text role="caption" style={styles.totalPriceText}>
                        (الإجمالي: {formatWltMoney(itemTotal, item.currency)})
                      </Text>
                    ) : null}
                  </View>
                  {item.options && item.options.length > 0 ? (
                    <Text role="caption" numberOfLines={1} style={styles.mutedText}>
                      {item.options.join("، ")}
                    </Text>
                  ) : null}
                  {item.note ? (
                    <Text role="caption" numberOfLines={1} style={styles.mutedText}>
                      ملاحظة: {item.note}
                    </Text>
                  ) : null}
                </View>

                {/* 3. Stepper & Remove Action (Left side in RTL) */}
                <View style={styles.itemRightActions}>
                  <View style={styles.stepperContainer}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`زيادة كمية ${item.productName}`}
                      disabled={actionPending}
                      style={styles.stepperBtn}
                      onPress={() => onUpdateQuantity(
                        item.masterProductId,
                        item.productName,
                        item.quantity + 1,
                        item.priceReference,
                        item.options,
                        item.note,
                      )}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>

                    <Text style={styles.stepperValue}>{item.quantity}</Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`تقليل كمية ${item.productName}`}
                      disabled={actionPending}
                      style={styles.stepperBtn}
                      onPress={() => onUpdateQuantity(
                        item.masterProductId,
                        item.productName,
                        item.quantity - 1,
                        item.priceReference,
                        item.options,
                        item.note,
                      )}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`حذف ${item.productName}`}
                    disabled={actionPending}
                    onPress={() => onRemoveItem(item.cartId, item.id)}
                    style={styles.deleteBtn}
                  >
                    <Icon name="trash-outline" size={16} tone="danger" />
                  </Pressable>
                </View>
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
            </View>
          );
        })}
      </View>

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
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 13, fontWeight: "bold" },
  clearLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearLinkText: {
    color: colorRoles.danger,
    fontSize: 11,
    fontWeight: "bold",
  },
  itemsList: {
    gap: 6,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.sm,
    padding: 8,
    backgroundColor: colorRoles.surfaceBase,
  },
  itemMainRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colorRoles.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  itemTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  unitPriceText: {
    color: colorRoles.brandAction,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
  },
  totalPriceText: {
    color: colorRoles.textSecondary,
    fontSize: 10,
  },
  mutedText: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    fontSize: 10,
    lineHeight: 14,
  },
  itemRightActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  stepperContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.sm,
    backgroundColor: colorRoles.surfaceWarm,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  stepperBtnText: {
    color: colorRoles.brandStructure,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  stepperValue: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: colorRoles.textPrimary,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(colorRoles.danger, 0.08),
  },
  validationBox: {
    marginTop: 6,
    gap: 4,
    padding: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: alpha(colorRoles.danger, 0.05),
  },
  priceChangeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: { color: colorRoles.danger, textAlign: "right", fontSize: 11, lineHeight: 15 },
});
