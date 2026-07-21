import React from "react";
import { HomeDiscoveryScreen } from "./HomeDiscoveryScreen";

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialCategoryPress?: ((nodeId: string) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
};

export function HomeDiscoveryRoute({ onStorePress, onSpecialCategoryPress, onMarketingAction }: Props) {
  return (
    <HomeDiscoveryScreen
      onStorePress={onStorePress}
      onSpecialCategoryPress={onSpecialCategoryPress}
      onMarketingAction={onMarketingAction}
    />
  );
}
