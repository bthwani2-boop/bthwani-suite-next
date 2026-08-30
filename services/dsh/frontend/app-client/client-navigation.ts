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

function decodeSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    if (!decoded || /[/?#\u0000-\u001f]/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

type ActionUrlParts = {
  readonly path: string;
  readonly query: string;
};

function splitActionUrl(actionUrl: string): ActionUrlParts | null {
  const normalized = actionUrl.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("#")) {
    return null;
  }
  const queryIndex = normalized.indexOf("?");
  const path = queryIndex >= 0 ? normalized.slice(0, queryIndex) : normalized;
  const query = queryIndex >= 0 ? normalized.slice(queryIndex + 1) : "";
  if (!path || (queryIndex >= 0 && !query)) return null;
  return { path, query };
}

function queryValues(query: string, allowedKeys: readonly string[]): ReadonlyMap<string, string> | null {
  if (!query) return new Map();
  const values = new Map<string, string>();
  for (const pair of query.split("&")) {
    const separator = pair.indexOf("=");
    if (separator <= 0 || separator === pair.length - 1) return null;
    const key = decodeSegment(pair.slice(0, separator).replace(/\+/g, " "));
    const value = decodeSegment(pair.slice(separator + 1).replace(/\+/g, " "));
    if (!key || !value || !allowedKeys.includes(key) || values.has(key)) return null;
    values.set(key, value);
  }
  return values;
}

function queryFor(path: ActionUrlParts, allowedKeys: readonly string[]): ReadonlyMap<string, string> | null {
  return queryValues(path.query, allowedKeys);
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
  const parts = splitActionUrl(actionUrl);
  if (!parts) return null;

  // Keep the historical backend action stable: it means the order list, not
  // an order whose identifier happens to be "pickup".
  if (parts.path === "/orders/pickup") {
    return queryFor(parts, []) ? { kind: "orders" } : null;
  }

  const pickupMatch = /^\/orders\/([^/?#]+)\/pickup$/.exec(parts.path);
  if (pickupMatch?.[1] && queryFor(parts, [])) {
    const orderId = decodeSegment(pickupMatch[1]);
    return orderId ? { kind: "order-pickup", orderId } : null;
  }

  const chatMatch = /^\/orders\/([^/?#]+)\/chat$/.exec(parts.path);
  if (chatMatch?.[1]) {
    const query = queryFor(parts, ["fulfillmentMode"]);
    const orderId = decodeSegment(chatMatch[1]);
    if (!query || !orderId) return null;
    const fulfillmentMode = query.get("fulfillmentMode");
    if (fulfillmentMode && !["bthwani_delivery", "partner_delivery", "pickup"].includes(fulfillmentMode)) return null;
    return { kind: "order-chat", orderId, ...(fulfillmentMode ? { fulfillmentMode: fulfillmentMode as OrderTruth["fulfillmentMode"] } : {}) };
  }

  const orderMatch = /^\/orders\/([^/?#]+)$/.exec(parts.path);
  if (orderMatch?.[1] && queryFor(parts, [])) {
    const orderId = decodeSegment(orderMatch[1]);
    return orderId ? { kind: "order", orderId } : null;
  }

  if (parts.path === "/" && queryFor(parts, [])) return { kind: "home" };
  if (parts.path === "/stores" && queryFor(parts, [])) return { kind: "stores" };
  const storeMatch = /^\/stores\/([^/?#]+)$/.exec(parts.path);
  if (storeMatch?.[1] && queryFor(parts, [])) {
    const storeId = decodeSegment(storeMatch[1]);
    return storeId ? { kind: "store", storeId } : null;
  }
  if (parts.path === "/orders" && queryFor(parts, [])) return { kind: "orders" };
  if (parts.path === "/notifications" && queryFor(parts, [])) return { kind: "notifications" };
  if (parts.path === "/special-requests/shein" && queryFor(parts, [])) return { kind: "special-request-shein" };
  if (parts.path === "/special-requests/awnak" && queryFor(parts, [])) return { kind: "special-request-awnak" };
  if (parts.path === "/special-requests" && queryFor(parts, [])) return { kind: "special-requests" };
  if (/^\/special-requests\/[^/?#]+$/.test(parts.path) && queryFor(parts, [])) return { kind: "special-requests" };
  if (parts.path === "/wallet" && queryFor(parts, [])) return { kind: "wallet" };

  if (parts.path === "/cart") {
    const query = queryFor(parts, ["storeId"]);
    if (!query) return null;
    const storeId = query.get("storeId");
    return { kind: "cart", ...(storeId ? { storeId } : {}) };
  }

  if (parts.path === "/profile" && queryFor(parts, [])) return { kind: "profile" };
  if (parts.path === "/profile/commercial" && queryFor(parts, [])) return { kind: "profile-commercial" };
  if (parts.path === "/profile/identity" && queryFor(parts, [])) return { kind: "profile-identity" };
  if (parts.path === "/profile/benefits" && queryFor(parts, [])) return { kind: "profile-benefits" };
  if (parts.path === "/profile/preferences" && queryFor(parts, [])) return { kind: "profile-preferences" };
  if (parts.path === "/profile/addresses") {
    const query = queryFor(parts, ["returnStoreId"]);
    if (!query) return null;
    const returnStoreId = query.get("returnStoreId");
    return { kind: "profile-addresses", ...(returnStoreId ? { returnStoreId } : {}) };
  }
  if (parts.path === "/support") {
    const query = queryFor(parts, ["orderId"]);
    if (!query) return null;
    const orderId = query.get("orderId");
    return { kind: "support", ...(orderId ? { orderId } : {}) };
  }
  const ticketMatch = /^\/support\/tickets\/([^/?#]+)$/.exec(parts.path);
  if (ticketMatch?.[1] && queryFor(parts, [])) {
    const ticketId = decodeSegment(ticketMatch[1]);
    return ticketId ? { kind: "support-ticket", ticketId } : null;
  }
  return null;
}
