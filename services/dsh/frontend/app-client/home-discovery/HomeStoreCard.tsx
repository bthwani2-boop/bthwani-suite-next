import React from 'react';
import type { HomeStoreCardViewModel } from '../../shared/home-discovery';
import { StoreCardPremium } from '../store/StoreCardPremium';

type Props = Readonly<{
  store: HomeStoreCardViewModel;
  onPress?: (storeId: string, slug: string) => void;
}>;

export function HomeStoreCard({ store, onPress }: Props) {
  return (
    <StoreCardPremium
      store={store}
      onPress={(storeId: string) => onPress?.(storeId, store.slug)}
    />
  );
}
