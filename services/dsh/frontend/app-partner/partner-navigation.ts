import {
  DSH_PARTNER_OPERATIONAL_FLOW_IDS,
  DSH_PARTNER_SUPPORT_ISSUE_CATEGORY_IDS,
  DSH_PARTNER_SUPPORT_ROUTE_IDS,
  type DshPartnerOperationalFlowId,
  type DshPartnerSupportCommandContext,
  type DshPartnerSupportCommandFilterId,
  type DshPartnerSupportIssueCategoryId,
  type DshPartnerSupportRouteId,
  type PartnerHubSection,
} from "../shared/partner/partner.types";
import {
  buildSupportCommandContextFromOperationalFlow,
  buildSupportCommandContextFromSupportRoute,
  defaultSupportCommandContext,
} from "../shared/support/support.partner-context";

export const DSH_PARTNER_HUB_SECTIONS = [
  "hub",
  "profile",
  "operations",
  "inventory",
  "wallet",
  "analytics",
  "settings",
] as const satisfies readonly PartnerHubSection[];

const SUPPORT_FILTER_IDS = [
  "all",
  "active-orders",
  "order-issues",
  "conversations",
  "inventory-branch",
  "escalation",
  "urgent",
] as const satisfies readonly DshPartnerSupportCommandFilterId[];

const SUPPORT_SOURCES = ["operations", "bell", "settings", "orders", "hub"] as const;
type PartnerSupportSource = NonNullable<DshPartnerSupportCommandContext["source"]>;

export type DshPartnerNavigationRoute =
  | { readonly kind: "entry" }
  | { readonly kind: "home"; readonly section: PartnerHubSection }
  | { readonly kind: "inbox"; readonly search?: boolean }
  | { readonly kind: "bell"; readonly orderId?: string }
  | { readonly kind: "support-directory"; readonly context: DshPartnerSupportCommandContext; readonly orderId?: string }
  | { readonly kind: "support-screen"; readonly screenId: DshPartnerSupportRouteId; readonly context: DshPartnerSupportCommandContext; readonly orderId?: string }
  | { readonly kind: "inventory-management" }
  | { readonly kind: "store-courier" }
  | { readonly kind: "product-edit"; readonly productId: string }
  | { readonly kind: "category-management" }
  | { readonly kind: "product-media"; readonly productId: string }
  | { readonly kind: "product-controls"; readonly productId: string }
  | { readonly kind: "commercial-model" }
  | { readonly kind: "promotions" }
  | { readonly kind: "team" };

export type DshPartnerNavigationMode = "push" | "replace";
export type DshPartnerNavigation = {
  readonly navigate: (route: DshPartnerNavigationRoute, mode?: DshPartnerNavigationMode) => void;
  readonly back: () => void;
};

export type DshPartnerSupportSearchParams = {
  readonly filterId?: string;
  readonly caseId?: string;
  readonly issueCategoryId?: string;
  readonly flowId?: string;
  readonly preferredScreen?: string;
  readonly source?: string;
};

function normalized(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate ? candidate : undefined;
}

function oneOf<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  const candidate = normalized(value);
  return candidate && (values as readonly string[]).includes(candidate) ? candidate as T : undefined;
}

function segment(value: string): string {
  return encodeURIComponent(value.trim());
}

