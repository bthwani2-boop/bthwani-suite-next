import {
  hasServiceControlPanelPermission,
  type ControlPanelPermissionIdentity,
} from "../shared/session/control-panel-permissions";

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
  | "catalog.assortment.read"
  | "catalog.assortment.manage"
  | "catalog.seed.read"
  | "catalog.bulk.import"
  | "catalog.bulk.export"
  | "catalog.bulk.edit"
  | "catalog.audit.read"
  | "catalog.cleanup.manage";

export type CatalogPermissionIdentity = ControlPanelPermissionIdentity;

/**
 * Resolves catalog authorization exclusively from Identity permission claims.
 *
 * No local role is accepted as a shortcut. All access must be backed by an
 * explicit Permission{Service:"dsh", Surface:"control-panel", Action:permission}
 * entry issued by Identity and carried in the session token.
 */
export function hasCatalogPermission(
  identity: CatalogPermissionIdentity | null | undefined,
  permission: CatalogPermission,
): boolean {
  if (!identity) return false;
  return hasServiceControlPanelPermission(identity, "dsh", permission);
}
