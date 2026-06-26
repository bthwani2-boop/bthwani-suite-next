import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorRoles, alpha } from '@bthwani/ui-kit';

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
  const displaySummary = catalogSummary === 'Over 1,200 fresh groceries and daily essentials' && isRTL
    ? 'أكثر من ١,٢٠٠ من المواد الغذائية الطازجة والاحتياجات اليومية'
    : catalogSummary;

  return (
    <View style={styles.container}>
      {openingHours ? (
        <View style={[styles.chipRow, isRTL && styles.rowReverse]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🕒</Text>
          </View>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `أوقات العمل: ${openingHours}` : `Opening Hours: ${openingHours}`}
          </Text>
        </View>
      ) : null}
      {displaySummary ? (
        <View style={[styles.chipRow, isRTL && styles.rowReverse]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🛍️</Text>
          </View>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `ملخص المتجر: ${displaySummary}` : `Store Summary: ${displaySummary}`}
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
    backgroundColor: alpha(colorRoles.brandStructure, 0.03),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.06),
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: alpha(colorRoles.brandStructure, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 13,
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
