import React from "react";
import { type Animated } from "react-native";
import { StoreHero } from "./StoreHero";
import type {
  DshStoreDetailViewModel,
  StoreHeroFulfillmentMode,
} from "../../shared/store";
import {
  isDshFulfillmentDeliveryMode,
  type DshFulfillmentDeliveryMode,
} from "../../shared/delivery/delivery.contract";

const DELIVERY_MODE_PRESENTATION: Record<
  DshFulfillmentDeliveryMode,
  StoreHeroFulfillmentMode
> = {
  bthwani_delivery: {
    id: "bthwani_delivery",
    label: "توصيل بثواني",
    icon: "🚲",
  },
  partner_delivery: {
    id: "partner_delivery",
    label: "توصيل المتجر",
    icon: "🛵",
  },
  pickup: { id: "pickup", label: "استلم بنفسك", icon: "🏪" },
};

type Props = Readonly<{
  store: DshStoreDetailViewModel;
  selectedMode: DshFulfillmentDeliveryMode;
  onModeChange: (id: DshFulfillmentDeliveryMode) => void;
  onCartPress?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
  scrollY: Animated.Value;
}>;

export function StoreDetailHeroSection({
  store,
  selectedMode,
  onModeChange,
  onCartPress,
  onBack,
  scrollY,
}: Props) {
  const visibleModes = React.useMemo(
    () =>
      store.availableFulfillmentModes.map(
        (mode) => DELIVERY_MODE_PRESENTATION[mode],
      ),
    [store.availableFulfillmentModes],
  );

  return (
    <StoreHero
      coverImage={store.heroImageSource}
      logoImage={store.logoImageSource}
      name={store.displayName}
      locationLabel={store.locationLabel}
      isOpen={store.isOpen}
      hasBthwaniPro={store.hasProBadge}
      distanceLabel={store.distanceLabel ?? undefined}
      deliveryTimeLabel={store.etaLabel ?? undefined}
      rating={store.ratingAverage ?? undefined}
      onCartPress={onCartPress}
      onBackPress={onBack}
      scrollY={scrollY}
      deliveryModes={visibleModes}
      selectedMode={selectedMode}
      onModeChange={(mode) => {
        if (isDshFulfillmentDeliveryMode(mode)) onModeChange(mode);
      }}
    />
  );
}
