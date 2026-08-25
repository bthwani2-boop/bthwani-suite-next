/**
 * Query-key factory convention for this workspace. Add one namespaced
 * factory per feature as it adopts TanStack Query — keep keys serializable
 * and scoped to the parameters that actually vary the response.
 */

/**
 * Reserved first segment marking a query whose cached value must never be
 * treated as authoritative financial truth. Financial queries are excluded
 * from disk persistence (persistence.ts) and must render stale data only as
 * clearly derived display; the server remains the sole eligibility authority.
 */
export const FINANCIAL_QUERY_KEY_PREFIX = "bthwani-financial";

export function isFinancialQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === FINANCIAL_QUERY_KEY_PREFIX;
}

export function financialQueryKey(...parts: readonly unknown[]): readonly unknown[] {
  return [FINANCIAL_QUERY_KEY_PREFIX, ...parts];
}

export const queryKeys = {
  dshHomeDiscovery: (scope: {
    readonly cityCode?: string | undefined;
    readonly serviceAreaCode?: string | undefined;
  }) =>
    ["dsh", "home-discovery", scope.cityCode ?? null, scope.serviceAreaCode ?? null] as const,
};
