import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colorRoles, alpha } from "@bthwani/ui-kit";

type Props = Readonly<{
  openingHours: string;
  coverageSummary: string;
  addressLine: string;
  deliveryReadiness: string;
  isRTL: boolean;
}>;

type StoreInfoRow = Readonly<{
  icon: string;
  arLabel: string;
  enLabel: string;
  value: string;
}>;

export function StoreDetailInfoCard({
  openingHours,
  coverageSummary,
  addressLine,
  deliveryReadiness,
  isRTL,
}: Props) {
  const rows: readonly StoreInfoRow[] = [
    { icon: "🕒", arLabel: "أوقات العمل", enLabel: "Opening hours", value: openingHours.trim() },
    { icon: "📍", arLabel: "العنوان", enLabel: "Address", value: addressLine.trim() },
    { icon: "🗺️", arLabel: "نطاق التغطية", enLabel: "Coverage", value: coverageSummary.trim() },
    { icon: "🛵", arLabel: "جاهزية التوصيل", enLabel: "Delivery readiness", value: deliveryReadiness.trim() },
  ].filter((row) => row.value.length > 0);

  if (rows.length === 0) return null;

  return (
    <View style={styles.container}>
      {rows.map((row) => (
        <View key={row.enLabel} style={[styles.chipRow, isRTL && styles.rowReverse]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{row.icon}</Text>
          </View>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {isRTL ? `${row.arLabel}: ${row.value}` : `${row.enLabel}: ${row.value}`}
          </Text>
        </View>
      ))}
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: alpha(colorRoles.brandStructure, 0.03),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.06),
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: alpha(colorRoles.brandStructure, 0.06),
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 13,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colorRoles.textSecondary,
  },
  textRight: {
    textAlign: "right",
  },
});
