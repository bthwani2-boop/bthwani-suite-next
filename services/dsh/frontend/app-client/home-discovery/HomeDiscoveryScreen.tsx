import React from 'react';
import { useHomeDiscoveryController } from '../../shared/home-discovery';
import { HomeDiscoveryShell } from './HomeDiscoveryShell';

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
  onSpecialCategoryPress?: ((nodeId: string) => void) | undefined;
};

export function HomeDiscoveryScreen({ onStorePress, onSpecialCategoryPress }: Props) {
  const controller = useHomeDiscoveryController();

  return (
    <HomeDiscoveryShell
      state={controller.state}
      activeFilter={controller.activeFilter}
      onFilterChange={controller.setActiveFilter}
      onStorePress={onStorePress}
      onSpecialCategoryPress={onSpecialCategoryPress}
      onRetry={controller.retry}
    />
  );
}
