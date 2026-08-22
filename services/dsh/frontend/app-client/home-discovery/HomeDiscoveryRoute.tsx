import React from "react";
import { HomeDiscoveryScreen } from "./HomeDiscoveryScreen";
import type { DshHomeSpecialRequestTarget } from "../../shared/home-discovery";

type Props = {
  searchQuery?: string | undefined;
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialRequestPress?: ((requestType: DshHomeSpecialRequestTarget) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
};

export function HomeDiscoveryRoute({ searchQuery, onStorePress, onSpecialRequestPress, onMarketingAction }: Props) {
  return (
    <HomeDiscoveryScreen
      searchQuery={searchQuery}
      onStorePress={onStorePress}
      onSpecialRequestPress={onSpecialRequestPress}
      onMarketingAction={onMarketingAction}
    />
  );
}
