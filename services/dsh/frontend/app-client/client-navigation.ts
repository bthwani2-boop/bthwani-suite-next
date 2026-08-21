import type { OrderTruth } from "../shared/order-truth";

export type DshClientRoute =
  | { readonly kind: "home" }
  | { readonly kind: "stores" }
  | { readonly kind: "store"; readonly storeId: string }
  | { readonly kind: "orders" }
  | { readonly kind: "order"; readonly orderId: string }
  | { readonly kind: "order-pickup"; readonly orderId: string }
  | { readonly kind: "order-chat"; readonly orderId: string; readonly fulfillmentMode?: OrderTruth["fulfillmentMode"] }
  | { readonly kind: "notifications" }
  | { readonly kind: "special-requests" }
  | { readonly kind: "special-request-shein" }
  | { readonly kind: "special-request-awnak" }
  | { readonly kind: "wallet" }
  | { readonly kind: "cart"; readonly storeId?: string }
  | { readonly kind: "profile" }
  | { readonly kind: "profile-commercial" }
  | { readonly kind: "profile-addresses"; readonly returnStoreId?: string }
  | { readonly kind: "profile-identity" }
  | { readonly kind: "profile-benefits" }
  | { readonly kind: "profile-preferences" }
  | { readonly kind: "support"; readonly orderId?: string }
  | { readonly kind: "support-ticket"; readonly ticketId: string };

export type DshClientNavigationMode = "push" | "replace";

export type DshClientNavigation = {
  readonly navigate: (route: DshClientRoute, mode?: DshClientNavigationMode) => void;
  readonly back: () => void;
};

function segment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function dshClientRouteToPath(route: DshClientRoute): string {
  switch (route.kind) {
    case "home": return "/";
    case "stores": return "/stores";
    case "store": return `/stores/${segment(route.storeId)}`;
    case "orders": return "/orders";
    case "order": return `/orders/${segment(route.orderId)}`;
    case "order-pickup": return `/orders/${segment(route.orderId)}/pickup`;
    case "order-chat": {
      const base = `/orders/${segment(route.orderId)}/chat`;
      return route.fulfillmentMode ? `${base}?fulfillmentMode=${segment(route.fulfillmentMode)}` : base;
    }
    case "notifications": return "/notifications";
    case "special-requests": return "/special-requests";
    case "special-request-shein": return "/special-requests/shein";
    case "special-request-awnak": return "/special-requests/awnak";
    case "wallet": return "/wallet";
    case "cart": return route.storeId ? `/cart?storeId=${segment(route.storeId)}` : "/cart";
    case "profile": return "/profile";
    case "profile-commercial": return "/profile/commercial";
    case "profile-addresses": return route.returnStoreId ? `/profile/addresses?returnStoreId=${segment(route.returnStoreId)}` : "/profile/addresses";
    case "profile-identity": return "/profile/identity";
    case "profile-benefits": return "/profile/benefits";
    case "profile-preferences": return "/profile/preferences";
    case "support": return route.orderId ? `/support?orderId=${segment(route.orderId)}` : "/support";
    case "support-ticket": return `/support/tickets/${segment(route.ticketId)}`;
  }
}

export function dshClientRouteFromActionUrl(actionUrl: string): DshClientRoute | null {
  const normalized = actionUrl.trim();
  const pickupMatch = /^\/orders\/([^/?#]+)\/pickup(?:[?#].*)?$/.exec(normalized);
  if (pickupMatch?.[1]) return { kind: "order-pickup", orderId: decodeURIComponent(pickupMatch[1]) };
  const chatMatch = /^\/orders\/([^/?#]+)\/chat(?:[?#].*)?$/.exec(normalized);
  if (chatMatch?.[1]) return { kind: "order-chat", orderId: decodeURIComponent(chatMatch[1]) };
  const orderMatch = /^\/orders\/([^/?#]+)(?:[?#].*)?$/.exec(normalized);
  if (orderMatch?.[1]) return { kind: "order", orderId: decodeURIComponent(orderMatch[1]) };
  if (/^\/orders(?:[?#].*)?$/.test(normalized) || normalized === "/orders/pickup") return { kind: "orders" };
  if (/^\/special-requests\/shein(?:[?#].*)?$/.test(normalized)) return { kind: "special-request-shein" };
  if (/^\/special-requests\/awnak(?:[?#].*)?$/.test(normalized)) return { kind: "special-request-awnak" };
  if (/^\/special-requests(?:\/[^/?#]+)?(?:[?#].*)?$/.test(normalized)) return { kind: "special-requests" };
  if (/^\/notifications(?:[?#].*)?$/.test(normalized)) return { kind: "notifications" };
  return null;
}
