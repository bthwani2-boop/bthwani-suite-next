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

export function useStoreRoleContextController(): StoreRoleContextController {
  const [state, setState] = useState<StoreRoleContextState>({ kind: "loading" });

  const load = useCallback(async () => {
    await loadStoreRoleContext(
      () => fetchAdminStoreList({ limit: 1, offset: 0 }),
      fetchAdminStoreDetail,
      setState,
    );
  }, []);

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
