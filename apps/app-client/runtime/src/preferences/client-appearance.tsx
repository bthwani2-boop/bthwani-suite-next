import React from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

export type ClientAppearanceMode = "system" | "lightPremium" | "darkGlass";
export type ClientThemeName = "light" | "dark";

type ClientAppearanceContextValue = {
  readonly mode: ClientAppearanceMode;
  readonly themeName: ClientThemeName;
  readonly hydrated: boolean;
  readonly setMode: (mode: ClientAppearanceMode) => Promise<void>;
};

const STORAGE_KEY = "bthwani-client:appearance:v1";

const ClientAppearanceContext = React.createContext<ClientAppearanceContextValue | null>(null);

function isAppearanceMode(value: string | null): value is ClientAppearanceMode {
  return value === "system" || value === "lightPremium" || value === "darkGlass";
}

function resolveThemeName(
  mode: ClientAppearanceMode,
  systemScheme: "light" | "dark" | null | undefined,
): ClientThemeName {
  if (mode === "darkGlass") return "dark";
  if (mode === "lightPremium") return "light";
  return systemScheme === "dark" ? "dark" : "light";
}

export function ClientAppearanceProvider({ children }: { readonly children?: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = React.useState<ClientAppearanceMode>("system");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isAppearanceMode(stored)) setModeState(stored);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = React.useCallback(async (nextMode: ClientAppearanceMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    await Haptics.selectionAsync().catch(() => undefined);
  }, []);

  const value = React.useMemo<ClientAppearanceContextValue>(
    () => ({
      mode,
      themeName: resolveThemeName(mode, systemScheme),
      hydrated,
      setMode,
    }),
    [hydrated, mode, setMode, systemScheme],
  );

  return React.createElement(ClientAppearanceContext.Provider, { value }, children);
}

export function useClientAppearance(): ClientAppearanceContextValue {
  const value = React.useContext(ClientAppearanceContext);
  if (!value) {
    throw new Error("useClientAppearance must be used inside ClientAppearanceProvider");
  }
  return value;
}
