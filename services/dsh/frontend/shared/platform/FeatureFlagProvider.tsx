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
    const handleOverride = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.key === 'string') {
        const { key, enabled } = customEvent.detail;
        FeatureFlagsRegistry.override({ [key]: enabled });
        setFlags(FeatureFlagsRegistry.getAll());
      }
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('dsh-flag-override', handleOverride);
      return () => {
        window.removeEventListener('dsh-flag-override', handleOverride);
      };
    }
  }, []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

function useFeatureFlag(flag: string): boolean {
  const flags = React.useContext(FeatureFlagContext);
  return flags[flag] ?? false;
}
