import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  BThwaniAppearanceProvider,
  defaultBThwaniAppearanceMode,
  getBThwaniAppearanceStorageKey,
  isBThwaniAppearanceMode,
  type BThwaniAppearanceMode,
} from "@bthwani/ui-kit";

const storageKey = getBThwaniAppearanceStorageKey("app-partner");

export type PartnerAppearanceState = {
  readonly hydrated: boolean;
  readonly mode: BThwaniAppearanceMode;
  readonly setMode: (mode: BThwaniAppearanceMode) => void;
  readonly error: string | null;
};

const PartnerAppearanceContext = createContext<PartnerAppearanceState | null>(null);

async function readStoredAppearanceMode(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(storageKey);
}

async function writeStoredAppearanceMode(mode: BThwaniAppearanceMode): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, mode);
    return;
  }
  await SecureStore.setItemAsync(storageKey, mode);
}

export function PartnerAppearanceProvider({ children }: { readonly children: React.ReactNode }) {
  const [mode, setModeState] = useState<BThwaniAppearanceMode>(defaultBThwaniAppearanceMode);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void readStoredAppearanceMode()
      .then((storedMode) => {
        if (!mountedRef.current) return;
        if (isBThwaniAppearanceMode(storedMode)) setModeState(storedMode);
        setHydrated(true);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError("تعذر قراءة تفضيل المظهر المحفوظ.");
        setHydrated(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setMode = useCallback((nextMode: BThwaniAppearanceMode) => {
    setModeState(nextMode);
    setError(null);
    void writeStoredAppearanceMode(nextMode).catch(() => {
      if (mountedRef.current) setError("تعذر حفظ تفضيل المظهر.");
    });
  }, []);

  const value = useMemo<PartnerAppearanceState>(
    () => ({ hydrated, mode, setMode, error }),
    [error, hydrated, mode, setMode],
  );

  return (
    <BThwaniAppearanceProvider mode={mode} syncThemeMode>
      <PartnerAppearanceContext.Provider value={value}>
        {children}
      </PartnerAppearanceContext.Provider>
    </BThwaniAppearanceProvider>
  );
}

export function usePartnerAppearance(): PartnerAppearanceState {
  const value = useContext(PartnerAppearanceContext);
  if (!value) throw new Error("usePartnerAppearance must be used inside PartnerAppearanceProvider");
  return value;
}
