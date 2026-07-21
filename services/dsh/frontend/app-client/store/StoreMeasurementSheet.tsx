import React from "react";
import {
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alpha, colorPalette, colorRoles } from "@bthwani/ui-kit";
import type { CatalogProduct } from "../../shared/catalog/client-catalog.types";

export type StoreMeasurementSheetProps = {
  readonly product: CatalogProduct | null;
  readonly quantity: number;
  readonly setQuantity: (quantity: number | ((current: number) => number)) => void;
  readonly isAddedToCart: boolean;
  readonly isSubmitting: boolean;
  readonly errorMessage?: string | null;
  readonly onAddToCart: () => void;
  readonly onGoToCart: () => void;
  readonly onClose: () => void;
};

/**
 * Quantity-only product sheet.
 *
 * Product units, variants, and prices are catalog-owned. This component must
 * never infer them from product names or calculate a commercial amount from a
 * display/reference string. The server resolves the current assortment and
 * authoritative price when the cart mutation is accepted.
 */
export const StoreMeasurementSheet = React.memo(function StoreMeasurementSheet({
  product,
  quantity,
  setQuantity,
  isAddedToCart,
  isSubmitting,
  errorMessage,
  onAddToCart,
  onGoToCart,
  onClose,
}: StoreMeasurementSheetProps) {
  const isRtl = I18nManager.isRTL;

  if (!product) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={isSubmitting ? undefined : onClose}>
        <Pressable style={styles.popoverCard} accessibilityRole="none">
          {isAddedToCart ? (
            <View style={styles.confirmContainer}>
              <View style={styles.confirmOriginBubble}>
                <Text style={styles.confirmBubbleIcon}>🛒</Text>
                <View style={styles.confirmPlusBadge}>
                  <Text style={styles.confirmPlusText}>+</Text>
                </View>
              </View>

              <Text style={styles.confirmTitle}>تمت إضافة المنتج للسلة</Text>
              <Text style={styles.confirmSubtitle}>{product.name}</Text>

              <View style={[styles.confirmActions, isRtl && styles.rowReverse]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="الانتقال إلى السلة"
                  style={styles.goToCartBtn}
                  activeOpacity={0.88}
                  onPress={onGoToCart}
                >
                  <Text style={styles.goToCartText}>انتقل للسلة</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="متابعة التسوق"
                  style={styles.continueBtn}
                  activeOpacity={0.88}
                  onPress={onClose}
                >
                  <Text style={styles.continueText}>متابعة التسوق</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{product.name}</Text>
                {product.unitLabel ? (
                  <Text style={styles.productMeta}>{product.unitLabel}</Text>
                ) : null}
                {product.priceReference ? (
                  <Text style={styles.productMeta}>
                    السعر المعروض: {product.priceReference}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.priceNotice}>
                يُثبت السعر والتوافر من الكتالوج المركزي عند قبول DSH لعملية
                السلة.
              </Text>

              <View style={styles.qtyRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="تقليل الكمية"
                  disabled={quantity <= 1 || isSubmitting}
                  style={[
                    styles.qtyGhostBtn,
                    (quantity <= 1 || isSubmitting) && styles.disabledButton,
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>

                <View style={styles.qtyPill} accessibilityLabel={`الكمية ${quantity}`}>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="زيادة الكمية"
                  disabled={isSubmitting}
                  style={[
                    styles.qtyPrimaryBtn,
                    isSubmitting && styles.disabledButton,
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    setQuantity((current) => Math.min(99, current + 1))
                  }
                >
                  <Text style={styles.qtyBtnTextWhite}>+</Text>
                </TouchableOpacity>
              </View>

              {errorMessage ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errorMessage}
                </Text>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="إضافة المنتج إلى السلة"
                accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
                disabled={isSubmitting}
                style={[
                  styles.confirmBtn,
                  isSubmitting && styles.disabledButton,
                ]}
                activeOpacity={0.9}
                onPress={onAddToCart}
              >
                <Text style={styles.confirmBtnText}>
                  {isSubmitting ? "جاري الإضافة…" : "أضف للسلة"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha(colorPalette.black, 0.12),
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  popoverCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  rowReverse: { flexDirection: "row-reverse" },
  pickerContainer: { gap: 16 },
  pickerHeader: { alignItems: "flex-end", gap: 4 },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  productMeta: {
    fontSize: 13,
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  priceNotice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: alpha(colorRoles.brandAction, 0.08),
    color: colorRoles.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
  },
  qtyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  qtyGhostBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyPrimaryBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colorRoles.brandAction,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { opacity: 0.45 },
  qtyPill: {
    minWidth: 64,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: {
    fontSize: 22,
    fontWeight: "900",
    color: colorRoles.textSecondary,
  },
  qtyBtnTextWhite: {
    fontSize: 22,
    fontWeight: "900",
    color: colorPalette.white,
  },
  qtyValue: {
    fontSize: 17,
    fontWeight: "900",
    color: colorRoles.brandStructure,
  },
  errorText: {
    color: colorRoles.danger,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
  },
  confirmBtn: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  confirmBtnText: {
    color: colorPalette.white,
    fontSize: 15,
    fontWeight: "900",
  },
  confirmContainer: { alignItems: "center", gap: 12 },
  confirmOriginBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: alpha(colorRoles.brandAction, 0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBubbleIcon: { fontSize: 28 },
  confirmPlusBadge: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPlusText: { color: colorPalette.white, fontWeight: "900" },
  confirmTitle: {
    color: colorRoles.brandStructure,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  confirmSubtitle: {
    color: colorRoles.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  confirmActions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  goToCartBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
  },
  goToCartText: { color: colorPalette.white, fontWeight: "800" },
  continueBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: { color: colorRoles.brandStructure, fontWeight: "800" },
});
