import React from "react";
import { StoreCardPremium } from "./StoreCardPremium";
import type { DshStoreCardViewModel } from "../../shared/store-discovery/store-discovery.view-model";

type Props = {
  store: DshStoreCardViewModel;
  onPress: (storeId: string) => void;
  isFavorite?: boolean;
  onFavoritePress?: (storeId: string) => void;
};

export function StoreDiscoveryCard({ store, onPress, isFavorite, onFavoritePress }: Props) {
  return (
    <StoreCardPremium
      store={store}
      onPress={onPress}
      isFavorite={isFavorite}
      onFavoritePress={onFavoritePress}
    />
  );
}
