// Canonical location: dsh/frontend/shared/platform/platform-vars.view-model.ts
// Authority: dsh/frontend/shared/platform — domain records and resolution logic for platform vars.
// control-panel UI is a read-only consumer of these functions; no local apply permitted.

import type {
  DshPlatformAuditEntry,
  DshPlatformPolicyScenario,
  DshPlatformProviderControlRecord,
  DshPlatformVarRecord,
  DshPlatformVarScope,
  DshPlatformVarStatus,
} from './platform.types';

export type VarsDomainId = 'dsh' | 'wlt' | 'provider' | 'policy' | 'design';


// Domain record registries — populated when backend contracts are implemented.
// All mutations MUST go through backend API; no local apply permitted.
export const DSH_PLATFORM_AUDIT_LOG: DshPlatformAuditEntry[] = [];
export const DSH_PLATFORM_OPERATIONAL_VARS: DshPlatformVarRecord[] = [];
export const DSH_PLATFORM_PROVIDER_CONTROL_VARS: DshPlatformProviderControlRecord[] = [];
export const DSH_PLATFORM_POLICY_SCENARIOS: DshPlatformPolicyScenario[] = [];
export const DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS: DshPlatformVarRecord[] = [];
export const DSH_PLATFORM_DESIGN_POLICY_VARS: DshPlatformVarRecord[] = [];

export function resolvePlatformVarsDomainRecords(domain: VarsDomainId): readonly DshPlatformVarRecord[] {
  if (domain === 'dsh')      return DSH_PLATFORM_OPERATIONAL_VARS;
  if (domain === 'wlt')      return DSH_PLATFORM_WLT_FINANCIAL_BRIDGE_VARS;
  if (domain === 'provider') return DSH_PLATFORM_PROVIDER_CONTROL_VARS;
  if (domain === 'design')   return DSH_PLATFORM_DESIGN_POLICY_VARS;
  return [];
}

export function sortPlatformVarsByScope(records: readonly DshPlatformVarRecord[]): DshPlatformVarRecord[] {
  return [...records].sort((a, b) => {
    return a.label.localeCompare(b.label, 'ar');
  });
}

type PlatformVarKpi = { id: string; label: string; value: string; cls: string };

export function resolvePlatformVarsFilteredScopes(
  _records: readonly DshPlatformVarRecord[],
): DshPlatformVarScope[] {
  return [];
}

export type { DshPlatformVarRecord, DshPlatformVarStatus, DshPlatformVarScope };
