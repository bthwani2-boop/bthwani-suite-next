/**
 * Query-key factory convention for this workspace. Add one namespaced
 * factory per feature as it adopts TanStack Query — keep keys serializable
 * and scoped to the parameters that actually vary the response.
 */

function normalizeScopePart(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export const queryKeys = {
  dshHomeDiscovery: (scope: {
    readonly cityCode?: string | undefined;
    readonly serviceAreaCode?: string | undefined;
  }) =>
    [
      "dsh",
      "home-discovery",
      normalizeScopePart(scope.cityCode),
      normalizeScopePart(scope.serviceAreaCode),
    ] as const,
};
