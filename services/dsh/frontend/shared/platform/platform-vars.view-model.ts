// Canonical location: dsh/frontend/shared/platform/platform-vars.view-model.ts
// Authority: dsh/frontend/shared/platform — domain records and resolution logic for platform vars.
// control-panel UI is a read-only consumer of these functions; no local apply permitted.

import type {
  DshPlatformAuditEntry,
  DshPlatformPolicyScenario,
  DshPlatformProviderControlRecord,
  DshPlatformScopeLayer,
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
export const DSH_PLATFORM_SCOPE_PRECEDENCE: DshPlatformScopeLayer[] = [];
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
  const scopeOrder: Record<string, number> = {};
  for (const l of DSH_PLATFORM_SCOPE_PRECEDENCE) {
    scopeOrder[l.scope] = l.order;
  }
  return [...records].sort((a, b) => {
    const ao = scopeOrder[a.scope] ?? 999;
    const bo = scopeOrder[b.scope] ?? 999;
    return ao !== bo ? ao - bo : a.label.localeCompare(b.label, 'ar');
  });
}

type PlatformVarKpi = { id: string; label: string; value: string; cls: string };

export function resolvePlatformVarsFilteredScopes(
  records: readonly DshPlatformVarRecord[],
): DshPlatformVarScope[] {
  const scopes = Array.from(new Set(records.map((r) => r.scope)));
  return DSH_PLATFORM_SCOPE_PRECEDENCE.map((l) => l.scope).filter((s) => scopes.includes(s));
}

export type { DshPlatformVarRecord, DshPlatformVarStatus, DshPlatformVarScope };
