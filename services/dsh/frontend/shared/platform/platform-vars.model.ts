// Canonical location: dsh/frontend/shared/platform/platform-vars.model.ts
// Authority: dsh/frontend/shared/platform — react model hook for managing platform vars workspace state.
// No JSX. No ui-kit. No Tamagui.

import React from 'react';
import type { AuditEvent } from './platform-audit-state';
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
  for (const v of all) {
    init[v.id] = { current: v.currentValue, proposed: v.proposedValue ?? null, status: v.status };
  }
  return init;
}

export function usePlatformVarsModel({
  activeDomain,
  addAuditEvent,
}: {
  activeDomain: VarsDomainId;
  addAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
}) {
  const [varsState] = React.useState<Record<string, PlatformVarsSessionEntry>>(buildInitialVarsState);
  const [activeScope, setActiveScope] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editVal, setEditVal] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState<PlatformVarMutationAction | null>(null);

  const getLive = React.useCallback(
    (v: DshPlatformVarRecord): DshPlatformVarRecord => {
      const s = varsState[v.id];
      if (!s) return { ...v, proposedValue: v.proposedValue ?? null };
      return { ...v, currentValue: s.current, proposedValue: s.proposed };
    },
    [varsState],
  );

  // Initialize selected item on domain change
  React.useEffect(() => {
    setActiveScope('all');
    setShowConfirm(null);
    const records = resolvePlatformVarsDomainRecords(activeDomain);
    const first = records[0] ?? null;
    setSelectedId(first?.id ?? null);
    setEditVal(first ? (getLive(first).proposedValue ?? '') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDomain]);

  // Sync edit field when selection changes
  React.useEffect(() => {
    setShowConfirm(null);
    if (!selectedId) return;
    const all = [
      ...DSH_PLATFORM_OPERATIONAL_VARS,
      ...DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS,
      ...DSH_PLATFORM_PROVIDER_CONTROL_VARS,
      ...DSH_PLATFORM_DESIGN_POLICY_VARS,
    ];
    const found = all.find((r) => r.id === selectedId);
    if (found) setEditVal(getLive(found).proposedValue ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const domainRecords = React.useMemo(() => {
    return sortPlatformVarsByScope(resolvePlatformVarsDomainRecords(activeDomain));
  }, [activeDomain]);

  const filteredRecords = React.useMemo(() => {
    return activeScope === 'all'
      ? domainRecords
      : domainRecords.filter((r) => r.scope === (activeScope as DshPlatformVarScope));
  }, [domainRecords, activeScope]);

  const rawSelected = filteredRecords.find((r) => r.id === selectedId) ?? filteredRecords[0] ?? domainRecords[0] ?? null;
  const selectedVar = rawSelected ? getLive(rawSelected) : null;

  const orderedScopes = React.useMemo(() => {
    return resolvePlatformVarsFilteredScopes(domainRecords);
  }, [domainRecords]);

  const linkedScenarios = React.useMemo((): DshPlatformPolicyScenario[] => {
    if (!selectedVar) return [];
    return DSH_PLATFORM_POLICY_SCENARIOS.filter((s) => s.relatedKeys.includes(selectedVar.key));
  }, [selectedVar]);

  const linkedAudits = React.useMemo((): DshPlatformAuditEntry[] => {
    if (!selectedVar) return [];
    return DSH_PLATFORM_AUDIT_LOG.filter((e) => e.targetKey === selectedVar.key);
  }, [selectedVar]);

  const quickPicks = React.useMemo((): readonly string[] => {
    if (!selectedVar) return [];
    return PLATFORM_VAR_QUICK_PICKS[selectedVar.key] ?? [];
  }, [selectedVar]);

  const hasProposed = Boolean(selectedVar?.proposedValue);
  const isDesign = selectedVar ? isPlatformDesignVar(selectedVar.key) : false;
  const isValidDesignVal = isDesign ? (PLATFORM_VAR_QUICK_PICKS[selectedVar?.key ?? ''] ?? []).includes(editVal) : true;

  // disabled-by-policy: platform var mutations require a real backend API contract.
  // No local save, no simulated API. UI must display read-only state until API is implemented.
  const confirmSaveProposed = React.useCallback(
    async (_selectedRecord: DshPlatformVarRecord, _proposedValue: string) => {
      addAuditEvent({
        action: 'حفظ مقترح (محجوب بالسياسة)',
        operator: 'platform-operator',
        status: 'blocked',
        oldValue: '',
        newValue: '',
        reason: 'platform vars mutations disabled-by-policy: requires backend API contract',
        scope: 'platform',
        impact: 'no change applied',
        rollbackAvailable: false,
      });
      setShowConfirm(null);
    },
    [addAuditEvent],
  );

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
