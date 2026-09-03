import React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { DshFulfillmentMode, DshPricingQuote } from "../../commerce/cart";
import { formatWltMoney } from "@bthwani/dsh/wlt-boundary";

export function CartQuoteSummary({
  quote,
  fulfillmentMode = "bthwani_delivery",
}: {
  readonly quote: DshPricingQuote | null;
  readonly fulfillmentMode?: DshFulfillmentMode;
}) {
  if (!quote) return null;
  const { currency } = quote;
  const showDelivery = fulfillmentMode !== "pickup";
  const showService = quote.serviceFeeMinorUnits > 0;
  const showTax = quote.taxMinorUnits > 0;
  const showDiscount = quote.discountMinorUnits > 0;
  const showRounding = quote.roundingMinorUnits !== 0;

  return (
    <Surface tone="default" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text role="bodyStrong" style={styles.sectionTitle}>ملخص السعر</Text>
      </View>
      <View style={styles.quoteLine}>
        <Text role="bodySm" style={styles.mutedText}>المجموع الجزئي</Text>
        <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.subtotalMinorUnits, currency)}</Text>
      </View>
      {showDelivery && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>رسوم التوصيل</Text>
          <Text role="bodySm" style={[styles.quoteValue, quote.deliveryFeeMinorUnits === 0 && styles.freeText]}>
            {quote.deliveryFeeMinorUnits === 0 ? "مجاناً" : formatWltMoney(quote.deliveryFeeMinorUnits, currency)}
          </Text>
        </View>
      )}
      {showService && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>رسوم الخدمة</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.serviceFeeMinorUnits, currency)}</Text>
        </View>
      )}
      {showTax && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>الضريبة</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.taxMinorUnits, currency)}</Text>
        </View>
      )}
      {showDiscount && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>الخصم</Text>
          <Text role="bodySm" style={[styles.quoteValue, styles.discountText]}>− {formatWltMoney(quote.discountMinorUnits, currency)}</Text>
        </View>
      )}
      {showRounding && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>تعديل التقريب</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.roundingMinorUnits, currency)}</Text>
        </View>
      )}
      <View style={[styles.quoteLine, styles.quoteTotalLine]}>
        <Text role="bodyStrong" style={styles.sectionTitle}>الإجمالي</Text>
        <Text role="bodyStrong" style={styles.quoteTotalValue}>{formatWltMoney(quote.totalMinorUnits, currency)}</Text>
      </View>
      {quote.expiresAt ? (
        <Text role="caption" style={styles.mutedText}>
          صالح حتى: {new Date(quote.expiresAt).toLocaleTimeString("ar-SA")}
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
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 13, fontWeight: "bold" },
  quoteLine: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteValue: { color: colorRoles.textPrimary, textAlign: "left", fontSize: 12 },
  discountText: { color: colorRoles.success },
  freeText: { color: colorRoles.success, fontWeight: "bold" },
  quoteTotalLine: {
    borderTopWidth: 1,
    borderTopColor: colorRoles.borderSubtle,
    paddingTop: 4,
    marginTop: 2,
  },
  quoteTotalValue: { color: colorRoles.brandAction, fontSize: 15, fontWeight: "bold" },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", fontSize: 11, lineHeight: 15 },
});
