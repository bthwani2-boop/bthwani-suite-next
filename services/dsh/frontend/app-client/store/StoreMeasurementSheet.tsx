import React, { useMemo } from 'react';
import {
  I18nManager,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { colorRoles, colorPalette, alpha } from '@bthwani/ui-kit';
import type { CatalogProduct } from '../../shared/catalog/catalog.types';

export type StoreMeasurementSheetProps = {
  readonly product: CatalogProduct | null;
  readonly categoryLabel: string;
  readonly selectedOption: string | null;
  readonly setSelectedOption: (option: string | null) => void;
  readonly quantity: number;
  readonly setQuantity: (qty: number | ((q: number) => number)) => void;
  readonly isAddedToCart: boolean;
  readonly onAddToCart: () => void;
  readonly onGoToCart: () => void;
  readonly onClose: () => void;
};

export function getProductMeasurementOptions(productName: string, categoryLabel: string) {
  const normalized = (productName + ' ' + categoryLabel).toLowerCase();

  if (
    normalized.includes('تفاح') ||
    normalized.includes('بقالة') ||
    normalized.includes('fresh') ||
    normalized.includes('grocery')
  ) {
    return {
      options: ['250 جرام', '500 جرام', '1 كجم'],
      multipliers: { '250 جرام': 0.25, '500 جرام': 0.5, '1 كجم': 1.0 } as Record<string, number>,
    };
  }
  if (
    normalized.includes('خبز') ||
    normalized.includes('مخبوز') ||
    normalized.includes('bakery')
  ) {
    return {
      options: ['حبة', '2 حبة', '6 حبات'],
      multipliers: { 'حبة': 1.0, '2 حبة': 2.0, '6 حبات': 6.0 } as Record<string, number>,
    };
  }
  return {
    options: ['حبة', '2 حبة', '4 حبات'],
    multipliers: { 'حبة': 1.0, '2 حبة': 2.0, '4 حبات': 4.0 } as Record<string, number>,
  };
}

export const StoreMeasurementSheet = React.memo(function StoreMeasurementSheet({
  product,
  categoryLabel,
  selectedOption,
  setSelectedOption,
  quantity,
  setQuantity,
  isAddedToCart,
  onAddToCart,
  onGoToCart,
  onClose,
}: StoreMeasurementSheetProps) {
  const isRtl = I18nManager.isRTL;

  const { options, multipliers } = useMemo(() => {
    if (!product) return { options: [], multipliers: {} as Record<string, number> };
    return getProductMeasurementOptions(product.name, categoryLabel);
  }, [product, categoryLabel]);

  const basePrice = useMemo(() => {
    if (!product) return 0;
    return parseFloat(product.priceReference || '0');
  }, [product]);

  const selectedMultiplier = useMemo(
    () => (selectedOption ? (multipliers[selectedOption] ?? 1.0) : 1.0),
    [selectedOption, multipliers],
  );

  const totalPrice = useMemo(
    () => basePrice * selectedMultiplier * quantity,
    [basePrice, selectedMultiplier, quantity],
  );

  if (!product) return null;

  return (
    <Modal
      visible={Boolean(product)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Soft overlay — donor exact: no backdrop dim, just overlaySoft */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.popoverCard}>
          {isAddedToCart ? (
            // ── Cart confirmation state — matches donor CartConfirmationBlock layout ──
            <View style={styles.confirmContainer}>
              <View style={styles.confirmOriginBubble}>
                <Text style={styles.confirmBubbleIcon}>🛒</Text>
                <View style={styles.confirmPlusBadge}>
                  <Text style={styles.confirmPlusText}>+</Text>
                </View>
              </View>

              <Text style={styles.confirmTitle}>تمت إضافة المنتج للسلة</Text>
              <Text style={styles.confirmSubtitle}>
                {product.name}
                {selectedOption ? ` (${selectedOption})` : ''}
              </Text>

              <View style={[styles.confirmActions, isRtl && styles.rowReverse]}>
                <TouchableOpacity
                  style={styles.goToCartBtn}
                  activeOpacity={0.88}
                  onPress={onGoToCart}
                >
                  <View style={[styles.btnInner, isRtl && styles.rowReverse]}>
                    <Text style={styles.goToCartText}>انتقل للسلة</Text>
                    <Text style={styles.btnIcon}>🛒</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueBtn}
                  activeOpacity={0.88}
                  onPress={onClose}
                >
                  <Text style={styles.continueText}>متابعة التسوق</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ── Measurement picker — donor exact compact layout ──
            <View style={styles.pickerContainer}>
              {/* Header */}
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colorRoles.brandStructure }]}>
                  {product.name}
                </Text>
              </View>

              {/* Options grid — row-reverse for RTL, donor exact chip sizing */}
              <View style={[styles.optionsGrid, isRtl && styles.rowReverse]}>
                {options.map((option) => {
                  const selected = selectedOption === option;
                  const price = basePrice * (multipliers[option] ?? 1.0);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionChip,
                        { backgroundColor: colorRoles.surfaceBase, borderColor: colorRoles.borderSubtle },
                        selected && { backgroundColor: colorRoles.brandAction, borderColor: colorRoles.brandAction },
                      ]}
                      activeOpacity={0.88}
                      onPress={() => setSelectedOption(option)}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: selected ? colorPalette.white : colorRoles.brandStructure },
                        ]}
                      >
                        {option}
                      </Text>
                      <Text
                        style={[
                          styles.optionPrice,
                          { color: selected ? alpha(colorPalette.white, 0.8) : colorRoles.textSecondary },
                        ]}
                      >
                        {price.toFixed(1).replace(/\.0$/, '')} د.ي
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Qty row — donor exact: ghost minus, branded plus, pill display */}
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyGhostBtn, { backgroundColor: colorRoles.surfaceBase, borderColor: colorRoles.borderSubtle }]}
                  activeOpacity={0.85}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Text style={[styles.qtyBtnText, { color: colorRoles.textSecondary }]}>−</Text>
                </TouchableOpacity>

                <View style={[styles.qtyPill, { backgroundColor: colorRoles.surfaceBase, borderColor: colorRoles.borderSubtle }]}>
                  <Text style={[styles.qtyValue, { color: colorRoles.brandStructure }]}>{quantity}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.qtyPrimaryBtn, { backgroundColor: colorRoles.brandAction, borderColor: colorRoles.brandAction }]}
                  activeOpacity={0.9}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Text style={styles.qtyBtnTextWhite}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Footer bar — donor exact: price left, confirm right, combined pill */}
              <View style={[styles.footerBar, { borderColor: colorRoles.borderSubtle }]}>
                <View style={[styles.priceBox, { backgroundColor: colorRoles.surfaceBase }]}>
                  <Text style={[styles.priceText, { color: colorRoles.brandStructure }]}>
                    {totalPrice.toFixed(1).replace(/\.0$/, '')} د.ي
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colorRoles.brandAction }]}
                  activeOpacity={0.9}
                  onPress={onAddToCart}
                >
                  <View style={[styles.btnInner, isRtl && styles.rowReverse]}>
                    <Text style={styles.confirmBtnText}>أضف للسلة</Text>
                    <Text style={styles.btnIcon}>🛒</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  // Donor: soft overlay (no dark backdrop)
  overlay: {
    flex: 1,
    backgroundColor: alpha(colorPalette.black, 0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Donor: compact card maxWidth 280, rounded, subtle shadow
  popoverCard: {
    width: '90%',
    maxWidth: 320,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    ...{
      shadowColor: colorRoles.brandStructure,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 6,
    },
    gap: 6,
  },
  rowReverse: { flexDirection: 'row-reverse' },

  // ── Picker ──
  pickerContainer: { alignItems: 'stretch' },
  pickerHeader: { alignItems: 'flex-end', marginBottom: 2 },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionPrice: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Qty row — donor: 38px circles/pill
  qtyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  qtyGhostBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPrimaryBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyPill: {
    minWidth: 56,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  qtyBtnTextWhite: {
    fontSize: 20,
    fontWeight: '900',
    color: colorPalette.white,
    lineHeight: 24,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Footer bar — donor: combined pill, price left, confirm right
  footerBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  priceBox: {
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  confirmBtnText: {
    color: colorPalette.white,
    fontSize: 14,
    fontWeight: '900',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIcon: { fontSize: 16 },

  // ── Confirmation state ──
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  confirmOriginBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colorRoles.brandAction,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: colorRoles.brandActionSoft,
    marginBottom: 4,
  },
  confirmBubbleIcon: { fontSize: 20 },
  confirmPlusBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colorPalette.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  confirmPlusText: {
    fontSize: 10,
    fontWeight: '900',
    color: colorRoles.brandAction,
    lineHeight: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colorRoles.brandStructure,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    color: colorRoles.textSecondary,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  goToCartBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colorRoles.brandAction,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToCartText: {
    color: colorPalette.white,
    fontSize: 14,
    fontWeight: '900',
  },
  continueBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    color: colorRoles.brandStructure,
    fontSize: 14,
    fontWeight: '800',
  },
});
