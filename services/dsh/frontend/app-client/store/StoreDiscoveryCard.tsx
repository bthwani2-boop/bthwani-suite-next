import React from "react";
import { StoreCardPremium } from "./StoreCardPremium";
import type { DshStoreCardViewModel } from "../../shared/store";

type Props = {
  store: DshStoreCardViewModel;
  onPress: (storeId: string) => void;
};

export function StoreDiscoveryCard({ store, onPress }: Props) {
  return <StoreCardPremium store={store} onPress={onPress} />;
}
