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

export const DOMAIN_TABS: readonly { id: VarsDomainId; label: string }[] = [
  { id: 'dsh',      label: 'عمليات DSH' },
  { id: 'wlt',      label: 'جسر WLT' },
  { id: 'provider', label: 'المزودين' },
  { id: 'design',   label: 'سياسات الهوية' },
  { id: 'policy',   label: 'الأسبقية' },
] as const;


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
  const scopeOrder = new Map(DSH_PLATFORM_SCOPE_PRECEDENCE.map((l) => [l.scope, l.order]));
  return [...records].sort((a, b) => {
    const ao = scopeOrder.get(a.scope) ?? 999;
    const bo = scopeOrder.get(b.scope) ?? 999;
    return ao !== bo ? ao - bo : a.label.localeCompare(b.label, 'ar');
  });
}

export type PlatformVarKpi = { id: string; label: string; value: string; cls: string };

export function resolvePlatformVarsDomainKpis(
  domain: VarsDomainId,
  kpiCssClasses: { warning: string; success: string; danger: string },
): PlatformVarKpi[] {
  if (domain === 'policy') {
    const blocked = DSH_PLATFORM_POLICY_SCENARIOS.filter((s) => s.blockedReason.length > 0).length;
    return [
      { id: 'p', label: 'طبقات',      value: String(DSH_PLATFORM_SCOPE_PRECEDENCE.length),    cls: '' },
      { id: 's', label: 'سيناريوهات', value: String(DSH_PLATFORM_POLICY_SCENARIOS.length),    cls: kpiCssClasses.warning },
      { id: 'a', label: 'تدقيق',      value: String(DSH_PLATFORM_AUDIT_LOG.length),           cls: kpiCssClasses.success },
      { id: 'b', label: 'محجوب',      value: String(blocked),                                 cls: kpiCssClasses.danger },
    ];
  }
  const records = resolvePlatformVarsDomainRecords(domain);
  return [
    { id: 'total',    label: 'إجمالي',    value: String(records.length),                                                             cls: '' },
    { id: 'binding',  label: 'مرتبط',     value: String(records.filter((r) => r.status === 'runtime-bound').length),                 cls: kpiCssClasses.success },
    { id: 'contract', label: 'يتطلب عقد', value: String(records.filter((r) => r.status === 'contract-required').length),             cls: kpiCssClasses.warning },
    { id: 'wlt',      label: 'WLT',        value: String(records.filter((r) => r.owner === 'WLT').length),                           cls: kpiCssClasses.danger },
  ];
}

export function resolvePlatformVarsFilteredScopes(
  records: readonly DshPlatformVarRecord[],
): DshPlatformVarScope[] {
  const scopes = Array.from(new Set(records.map((r) => r.scope)));
  return DSH_PLATFORM_SCOPE_PRECEDENCE.map((l) => l.scope).filter((s) => scopes.includes(s));
}

export function isProviderVarRecord(r: DshPlatformVarRecord): r is DshPlatformProviderControlRecord {
  return 'providerId' in r;
}

export type { DshPlatformVarRecord, DshPlatformVarStatus, DshPlatformVarScope };
