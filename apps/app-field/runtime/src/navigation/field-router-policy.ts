export type FieldRouterNavigationMode = "push" | "replace";

export type FieldRouterPathOperation = {
  readonly method: FieldRouterNavigationMode;
  readonly href: string;
};

export type FieldRouterOperation =
  | FieldRouterPathOperation
  | { readonly method: "back" };

export function singleRouteParam(value: string | string[] | undefined): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim();
  return normalized ? normalized : undefined;
}

function requireAbsoluteHref(href: string): string {
  if (!href.startsWith("/")) {
    throw new Error("FIELD_ROUTER_HREF_MUST_BE_ABSOLUTE");
  }
  return href;
}

export function resolveFieldRouterNavigation(
  href: string,
  mode: FieldRouterNavigationMode = "push",
): FieldRouterPathOperation {
  return { method: mode, href: requireAbsoluteHref(href) };
}

export function resolveFieldRouterBack(canGoBack: boolean): FieldRouterOperation {
  return canGoBack ? { method: "back" } : { method: "replace", href: "/" };
}
