import React, { useCallback, useEffect, useState } from 'react';
import { fetchHomeDiscovery, loadingState, type HomeDiscoveryState } from '../../shared/home-discovery';
import type { DiscoveryFilterKind } from '../../shared/home-discovery';
import { HomeDiscoveryShell } from './HomeDiscoveryShell';

type Props = {
  onStorePress?: ((storeId: string, slug: string) => void) | undefined;
};

export function HomeDiscoveryScreen({ onStorePress }: Props) {
  const [state, setState] = useState<HomeDiscoveryState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilterKind>('all');

  const load = useCallback(async () => {
    setState(loadingState());
    const result = await fetchHomeDiscovery({ limit: 20 });
    setState(result);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <HomeDiscoveryShell
      state={state}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      onStorePress={onStorePress}
      onRetry={load}
    />
  );
}
