import React from "react";
import { HomeDiscoveryScreen } from "./HomeDiscoveryScreen";
import type { DshHomeSpecialRequestTarget } from "../../shared/home-discovery";

type Props = {
  readonly searchQuery?: string | undefined;
  readonly onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  readonly onSpecialRequestPress?: ((requestType: DshHomeSpecialRequestTarget) => void) | undefined;
  readonly onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
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
