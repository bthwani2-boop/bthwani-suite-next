"use client";

import React from 'react';

import {
  DEFAULT_PLATFORM_VARS,
  PlatformVarsRegistry,
  type PlatformVarsConfig,
} from './platform-vars';

const PlatformVarsContext = React.createContext<PlatformVarsConfig>(DEFAULT_PLATFORM_VARS);

export interface PlatformVarsProviderProps {
  children: React.ReactNode;
}

export function PlatformVarsProvider({ children }: PlatformVarsProviderProps) {
  const [config] = React.useState<PlatformVarsConfig>(() => {
    PlatformVarsRegistry.initialize();
    return PlatformVarsRegistry.getAll();
  });

  return (
    <PlatformVarsContext.Provider value={config}>
      {children}
    </PlatformVarsContext.Provider>
  );
}

export function usePlatformVars(): PlatformVarsConfig {
  return React.useContext(PlatformVarsContext);
}
