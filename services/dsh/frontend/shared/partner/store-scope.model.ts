// Canonical location: dsh/frontend/shared/stores/store-scope.model.ts
// Authority: dsh/frontend/shared/stores — store scope selection.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { DshPartnerOperationalScope } from './partner.types';
import { buildPartnerProfileFromScope } from './partner.adapters';
import { fetchPartnerScopes } from './partner.api';

export function useStoreScopeModel() {
  const [storeScopeVisible, setStoreScopeVisible] = React.useState(false);
  const [selectedStoreScopeId, setSelectedStoreScopeId] = React.useState<string | null>(null);
  const [scopes, setScopes] = React.useState<DshPartnerOperationalScope[]>([]);

  React.useEffect(() => {
    let active = true;
    fetchPartnerScopes().then((res) => {
      if (active) {
        setScopes(res.scopes);
        if (res.scopes.length > 0 && !selectedStoreScopeId) {
          setSelectedStoreScopeId(res.scopes[0]!.scopeId);
        }
      }
    }).catch(console.error);
    return () => { active = false; };
  }, [selectedStoreScopeId]);

  const selectedStoreScope = React.useMemo(
    () => scopes.find((o) => o.scopeId === selectedStoreScopeId) ?? scopes[0],
    [scopes, selectedStoreScopeId],
  );

  const runtimePartnerProfile = React.useMemo(
    () => buildPartnerProfileFromScope(selectedStoreScope),
    [selectedStoreScope],
  );

  const openStoreScope = React.useCallback(() => setStoreScopeVisible(true), []);

  return {
    storeScopeVisible,
    setStoreScopeVisible,
    selectedStoreScopeId,
    setSelectedStoreScopeId,
    selectedStoreScope,
    scopes,
    runtimePartnerProfile,
    openStoreScope,
  };
}
