// Canonical location: dsh/frontend/shared/stores/store-scope.model.ts
// Authority: dsh/frontend/shared/stores — store scope selection.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import { storeScopeOptions } from './partner.types';
import { buildPartnerProfileFromScope } from './partner.adapters';

export function useStoreScopeModel() {
  const [storeScopeVisible, setStoreScopeVisible] = React.useState(false);
  const [selectedStoreScopeId, setSelectedStoreScopeId] = React.useState('all');

  const selectedStoreScope = React.useMemo(
    () => storeScopeOptions.find((o) => o.id === selectedStoreScopeId) ?? storeScopeOptions[0]!,
    [selectedStoreScopeId],
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
    runtimePartnerProfile,
    openStoreScope,
  };
}
