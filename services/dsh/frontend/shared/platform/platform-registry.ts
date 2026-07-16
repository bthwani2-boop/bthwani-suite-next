/**
 * platform-registry.ts
 *
 * العقل الحاكم لقسم المنصة والسياسات السيادية عبر أسطح DSH.
 * يحدد التبويبات والمؤشرات ونطاقات العمليات والتحقق.
 */

export const PLATFORM_RUNTIME_STATES = {
  fixRequired: "FIX_REQUIRED",
  partiallyBound: "PARTIALLY_BOUND",
  unknownHealth: "UNKNOWN_HEALTH",
  rollbackUnavailable: "ROLLBACK_UNAVAILABLE",
  contractRequired: "CONTRACT_REQUIRED",
} as const;

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type PlatformMainTabId =
  | "variables"
  | "services"
  | "providers"
  | "canary"
  | "health"
  | "rollback"
  | "overview"
  | "notifications";

export type PlatformMainTabMeta = {
  readonly id: PlatformMainTabId;
  readonly label: string;
};

export const PLATFORM_MAIN_TABS: readonly PlatformMainTabMeta[] = [
  { id: "variables", label: "المتغيرات" },
  { id: "services",  label: "الخدمات" },
  { id: "providers", label: "المزودون" },
  { id: "canary",    label: "الإطلاق التدريجي" },
  { id: "health",    label: "الصحة والأداء" },
  { id: "rollback",  label: "السجل والتراجع" },
  { id: "overview",  label: "نظرة عامة عن المنصة" },
  { id: "notifications", label: "إعدادات الإشعارات" },
] as const;

// ─── Scope / Layer Tab Registry ───────────────────────────────────────────────

export type PlatformScopeId =
  | "dsh-ops"
  | "wlt-bridge"
  | "providers-scope"
  | "identity-policies"
  | "surface-layers";

export type PlatformScopeMeta = {
  readonly id: PlatformScopeId;
  readonly label: string;
};

export const PLATFORM_SCOPES: readonly PlatformScopeMeta[] = [
  { id: "dsh-ops",           label: "عمليات DSH" },
  { id: "wlt-bridge",        label: "جسر WLT" },
  { id: "providers-scope",   label: "المزودين" },
  { id: "identity-policies", label: "سياسات الهوية" },
  { id: "surface-layers",    label: "طبقات الأسطح" },
] as const;

// ─── KPIs Builder ──────────────────────────────────────────────────────────────

export type PlatformKpiMetrics = {
  readonly policiesCount: string;
  readonly providersCount: string;
  readonly activeReleases: string;
  readonly alertsCount: string;
};

export function buildPlatformKpiMetrics(): PlatformKpiMetrics {
  return {
    policiesCount: PLATFORM_RUNTIME_STATES.contractRequired,
    providersCount: PLATFORM_RUNTIME_STATES.partiallyBound,
    activeReleases: PLATFORM_RUNTIME_STATES.contractRequired,
    alertsCount: PLATFORM_RUNTIME_STATES.unknownHealth,
  };
}

// ─── Platform Ownership info ──────────────────────────────────────────────────

export type PlatformOwnershipInfo = {
  readonly owner: string;
  readonly ownerPath: string;
  readonly activeServices: string;
  readonly status: string;
};

export const PLATFORM_OWNERSHIP: PlatformOwnershipInfo = {
  owner: "platform / dsh-platform",
  ownerPath: "future: core/platform-control",
  activeServices: PLATFORM_RUNTIME_STATES.contractRequired,
  status: `${PLATFORM_RUNTIME_STATES.fixRequired} / ${PLATFORM_RUNTIME_STATES.partiallyBound}`,
};

// ─── Inner Stats Registry ─────────────────────────────────────────────────────

export type PlatformInnerStats = {
  readonly total: number;
  readonly linked: number;
  readonly contractRequired: number;
  readonly wltCount: number;
};

export function buildPlatformInnerStats(): PlatformInnerStats {
  return {
    total: 0,
    linked: 0,
    contractRequired: 0,
    wltCount: 0,
  };
}
