import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FilterRail, colorRoles } from '@bthwani/ui-kit';
import type { CatalogCategory } from '../../shared/catalog/legacy-catalog-compat.types';

type Props = Readonly<{
  categories: readonly CatalogCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  favoriteIds: ReadonlySet<string>;
}>;

export function StoreDetailCategoryRail({ categories, selectedId, onSelect, favoriteIds }: Props) {
  const railItems = useMemo(() => {
    const base = [
      {
        id: 'all',
        label: 'جميع الأقسام',
        icon: <Text style={styles.chipIcon}>≡</Text>,
      },
      {
        id: 'popular',
        label: 'الأكثر طلباً',
        icon: <Text style={styles.chipIcon}>🔥</Text>,
      },
    ];

    if (favoriteIds.size > 0) {
      base.push({
        id: 'favorites',
        label: 'المفضلة',
        icon: <Text style={styles.chipIcon}>🤍</Text>,
      });
    }

    const categoryItems = categories.map((c) => ({
      id: c.id,
      label: c.name,
      icon: undefined as React.ReactNode,
    }));

    return [...base, ...categoryItems];
  }, [categories, favoriteIds.size]);

  return (
    <View style={styles.section}>
      {/* Donor-exact section header: paddingHorizontal 16, marginTop 16, marginBottom 8 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>قائمة الأصناف</Text>
      </View>
      <View style={styles.sectionBlock}>
        <FilterRail
          items={railItems}
          selectedId={selectedId}
          onChange={onSelect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    // Donor: typographyRoles.titleMd.fontSize — matches 18px weight 900
    fontSize: 18,
    fontWeight: '900',
    color: colorRoles.brandStructure,
    textAlign: 'right',
  },
  sectionBlock: {
    paddingHorizontal: 12,
    width: '100%',
  },
  chipIcon: {
    fontSize: 13,
    color: colorRoles.brandAction,
  },
});
