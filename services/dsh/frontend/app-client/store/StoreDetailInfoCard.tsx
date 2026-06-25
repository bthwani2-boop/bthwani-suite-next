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
    <View style={styles.container}>
      {openingHours ? (
        <View style={[styles.chipRow, isRTL && styles.rowReverse]}>
          <Text style={styles.icon}>🕒</Text>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `أوقات العمل: ${openingHours}` : `Opening Hours: ${openingHours}`}
          </Text>
        </View>
      ) : null}
      {catalogSummary ? (
        <View style={[styles.chipRow, isRTL && styles.rowReverse]}>
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
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 47, 92, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colorRoles.textSecondary,
  },
  textRight: {
    textAlign: 'right',
  },
});
