import React from 'react';
import { HomeDiscoveryScreen } from './HomeDiscoveryScreen';

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialCategoryPress?: ((nodeId: string) => void) | undefined;
};

export function HomeDiscoveryRoute({ onStorePress, onSpecialCategoryPress }: Props) {
  return <HomeDiscoveryScreen onStorePress={onStorePress} onSpecialCategoryPress={onSpecialCategoryPress} />;
}
