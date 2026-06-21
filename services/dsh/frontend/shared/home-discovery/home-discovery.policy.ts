/**
 * DSH-002 Home Discovery — Policy
 * Access gates and capability checks.
 */

export type DshClientContext = {
  isAuthenticated?: boolean;
};

/** Home discovery is publicly accessible — no auth required for browsing. */
export function canViewHomeDiscovery(_ctx: DshClientContext): boolean {
  return true;
}