function withQuery(path: string, entries: readonly (readonly [string, string | undefined])[]): string {
  const query = entries
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${path}?${query}` : path;
}

function supportContextEntries(context: DshPartnerSupportCommandContext): readonly (readonly [string, string | undefined])[] {
  return [
    ["filterId", context.filterId],
    ["caseId", context.highlightedCaseId ?? undefined],
    ["issueCategoryId", context.highlightedIssueCategoryId ?? undefined],
    ["flowId", context.preferredOperationalFlowId ?? undefined],
    ["preferredScreen", context.preferredSupportRouteId ?? undefined],
    ["source", context.source ?? undefined],
  ];
}

export function dshPartnerRouteToPath(route: DshPartnerNavigationRoute): string {
  switch (route.kind) {
    case "entry": return "/entry";
    case "home": return `/account/${segment(route.section)}`;
    case "inbox": return withQuery("/orders", [["search", route.search ? "1" : undefined]]);
    case "bell": return withQuery("/notifications", [["orderId", route.orderId]]);
    case "support-directory": return withQuery("/support", [...supportContextEntries(route.context), ["orderId", route.orderId]]);
    case "support-screen": return withQuery(`/support/${segment(route.screenId)}`, [...supportContextEntries(route.context), ["orderId", route.orderId]]);
    case "inventory-management": return "/catalog";
    case "store-courier": return "/operations/store-courier";
    case "product-edit": return `/catalog/products/${segment(route.productId)}/edit`;
    case "category-management": return "/catalog/categories";
    case "product-media": return `/catalog/products/${segment(route.productId)}/media`;
    case "product-controls": return `/catalog/products/${segment(route.productId)}/controls`;
    case "commercial-model": return "/commercial";
    case "promotions": return "/promotions";
    case "team": return "/team";
  }
}

export function buildDshPartnerSupportDirectoryRoute(
  context: Partial<DshPartnerSupportCommandContext> = {},
  orderId?: string,
): Extract<DshPartnerNavigationRoute, { kind: "support-directory" }> {
  const normalizedOrderId = normalized(orderId);
  return {
    kind: "support-directory",
    context: { ...defaultSupportCommandContext, ...context },
    ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
  };
}

export function buildDshPartnerSupportDirectoryRouteFromFlow(
  flowId: DshPartnerOperationalFlowId,
  source: PartnerSupportSource = "operations",
  orderId?: string,
): Extract<DshPartnerNavigationRoute, { kind: "support-directory" }> {
  const normalizedOrderId = normalized(orderId);
  return {
    kind: "support-directory",
    context: buildSupportCommandContextFromOperationalFlow(flowId, source),
    ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
  };
}

export function buildDshPartnerSupportScreenRoute(
  screenId: DshPartnerSupportRouteId,
  source: PartnerSupportSource = "operations",
  orderId?: string,
): Extract<DshPartnerNavigationRoute, { kind: "support-screen" }> {
  const normalizedOrderId = normalized(orderId);
  return {
    kind: "support-screen",
    screenId,
    context: buildSupportCommandContextFromSupportRoute(screenId, source),
    ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
  };
}

export function parseDshPartnerHubSection(value: string | undefined): PartnerHubSection | undefined {
  return oneOf(value, DSH_PARTNER_HUB_SECTIONS);
}

export function parseDshPartnerSupportRouteId(value: string | undefined): DshPartnerSupportRouteId | undefined {
  return oneOf(value, DSH_PARTNER_SUPPORT_ROUTE_IDS);
}

export function parseDshPartnerSupportContext(
  params: DshPartnerSupportSearchParams,
  fallbackScreen?: DshPartnerSupportRouteId,
): DshPartnerSupportCommandContext {
  const base = fallbackScreen
    ? buildSupportCommandContextFromSupportRoute(fallbackScreen)
    : defaultSupportCommandContext;
  return {
    filterId: oneOf(params.filterId, SUPPORT_FILTER_IDS) ?? base.filterId,
    highlightedCaseId: normalized(params.caseId) ?? base.highlightedCaseId ?? null,
    highlightedIssueCategoryId:
      oneOf<DshPartnerSupportIssueCategoryId>(params.issueCategoryId, DSH_PARTNER_SUPPORT_ISSUE_CATEGORY_IDS)
      ?? base.highlightedIssueCategoryId
      ?? null,
    preferredOperationalFlowId:
      oneOf<DshPartnerOperationalFlowId>(params.flowId, DSH_PARTNER_OPERATIONAL_FLOW_IDS)
      ?? base.preferredOperationalFlowId
      ?? null,
    preferredSupportRouteId:
      oneOf<DshPartnerSupportRouteId>(params.preferredScreen, DSH_PARTNER_SUPPORT_ROUTE_IDS)
      ?? fallbackScreen
      ?? base.preferredSupportRouteId
      ?? null,
    source: oneOf<PartnerSupportSource>(params.source, SUPPORT_SOURCES) ?? base.source ?? "operations",
  };
}
