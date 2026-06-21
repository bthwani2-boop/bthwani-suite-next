import React from 'react';
import { HomeDiscoveryScreen } from './HomeDiscoveryScreen';

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
};

export function HomeDiscoveryRoute({ onStorePress }: Props) {
  return <HomeDiscoveryScreen onStorePress={onStorePress} />;
}
