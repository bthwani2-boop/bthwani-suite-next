import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colorRoles, spacing } from '@bthwani/ui-kit';
import { EmptyState } from '@bthwani/ui-kit';
import type { HomeStoreCardViewModel, DiscoveryFilterKind } from '../../shared/home-discovery';
import { HomeStoreCard } from './HomeStoreCard';

type Props = {
  stores: HomeStoreCardViewModel[];
  activeFilter: DiscoveryFilterKind;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
};

export function HomeStoreFeedSection({ stores, activeFilter, onStorePress }: Props) {
  const sectionTitle = (() => {
    if (activeFilter === 'favorites') return 'المتاجر المفضلة';
    if (activeFilter === 'nearest') return 'الأقرب إليك';
    if (activeFilter === 'offers') return 'العروض';
    if (activeFilter === 'new') return 'جديد';
    return 'المتاجر';
  })();

  if (stores.length === 0 && activeFilter === 'favorites') {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <EmptyState title="لا توجد مفضلة" description="أضف متاجر إلى مفضلتك لتظهر هنا" />
      </View>
    );
  }

  if (stores.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <EmptyState title="لا توجد متاجر" description="لا توجد متاجر تطابق هذا الفلتر" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          onStorePress != null ? (
            <HomeStoreCard store={item} onPress={onStorePress} />
          ) : (
            <HomeStoreCard store={item} />
          )
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colorRoles.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[3],
  },
  separator: {
    height: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[2],
  },
});
