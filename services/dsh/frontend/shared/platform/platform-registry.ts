
export type PlatformMainTabId =
  | "overview"
  | "variables"
  | "services"
  | "providers"
  | "policies"
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
  { id: "policies", label: "السياسات ومناطق الخدمة" },
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
  owner: "platform / core-platform-control / DSH operational policy owners",
  ownerPath: "core/platform-control + services/dsh/backend/internal/platformpolicies",
  runtimeOwner: "platform-control and DSH PostgreSQL governed stores",
  financialBoundary: "WLT remains the exclusive financial truth owner",
};
