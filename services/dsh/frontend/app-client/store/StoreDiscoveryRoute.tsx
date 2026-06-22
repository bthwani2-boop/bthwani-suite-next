import React from "react";
import { StoreDiscoveryScreen } from "./StoreDiscoveryScreen";

type Props = Readonly<{
  onStorePress?: (storeId: string) => void;
}>;

export function StoreDiscoveryRoute(props: Props) {
  return <StoreDiscoveryScreen {...props} />;
}
