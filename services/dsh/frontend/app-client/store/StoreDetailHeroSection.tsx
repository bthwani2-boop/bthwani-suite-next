import React from 'react';
import { type Animated } from 'react-native';
import { StoreHero } from './StoreHero';
import type { DshStoreDetailViewModel, StoreHeroFulfillmentMode } from '../../shared/store';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';

const DELIVERY_MODE_PRESENTATION: Record<DshFulfillmentDeliveryMode, StoreHeroFulfillmentMode> = {
  bthwani_delivery: { id: 'bthwani_delivery', label: 'توصيل بثواني', icon: '🚲' },
  partner_delivery: { id: 'partner_delivery', label: 'توصيل المتجر', icon: '🛵' },
  pickup: { id: 'pickup', label: 'استلم بنفسك', icon: '🏪' },
};

type Props = Readonly<{
  store: DshStoreDetailViewModel;
  selectedMode: string;
  onModeChange: (id: string) => void;
  onBack?: (() => void) | undefined;
  scrollY: Animated.Value;
}>;

export function StoreDetailHeroSection({ store, selectedMode, onModeChange, onBack, scrollY }: Props) {
  // Modes come from the store's own enabled fulfillment modes (already mapped
  // from the store-publication vocabulary via toFulfillmentModes()) — never a
  // static three-mode list, and never guessed from formatted display labels.
  const visibleModes = React.useMemo(
    () => store.availableFulfillmentModes.map((mode) => DELIVERY_MODE_PRESENTATION[mode]),
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
      onSearchPress={() => {}}
      onCartPress={() => {}}
      onSharePress={() => {}}
      onBackPress={onBack}
      scrollY={scrollY}
      deliveryModes={visibleModes}
      selectedMode={selectedMode}
      onModeChange={onModeChange}
    />
  );
}
