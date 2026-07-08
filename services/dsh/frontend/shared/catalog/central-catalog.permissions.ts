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

/**
 * Resolves permissions based on actor role.
 */
export function hasCatalogPermission(actorRole: string | undefined, permission: CatalogPermission): boolean {
  if (!actorRole) return false;

  // Operator is root in control panel and holds almost everything
  if (actorRole === "operator" || actorRole === "admin" || actorRole === "staff") {
    return true;
  }

  // Partner has restricted read/write overrides and self proposals
  if (actorRole === "partner") {
    const partnerAllowed: readonly CatalogPermission[] = [
      "catalog.taxonomy.read",
      "catalog.product.read",
      "catalog.media.read",
      "catalog.media.upload",
      "catalog.bulk.export",
    ];
    return partnerAllowed.includes(permission);
  }

  // Field agent onboarding has reads and survey rights
  if (actorRole === "field") {
    const fieldAllowed: readonly CatalogPermission[] = [
      "catalog.taxonomy.read",
      "catalog.product.read",
      "catalog.media.read",
      "catalog.media.upload",
    ];
    return fieldAllowed.includes(permission);
  }

  return false;
}
