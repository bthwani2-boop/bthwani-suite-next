/**
 * platform-registry.ts
 *
 * العقل الحاكم لقسم المنصة والسياسات السيادية عبر أسطح DSH.
 * يحدد التبويبات والمؤشرات ونطاقات العمليات والتحقق.
 */

import { PROVIDER_SECRET_POLICIES } from "./platform-provider-secrets.policy";
import { PLATFORM_PROVIDER_REGISTRY } from "./platform-provider.registry";

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type PlatformMainTabId =
  | "variables"
  | "services"
  | "providers"
  | "canary"
  | "health"
  | "rollback"
  | "overview";

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
  readonly policiesCount: number;
  readonly providersCount: number;
  readonly activeReleases: number;
  readonly alertsCount: number;
};

export function buildPlatformKpiMetrics(): PlatformKpiMetrics {
  return {
    policiesCount: Object.keys(PROVIDER_SECRET_POLICIES).length,
    providersCount: PLATFORM_PROVIDER_REGISTRY.length,
    activeReleases: 0,
    alertsCount: 0,
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
  ownerPath: "platform",
  activeServices: "1/1",
  status: "جاهز",
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
