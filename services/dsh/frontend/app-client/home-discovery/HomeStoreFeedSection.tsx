import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
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
  if (stores.length === 0 && activeFilter === 'favorites') {
    return (
      <View style={styles.container}>
        <EmptyState title="لا توجد مفضلة" description="أضف متاجر إلى مفضلتك لتظهر هنا" />
      </View>
    );
  }

  if (stores.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState title="لا توجد متاجر" description="لا توجد متاجر تطابق هذا الفلتر" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
  separator: {
    height: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[2],
  },
});
