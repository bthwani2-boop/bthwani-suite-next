import React from 'react';
import { type Animated } from 'react-native';
import { StoreHero, type StoreHeroFulfillmentMode } from '@bthwani/ui-kit';
import type { DshStoreDetailViewModel } from '../../shared/store';

const DELIVERY_MODES: readonly StoreHeroFulfillmentMode[] = [
  { id: 'bthwani_delivery', label: 'توصيل بثواني', icon: '🚲' },
  { id: 'pickup', label: 'استلام', icon: '🏪' },
];

type Props = Readonly<{
  store: DshStoreDetailViewModel;
  selectedMode: string;
  onModeChange: (id: string) => void;
  onBack?: (() => void) | undefined;
  scrollY: Animated.Value;
}>;

export function StoreDetailHeroSection({ store, selectedMode, onModeChange, onBack, scrollY }: Props) {
  const visibleModes = React.useMemo(() => {
    const filtered = DELIVERY_MODES.filter((m) =>
      store.deliveryModeLabels.some((label) =>
        label.includes(m.id === 'pickup' ? 'استلام' : 'توصيل'),
      ),
    );
    return filtered.length > 0 ? filtered : DELIVERY_MODES;
  }, [store.deliveryModeLabels]);

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
