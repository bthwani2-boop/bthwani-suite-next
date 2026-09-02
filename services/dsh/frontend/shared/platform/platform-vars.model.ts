// Canonical location: dsh/frontend/shared/platform/platform-vars.model.ts
// Authority: dsh/frontend/shared/platform — React view model over the
// core/platform-control generated read model. No local apply is permitted.

import React from 'react';
import type { PlatformVariable } from './platform-control.api';
import {
  resolvePlatformVarsDomainRecords,
  sortPlatformVarsByScope,
  resolvePlatformVarsFilteredScopes,
  platformVariableIdentity,
  platformVariableEditorValue,
  VarsDomainId,
} from './platform-vars.view-model';

export function usePlatformVarsModel({
  activeDomain,
  variables,
}: {
  readonly activeDomain: VarsDomainId;
  readonly variables: readonly PlatformVariable[];
}) {
  const [activeScope, setActiveScope] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editVal, setEditVal] = React.useState('');

  React.useEffect(() => {
    setActiveScope('all');
    const first = resolvePlatformVarsDomainRecords(variables, activeDomain)[0] ?? null;
    setSelectedId(first ? platformVariableIdentity(first) : null);
  }, [activeDomain, variables]);

  const domainRecords = React.useMemo(
    () => sortPlatformVarsByScope(resolvePlatformVarsDomainRecords(variables, activeDomain)),
    [activeDomain, variables],
  );

  const filteredRecords = React.useMemo(
    () => activeScope === 'all'
      ? domainRecords
      : domainRecords.filter((record) => record.scopeType === activeScope),
    [activeScope, domainRecords],
  );

  const rawSelected =
    filteredRecords.find((record) => platformVariableIdentity(record) === selectedId) ??
    filteredRecords[0] ??
    domainRecords[0] ??
    null;
  const selectedVar = rawSelected;

  React.useEffect(() => {
    if (!selectedVar) {
      setEditVal('');
      return;
    }
    setEditVal(platformVariableEditorValue(selectedVar));
  }, [selectedVar]);

  const orderedScopes = React.useMemo(
    () => resolvePlatformVarsFilteredScopes(domainRecords),
    [domainRecords],
  );

  return {
    activeScope,
    setActiveScope,
    selectedId,
    setSelectedId,
    editVal,
    setEditVal,
    filteredRecords,
    selectedVar,
    orderedScopes,
  };
}
