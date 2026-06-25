import React from 'react';
import {
  toSharedStoreCardViewModel,
  type HomeStoreCardViewModel,
} from '../../shared/home-discovery';
import { StoreCardPremium } from '../store/StoreCardPremium';

type Props = Readonly<{
  store: HomeStoreCardViewModel;
  onPress?: (storeId: string, slug: string) => void;
}>;

export function HomeStoreCard({ store, onPress }: Props) {
  const item = toSharedStoreCardViewModel(store);

  return (
    <StoreCardPremium
      store={item}
      onPress={(storeId: string) => onPress?.(storeId, store.slug)}
    />
  );
}
