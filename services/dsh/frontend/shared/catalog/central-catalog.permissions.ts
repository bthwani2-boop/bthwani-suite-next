import {
  hasServiceControlPanelPermission,
  type ControlPanelPermissionIdentity,
} from "../session/control-panel-permissions";

export type CatalogPermission =
  | "catalog.taxonomy.read"
  | "catalog.taxonomy.manage"
  | "catalog.product.read"
  | "catalog.product.manage"
  | "catalog.product.approve"
  | "catalog.product.publish"
  | "catalog.proposal.read"
  | "catalog.proposal.review"
  | "catalog.proposal.marketing_review"
  | "catalog.proposal.adopt"
  | "catalog.proposal.publish"
  | "catalog.media.read"
  | "catalog.media.upload"
  | "catalog.media.review"
  | "catalog.media.manage"
  | "catalog.policy.read"
  | "catalog.policy.manage"
  | "catalog.bulk.import"
  | "catalog.bulk.export"
  | "catalog.bulk.edit"
  | "catalog.audit.read"
  | "catalog.cleanup.manage";

export type CatalogPermissionIdentity = ControlPanelPermissionIdentity & {
  readonly roles?: readonly string[];
};

/**
 * Resolves catalog authorization from Identity permission claims.
 *
 * The operator role is retained only as the same explicit migration fallback
 * accepted by the DSH backend. No other local role-to-permission expansion is
 * allowed here; admin/staff/partner/field capabilities must arrive from
 * Identity as service=dsh, surface=control-panel permission claims.
 */
export function hasCatalogPermission(
  identityOrFallbackRole: CatalogPermissionIdentity | string | null | undefined,
  permission: CatalogPermission,
): boolean {
  if (!identityOrFallbackRole) return false;

  if (typeof identityOrFallbackRole === "string") {
    return identityOrFallbackRole === "operator";
  }

  if (identityOrFallbackRole.roles?.includes("operator")) {
    return true;
  }

  return hasServiceControlPanelPermission(identityOrFallbackRole, "dsh", permission);
}
