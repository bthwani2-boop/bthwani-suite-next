/**
 * Canonical navigation and ownership metadata for the sovereign Platform
 * control plane. Live metrics and workflow states must come from
 * core/platform-control; this registry never manufactures runtime truth.
 */

export const PLATFORM_RUNTIME_STATES = {
  fixRequired: "FIX_REQUIRED",
  partiallyBound: "PARTIALLY_BOUND",
  unknownHealth: "UNKNOWN_HEALTH",
  rollbackUnavailable: "ROLLBACK_UNAVAILABLE",
  contractRequired: "CONTRACT_REQUIRED",
  readOnlyBound: "READ_ONLY_BOUND",
  operational: "OPERATIONAL",
} as const;

export type PlatformMainTabId =
  | "overview"
  | "variables"
  | "services"
  | "providers"
  | "health"
  | "rollback"
  | "canary";

export type PlatformMainTabMeta = {
  readonly id: PlatformMainTabId;
  readonly label: string;
};

export const PLATFORM_MAIN_TABS: readonly PlatformMainTabMeta[] = [
  { id: "overview", label: "نظرة عامة عن المنصة" },
  { id: "variables", label: "المتغيرات والأعلام" },
  { id: "services", label: "الخدمات" },
  { id: "providers", label: "المزودون" },
  { id: "health", label: "الصحة والأداء" },
  { id: "rollback", label: "دورة التغيير والتراجع" },
  { id: "canary", label: "الإطلاق التدريجي" },
] as const;

export type PlatformOwnershipInfo = {
  readonly owner: string;
  readonly ownerPath: string;
  readonly runtimeOwner: string;
  readonly financialBoundary: string;
};

export const PLATFORM_OWNERSHIP: PlatformOwnershipInfo = {
  owner: "platform / core-platform-control",
  ownerPath: "core/platform-control",
  runtimeOwner: "platform-control PostgreSQL governed store",
  financialBoundary: "WLT remains the exclusive financial truth owner",
};
