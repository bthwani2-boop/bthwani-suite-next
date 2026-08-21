import type { CaptainSupportRoute, DshCaptainRoute } from "../shared/delivery";

export const DSH_CAPTAIN_ACCOUNT_SECTIONS = [
  "profile",
  "finance",
  "orders",
  "docs",
  "shifts",
  "support",
] as const;

export type DshCaptainAccountSection = (typeof DSH_CAPTAIN_ACCOUNT_SECTIONS)[number];

export const DSH_CAPTAIN_SUPPORT_ROUTES = [
  "chat-read-ack",
  "chat-send",
  "order-accept",
  "order-deliver",
  "order-details",
  "order-get",
  "order-pickup",
  "orders-list",
  "orders-offers-list",
  "profile-get",
  "proof-upload",
  "tier-evaluate",
  "tier-info",
] as const satisfies readonly CaptainSupportRoute[];

export type DshCaptainNavigationRoute =
  | { readonly kind: "home" }
  | { readonly kind: "inbox" }
  | { readonly kind: "detail"; readonly assignmentId: string }
  | { readonly kind: "map"; readonly assignmentId: string }
  | { readonly kind: "pickup-dropoff"; readonly assignmentId: string }
  | { readonly kind: "pod-submission"; readonly assignmentId: string }
  | { readonly kind: "bell" }
  | { readonly kind: "account" }
  | { readonly kind: "account-section"; readonly section: DshCaptainAccountSection }
  | { readonly kind: "support-directory"; readonly assignmentId?: string }
  | { readonly kind: "support-screen"; readonly screenId: CaptainSupportRoute; readonly assignmentId?: string };

export type DshCaptainNavigationMode = "push" | "replace";

export type DshCaptainNavigation = {
  readonly navigate: (route: DshCaptainNavigationRoute, mode?: DshCaptainNavigationMode) => void;
  readonly back: () => void;
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

function withAssignment(path: string, assignmentId?: string): string {
  const id = normalized(assignmentId);
  return id ? `${path}?assignmentId=${encodeURIComponent(id)}` : path;
}

export function dshCaptainRouteToPath(route: DshCaptainNavigationRoute): string {
  switch (route.kind) {
    case "home": return "/";
    case "inbox": return "/orders";
    case "detail": return `/orders/${segment(route.assignmentId)}`;
    case "map": return `/orders/${segment(route.assignmentId)}/map`;
    case "pickup-dropoff": return `/orders/${segment(route.assignmentId)}/execution`;
    case "pod-submission": return `/orders/${segment(route.assignmentId)}/proof`;
    case "bell": return "/notifications";
    case "account": return "/account";
    case "account-section": return `/account/${segment(route.section)}`;
    case "support-directory": return withAssignment("/support", route.assignmentId);
    case "support-screen": return withAssignment(`/support/${segment(route.screenId)}`, route.assignmentId);
  }
}

export function dshCaptainLegacyRoute(route: DshCaptainNavigationRoute): DshCaptainRoute {
  switch (route.kind) {
    case "home": return "home";
    case "inbox": return "inbox";
    case "detail": return "detail";
    case "map": return "map";
    case "pickup-dropoff": return "pickup-dropoff";
    case "pod-submission": return "pod-submission";
    case "bell": return "bell";
    case "account": return "account";
    case "support-directory": return "support-directory";
    case "support-screen": return "support-screen";
    case "account-section": {
      switch (route.section) {
        case "profile": return "account-profile";
        case "finance": return "account-finance";
        case "orders": return "account-orders";
        case "docs": return "account-docs";
        case "shifts": return "account-shifts";
        case "support": return "account-support";
      }
    }
  }
}

export function dshCaptainRouteAssignmentId(route: DshCaptainNavigationRoute): string | undefined {
  switch (route.kind) {
    case "detail":
    case "map":
    case "pickup-dropoff":
    case "pod-submission":
      return normalized(route.assignmentId);
    case "support-directory":
    case "support-screen":
      return normalized(route.assignmentId);
    default:
      return undefined;
  }
}

export function dshCaptainRouteSupportScreen(route: DshCaptainNavigationRoute): CaptainSupportRoute {
  return route.kind === "support-screen" ? route.screenId : "orders-list";
}

export function parseDshCaptainAccountSection(value: string | undefined): DshCaptainAccountSection | undefined {
  return oneOf(value, DSH_CAPTAIN_ACCOUNT_SECTIONS);
}

export function parseDshCaptainSupportRoute(value: string | undefined): CaptainSupportRoute | undefined {
  return oneOf(value, DSH_CAPTAIN_SUPPORT_ROUTES);
}
