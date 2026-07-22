// Canonical location: dsh/frontend/shared/stores/store-scope.model.ts
// Authority: dsh/frontend/shared/stores — store scope selection.
// No JSX. No ui-kit. No Tamagui.

import React from "react";
import type { DshStoreAdminDetail } from "../store/store-admin.view-model";
import { fetchStoreRoleContext } from "../store/store-role.api";
import type { DshPartnerOperationalScope } from "./partner.types";
import { buildPartnerRuntimeProfile } from "./partner-store-profile";
import { fetchPartnerScopes } from "./partner.api";

export function useStoreScopeModel() {
  const [storeScopeVisible, setStoreScopeVisible] = React.useState(false);
  const [selectedStoreScopeId, setSelectedStoreScopeId] = React.useState<string | null>(null);
  const [scopes, setScopes] = React.useState<DshPartnerOperationalScope[]>([]);
  const [storeContext, setStoreContext] = React.useState<DshStoreAdminDetail | null>(null);
  const [isLoadingScopes, setIsLoadingScopes] = React.useState(true);
  const [isLoadingStoreContext, setIsLoadingStoreContext] = React.useState(false);
  const [scopesError, setScopesError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setIsLoadingScopes(true);
    setScopesError(null);
    fetchPartnerScopes()
      .then((res) => {
        if (!active) return;
        setScopes(res.scopes);
        setSelectedStoreScopeId((current) => current ?? res.scopes[0]?.scopeId ?? null);
        setIsLoadingScopes(false);
      })
      .catch(() => {
        if (!active) return;
        setScopesError("تعذر تحميل نطاقات المتاجر من DSH.");
        setIsLoadingScopes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedStoreScope = React.useMemo(
    () => scopes.find((scope) => scope.scopeId === selectedStoreScopeId) ?? scopes[0],
    [scopes, selectedStoreScopeId],
  );

  React.useEffect(() => {
    let active = true;
    const storeId = selectedStoreScope?.storeId;
    if (!storeId) {
      setStoreContext(null);
      setIsLoadingStoreContext(false);
      return () => {
        active = false;
      };
    }

    setIsLoadingStoreContext(true);
    setStoreContext(null);
    setScopesError(null);
    void fetchStoreRoleContext(storeId).then((state) => {
      if (!active) return;
      if (state.kind === "success" && state.actorRole === "partner") {
        setStoreContext(state.store);
      } else if (state.kind === "permission_denied") {
        setScopesError("لا تملك الجلسة صلاحية قراءة سياق هذا المتجر.");
      } else if (state.kind === "service_unavailable") {
        setScopesError("خدمة سياق المتاجر غير متاحة حاليًا.");
      } else if (state.kind === "error") {
        setScopesError(state.message);
      } else {
        setScopesError("لم يعد سياق المتجر المحدد متاحًا.");
      }
      setIsLoadingStoreContext(false);
    });

    return () => {
      active = false;
    };
  }, [selectedStoreScope?.storeId]);

  const runtimePartnerProfile = React.useMemo(
    () => buildPartnerRuntimeProfile(selectedStoreScope, storeContext),
    [selectedStoreScope, storeContext],
  );

  const openStoreScope = React.useCallback(() => setStoreScopeVisible(true), []);

  return {
    storeScopeVisible,
    setStoreScopeVisible,
    selectedStoreScopeId,
    setSelectedStoreScopeId,
    selectedStoreScope,
    scopes,
    isLoadingScopes: isLoadingScopes || isLoadingStoreContext,
    scopesError,
    runtimePartnerProfile,
    openStoreScope,
  };
}
