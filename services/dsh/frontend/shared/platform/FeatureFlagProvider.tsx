"use client";

import React from 'react';

import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlagsRegistry,
  type FeatureFlagsConfig,
} from './feature-flags';

const FeatureFlagContext = React.createContext<FeatureFlagsConfig>(DEFAULT_FEATURE_FLAGS);

export interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const [flags, setFlags] = React.useState<FeatureFlagsConfig>(() => {
    FeatureFlagsRegistry.initialize();
    return FeatureFlagsRegistry.getAll();
  });

  React.useEffect(() => {
    setFlags(FeatureFlagsRegistry.getAll());
  }, []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(flag: string): boolean {
  const flags = React.useContext(FeatureFlagContext);
  return flags[flag] ?? false;
}
