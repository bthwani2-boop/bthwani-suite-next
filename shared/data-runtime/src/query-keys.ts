/**
 * Query-key factory convention for this workspace. Add one namespaced
 * factory per feature as it adopts TanStack Query — keep keys serializable
 * and scoped to the parameters that actually vary the response.
 */
export const queryKeys = {
  dshHomeDiscovery: (scope: { readonly cityCode?: string; readonly serviceAreaCode?: string }) =>
    ["dsh", "home-discovery", scope.cityCode ?? null, scope.serviceAreaCode ?? null] as const,
};
