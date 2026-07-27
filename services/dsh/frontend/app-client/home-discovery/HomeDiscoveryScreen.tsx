import React from "react";
import { useClientAddressController } from "../../shared/client-address";
import {
  useHomeDiscoveryController,
  type DshHomeSpecialRequestTarget,
  type HomeDiscoveryState,
} from "../../shared/home-discovery";
import { HomeDiscoveryShell } from "./HomeDiscoveryShell";

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialRequestPress?: ((requestType: DshHomeSpecialRequestTarget) => void) | undefined;
  onMarketingAction?: ((actionType: string, actionTarget: string) => void) | undefined;
};

export function HomeDiscoveryScreen({ onStorePress, onSpecialRequestPress, onMarketingAction }: Props) {
  const addressController = useClientAddressController();
  const serviceAreaCode = addressController.selectedAddress?.serviceAreaCode;
  const controller = useHomeDiscoveryController({
    enabled: addressController.state.kind === "ready",
    ...(serviceAreaCode !== undefined ? { serviceAreaCode } : {}),
  });
  const state: HomeDiscoveryState = addressController.state.kind === "error"
    ? { kind: "error", message: addressController.state.message }
    : controller.state;

  const retry = () => {
    if (addressController.state.kind === "error") {
      void addressController.reload();
      return;
    }
    controller.retry();
  };

  return (
    <HomeDiscoveryShell
      state={state}
      activeFilter={controller.activeFilter}
      onFilterChange={controller.setActiveFilter}
      onStorePress={onStorePress}
      onSpecialRequestPress={onSpecialRequestPress}
      onMarketingAction={onMarketingAction}
      onRetry={retry}
    />
  );
}
