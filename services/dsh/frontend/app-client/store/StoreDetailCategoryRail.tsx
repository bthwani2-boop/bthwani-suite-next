import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FilterRail, colorRoles } from "@bthwani/ui-kit";
import type { CatalogCategory } from "../../shared/catalog/client-catalog.types";

type Props = Readonly<{
  categories: readonly CatalogCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}>;

export function StoreDetailCategoryRail({ categories, selectedId, onSelect }: Props) {
  const railItems = useMemo(
    () => [
      {
        id: "all",
        label: "جميع الأقسام",
        icon: <Text style={styles.chipIcon}>≡</Text>,
      },
      {
        id: "popular",
        label: "الأكثر طلباً",
        icon: <Text style={styles.chipIcon}>🔥</Text>,
      },
      ...categories.map((category) => ({
        id: category.id,
        label: category.name,
        icon: undefined as React.ReactNode,
      })),
    ],
    [categories],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>قائمة الأصناف</Text>
      </View>
      <View style={styles.sectionBlock}>
        <FilterRail items={railItems} selectedId={selectedId} onChange={onSelect} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  sectionBlock: {
    paddingHorizontal: 12,
    width: "100%",
  },
  chipIcon: {
    fontSize: 13,
    color: colorRoles.brandAction,
  },
});
