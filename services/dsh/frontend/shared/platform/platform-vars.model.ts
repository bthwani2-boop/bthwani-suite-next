// Canonical location: dsh/frontend/shared/platform/platform-vars.model.ts
// Authority: dsh/frontend/shared/platform — react model hook for managing platform vars workspace state.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type {
  DshPlatformVarRecord,
  DshPlatformVarScope,
  DshPlatformPolicyScenario,
  DshPlatformAuditEntry,
  DshPlatformVarStatus,
} from './platform.types';
import {
  DSH_PLATFORM_AUDIT_LOG,
  DSH_PLATFORM_OPERATIONAL_VARS,
  DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS,
  DSH_PLATFORM_PROVIDER_CONTROL_VARS,
  DSH_PLATFORM_DESIGN_POLICY_VARS,
  DSH_PLATFORM_POLICY_SCENARIOS,
  resolvePlatformVarsDomainRecords,
  sortPlatformVarsByScope,
  resolvePlatformVarsFilteredScopes,
  VarsDomainId,
} from './platform-vars.view-model';
import {
  isPlatformDesignVar,
  PLATFORM_VAR_QUICK_PICKS,
  PlatformVarMutationAction,
} from './platform-vars.policy';

export type PlatformVarsSessionEntry = {
  readonly current: string;
  readonly proposed: string | null;
  readonly status: DshPlatformVarStatus;
};

function buildInitialVarsState(): Record<string, PlatformVarsSessionEntry> {
  const init: Record<string, PlatformVarsSessionEntry> = {};
  const all = [
    ...DSH_PLATFORM_OPERATIONAL_VARS,
    ...DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS,
    ...DSH_PLATFORM_PROVIDER_CONTROL_VARS,
    ...DSH_PLATFORM_DESIGN_POLICY_VARS,
  ];
  for (const variable of all) {
    init[variable.id] = {
      current: variable.currentValue,
      proposed: variable.proposedValue ?? null,
      status: variable.status,
    };
  }
  return init;
}

/**
 * Read-only platform variables model.
 *
 * The displayed records are static policy declarations, not runtime values.
 * Mutations remain disabled until Platform Control exposes governed read,
 * propose, approve, rollout, rollback, and audit contracts.
 */
export function usePlatformVarsModel({ activeDomain }: { activeDomain: VarsDomainId }) {
  const [varsState] = React.useState<Record<string, PlatformVarsSessionEntry>>(buildInitialVarsState);
  const [activeScope, setActiveScope] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editVal, setEditVal] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState<PlatformVarMutationAction | null>(null);

  const getLive = React.useCallback(
    (variable: DshPlatformVarRecord): DshPlatformVarRecord => {
      const session = varsState[variable.id];
      if (!session) return { ...variable, proposedValue: variable.proposedValue ?? null };
      return {
        ...variable,
        currentValue: session.current,
        proposedValue: session.proposed,
      };
    },
    [varsState],
  );

  React.useEffect(() => {
    setActiveScope('all');
    setShowConfirm(null);
    const records = resolvePlatformVarsDomainRecords(activeDomain);
    const first = records[0] ?? null;
    setSelectedId(first?.id ?? null);
    setEditVal(first ? (getLive(first).proposedValue ?? '') : '');
  }, [activeDomain, getLive]);

  React.useEffect(() => {
    setShowConfirm(null);
    if (!selectedId) return;
    const all = [
      ...DSH_PLATFORM_OPERATIONAL_VARS,
      ...DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS,
      ...DSH_PLATFORM_PROVIDER_CONTROL_VARS,
      ...DSH_PLATFORM_DESIGN_POLICY_VARS,
    ];
    const found = all.find((record) => record.id === selectedId);
    if (found) setEditVal(getLive(found).proposedValue ?? '');
  }, [getLive, selectedId]);

  const domainRecords = React.useMemo(
    () => sortPlatformVarsByScope(resolvePlatformVarsDomainRecords(activeDomain)),
    [activeDomain],
  );

  const filteredRecords = React.useMemo(
    () => activeScope === 'all'
      ? domainRecords
      : domainRecords.filter((record) => record.scope === (activeScope as DshPlatformVarScope)),
    [activeScope, domainRecords],
  );

  const rawSelected =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    domainRecords[0] ??
    null;
  const selectedVar = rawSelected ? getLive(rawSelected) : null;

  const orderedScopes = React.useMemo(
    () => resolvePlatformVarsFilteredScopes(domainRecords),
    [domainRecords],
  );

  const linkedScenarios = React.useMemo((): DshPlatformPolicyScenario[] => {
    if (!selectedVar) return [];
    return DSH_PLATFORM_POLICY_SCENARIOS.filter((scenario) =>
      scenario.relatedKeys.includes(selectedVar.key),
    );
  }, [selectedVar]);

  const linkedAudits = React.useMemo((): DshPlatformAuditEntry[] => {
    if (!selectedVar) return [];
    return DSH_PLATFORM_AUDIT_LOG.filter((entry) => entry.targetKey === selectedVar.key);
  }, [selectedVar]);

  const quickPicks = React.useMemo((): readonly string[] => {
    if (!selectedVar) return [];
    return PLATFORM_VAR_QUICK_PICKS[selectedVar.key] ?? [];
  }, [selectedVar]);

  const hasProposed = Boolean(selectedVar?.proposedValue);
  const isDesign = selectedVar ? isPlatformDesignVar(selectedVar.key) : false;
  const isValidDesignVal = isDesign
    ? (PLATFORM_VAR_QUICK_PICKS[selectedVar?.key ?? ''] ?? []).includes(editVal)
    : true;

  const confirmSaveProposed = React.useCallback(async () => {
    // Fail closed: no local state or audit event is written.
    setShowConfirm(null);
    return { ok: false as const, reason: 'PLATFORM_CONTROL_MUTATION_CONTRACT_REQUIRED' };
  }, []);

  return {
    activeScope,
    setActiveScope,
    selectedId,
    setSelectedId,
    editVal,
    setEditVal,
    showConfirm,
    setShowConfirm,
    filteredRecords,
    selectedVar,
    orderedScopes,
    linkedScenarios,
    linkedAudits,
    quickPicks,
    hasProposed,
    isDesignVar: isDesign,
    isValidDesignVal,
    confirmSaveProposed,
    getLive,
  };
}
