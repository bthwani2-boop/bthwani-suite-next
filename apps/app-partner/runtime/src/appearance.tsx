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
    return window.localStorage.getItem(storageKey);
  }
  return SecureStore.getItemAsync(storageKey);
}

async function writeStoredAppearanceMode(mode: BThwaniAppearanceMode): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      throw new Error("Appearance persistence is unavailable before the web runtime is mounted.");
    }
    window.localStorage.setItem(storageKey, mode);
    return;
  }
  await SecureStore.setItemAsync(storageKey, mode);
}

async function persistAndReadBackAppearanceMode(
  mode: BThwaniAppearanceMode,
): Promise<BThwaniAppearanceMode> {
  await writeStoredAppearanceMode(mode);
  const committedMode = await readStoredAppearanceMode();
  if (!isBThwaniAppearanceMode(committedMode) || committedMode !== mode) {
    throw new Error("Appearance persistence readback did not match the requested mode.");
  }
  return committedMode;
}

export function PartnerAppearanceProvider({ children }: { readonly children: React.ReactNode }) {
  const [mode, setModeState] = useState<BThwaniAppearanceMode>(defaultBThwaniAppearanceMode);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

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
    setError(null);
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        const committedMode = await persistAndReadBackAppearanceMode(nextMode);
        if (!mountedRef.current) return;
        setModeState(committedMode);
        setError(null);
      } catch {
        if (!mountedRef.current) return;
        setError("تعذر حفظ تفضيل المظهر والتحقق منه؛ لم يتم اعتماد التغيير.");
      }
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
