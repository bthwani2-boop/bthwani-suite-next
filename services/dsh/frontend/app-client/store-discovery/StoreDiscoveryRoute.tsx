import React from "react";
import { StoreDiscoveryScreen } from "./StoreDiscoveryScreen.js";

type Props = {
  onStorePress?: (storeId: string) => void;
};

export function StoreDiscoveryRoute(props: Props) {
  return <StoreDiscoveryScreen {...props} />;
}
