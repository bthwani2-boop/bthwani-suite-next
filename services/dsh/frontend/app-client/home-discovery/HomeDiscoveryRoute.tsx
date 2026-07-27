import React from "react";
import { HomeDiscoveryScreen } from "./HomeDiscoveryScreen";
import type { DshHomeSpecialRequestTarget } from "../../shared/home-discovery";

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialRequestPress?: ((requestType: DshHomeSpecialRequestTarget) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
};

export function HomeDiscoveryRoute({ onStorePress, onSpecialRequestPress, onMarketingAction }: Props) {
  return (
    <HomeDiscoveryScreen
      onStorePress={onStorePress}
      onSpecialRequestPress={onSpecialRequestPress}
      onMarketingAction={onMarketingAction}
    />
  );
}
