import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminStoreDetail,
  fetchAdminStoreList,
} from "./store-admin.api";
import {
  loadStoreRoleContext,
  type StoreRoleContextState,
} from "./store-role-context.controller-core";

export type StoreRoleContextController = {
  readonly state: StoreRoleContextState;
  readonly retry: () => void;
};

export function useStoreRoleContextController(input?: {
  readonly storeId?: string;
  readonly actorRole: "partner" | "field" | "captain";
  readonly contextMode: "readiness" | "verification" | "pickup-context";
}): StoreRoleContextController {
  const [state, setState] = useState<StoreRoleContextState>({ kind: "loading" });

  const load = useCallback(async () => {
    // dev/read-only fallback
    // When input is undefined or lacks storeId, the loader queries fetchAdminStoreList with limit: 1
    // as a fallback for local dev/testing only.
    await loadStoreRoleContext(
      () => fetchAdminStoreList({ limit: 1, offset: 0 }),
      fetchAdminStoreDetail,
      setState,
      input,
    );
  }, [input?.storeId, input?.actorRole, input?.contextMode]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    state,
    retry: () => {
      void load();
    },
  };
}
