import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorRoles } from '@bthwani/ui-kit';

type Props = Readonly<{
  openingHours?: string;
  catalogSummary?: string;
  isRTL: boolean;
}>;

export function StoreDetailInfoCard({
  openingHours = '08:00 - 23:00',
  catalogSummary = 'Over 1,200 fresh groceries and daily essentials',
  isRTL,
}: Props) {
  return (
    <View style={styles.card}>
      {openingHours ? (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.icon}>🕒</Text>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `أوقات العمل: ${openingHours}` : `Opening Hours: ${openingHours}`}
          </Text>
        </View>
      ) : null}
      {openingHours && catalogSummary ? <View style={styles.divider} /> : null}
      {catalogSummary ? (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.icon}>🛍️</Text>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `ملخص المتجر: ${catalogSummary}` : `Store Summary: ${catalogSummary}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Donor: borderRadius 24, borderWidth 1.5, padding 16, gap 14
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colorRoles.borderSubtle,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colorRoles.textSecondary,
    lineHeight: 18,
  },
  textRight: {
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colorRoles.borderSubtle,
  },
});
