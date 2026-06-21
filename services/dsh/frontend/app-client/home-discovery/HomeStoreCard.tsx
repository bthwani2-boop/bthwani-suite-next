import React from 'react';
import type { HomeStoreCardViewModel } from '../../shared/home-discovery';
import { StoreCardPremium, type StoreCardPremiumItem } from '../store-discovery/StoreCardPremium';

type Props = Readonly<{
  store: HomeStoreCardViewModel;
  onPress?: (storeId: string, slug: string) => void;
}>;

function toStoreCardPremiumItem(vm: HomeStoreCardViewModel): StoreCardPremiumItem {
  const isOpen = vm.openStatusRole === 'storeOpen';
  const isServiceable = vm.serviceabilityStatus === 'serviceable';

  return {
    id: vm.id,
    displayName: vm.displayName,
    cityCode: '',
    serviceAreaCode: '',
    locationLabel: vm.categoryLabel,
    isOpen,
    isServiceable,
    ratingLabel: vm.ratingDisplay === '—' ? null : vm.ratingDisplay,
    ratingAverage: vm.ratingDisplay === '—' ? null : Number(vm.ratingDisplay),
    etaLabel: vm.etaDisplay === '—' ? null : vm.etaDisplay,
    heroImageSource: vm.heroImageUrl != null ? { uri: vm.heroImageUrl } : null,
    logoImageSource: vm.logoUrl != null ? { uri: vm.logoUrl } : null,
    statusBadge: vm.storeStatus === 'temporarily_closed' ? 'مغلق مؤقتًا' : null,
    isFreeDelivery: vm.isFreeDelivery,
    placeholderEmoji: '🏪',
    placeholderTone: 'brandAction',
    deliveryModeLabels: vm.deliveryModeLabels,
    distanceLabel: vm.distanceDisplay,
    followerCountLabel: vm.followerCountDisplay,
    hasProBadge: vm.hasProBadge,
    hasCouponBadge: vm.hasCouponBadge,
    pointsMultiplier: vm.pointsMultiplier,
    isPopular: vm.isPopular,
  };
}

export function HomeStoreCard({ store, onPress }: Props) {
  const item = toStoreCardPremiumItem(store);

  return (
    <StoreCardPremium
      store={item}
      onPress={(storeId: string) => onPress?.(storeId, store.slug)}
    />
  );
}
