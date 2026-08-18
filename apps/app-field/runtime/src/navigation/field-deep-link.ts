import type { DshFieldNavigationCommand } from "@bthwani/dsh/app-field";

export const FIELD_APP_SCHEME = "bthwani-field-next";

function decodeQueryValue(value: string): string {
  return decodeURIComponent(value.replaceAll("+", " "));
}

function parseQuery(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const key = decodeQueryValue(separator >= 0 ? pair.slice(0, separator) : pair);
    const value = decodeQueryValue(separator >= 0 ? pair.slice(separator + 1) : "");
    if (key) result[key] = value;
  }
  return result;
}

const ROUTE_MAP: Readonly<Record<string, DshFieldNavigationCommand["target"]>> = {
  "work-queue": "work-queue",
  visit: "visit",
  checklist: "checklist",
  verification: "verification",
  escalation: "escalation",
  finance: "finance",
  "partner-progress": "partner-progress",
  products: "products-upload",
};

export function parseFieldDeepLink(url: string, token = Date.now()): DshFieldNavigationCommand | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const schemeSeparator = trimmed.indexOf("://");
    if (schemeSeparator <= 0) return null;
    const scheme = trimmed.slice(0, schemeSeparator).toLowerCase();
    if (scheme !== FIELD_APP_SCHEME) return null;

    const afterScheme = trimmed.slice(schemeSeparator + 3);
    const withoutFragment = afterScheme.split("#", 1)[0] ?? "";
    const querySeparator = withoutFragment.indexOf("?");
    const location = querySeparator >= 0 ? withoutFragment.slice(0, querySeparator) : withoutFragment;
    const query = querySeparator >= 0 ? withoutFragment.slice(querySeparator + 1) : "";
    const path = location.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
    const target = ROUTE_MAP[path];
    if (!target) return null;

    const params = parseQuery(query);
    const command: DshFieldNavigationCommand = { token, target };
    if (params.storeId) command.storeId = params.storeId;
    if (params.visitId) command.visitId = params.visitId;
    if (params.partnerId) command.partnerId = params.partnerId;
    return command;
  } catch {
    return null;
  }
}
