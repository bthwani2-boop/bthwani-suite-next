import React from "react";
import {
  reverseDshClientMapLocation,
  searchDshClientMapLocations,
} from "./client-map.api";
import type {
  DshClientMapState,
  DshVerifiedMapLocation,
} from "./client-map.types";

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "تعذر الوصول إلى خدمة الخرائط المحكومة.";
}

export function useClientMapController() {
  const [state, setState] = React.useState<DshClientMapState>({ kind: "idle" });
  const [locations, setLocations] = React.useState<readonly DshVerifiedMapLocation[]>([]);

  const search = React.useCallback(async (query: string) => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setLocations([]);
      setState({ kind: "error", message: "اكتب حرفين على الأقل للبحث عن الموقع." });
      return [] as readonly DshVerifiedMapLocation[];
    }
    setState({ kind: "loading" });
    try {
      const result = await searchDshClientMapLocations({
        query: normalized,
        limit: 6,
        language: "ar",
        countryCodes: ["YE"],
      });
      setLocations(result);
      setState({ kind: result.length > 0 ? "ready" : "empty" });
      return result;
    } catch (error) {
      setLocations([]);
      setState({ kind: "error", message: errorMessage(error) });
      return [] as readonly DshVerifiedMapLocation[];
    }
  }, []);

  const reverse = React.useCallback(async (latitude: number, longitude: number) => {
    setState({ kind: "loading" });
    try {
      const result = await reverseDshClientMapLocation({ latitude, longitude, language: "ar" });
      setLocations([result]);
      setState({ kind: "ready" });
      return result;
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
      return null;
    }
  }, []);

  const clear = React.useCallback(() => {
    setLocations([]);
    setState({ kind: "idle" });
  }, []);

  return { state, locations, search, reverse, clear } as const;
}
