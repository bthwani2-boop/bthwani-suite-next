import { useCallback, useEffect, useState } from "react";
import { fetchPublishedCatalog } from "./client-catalog.api";
import { catalogLoadingState } from "./catalog.states";
import type { CatalogState } from "./client-catalog.types";

export function usePublishedCatalogController(storeId: string) {
  const [state, setState] = useState<CatalogState>(catalogLoadingState());
  const load = useCallback(async () => setState(await fetchPublishedCatalog(storeId)), [storeId]);
  useEffect(() => { void load(); }, [load]);
  return { state, retry: () => void load() };
}
