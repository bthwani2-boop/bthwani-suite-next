package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// Central-catalog permission actions: granular, additive capabilities that a
// non-operator actor can be granted via Identity.Permissions
// -- Permission{Service:"dsh", Surface:"control-panel", Action:...} --
// without needing the operator role. Operators resolve the same exact actions
// from Identity's durable RBAC registry; role membership alone is never a
// fallback authorization path.
const (
	CatalogPermissionTaxonomyRead            = "catalog.taxonomy.read"
	CatalogPermissionTaxonomyManage          = "catalog.taxonomy.manage"
	CatalogPermissionProductRead             = "catalog.product.read"
	CatalogPermissionProductManage           = "catalog.product.manage"
	CatalogPermissionProposalReview          = "catalog.proposal.review"
	CatalogPermissionProposalMarketingReview = "catalog.proposal.marketing_review"
	CatalogPermissionProposalAdopt           = "catalog.proposal.adopt"
	CatalogPermissionProposalPublish         = "catalog.proposal.publish"
	CatalogPermissionMediaReview             = "catalog.media.review"
	CatalogPermissionMediaManage             = "catalog.media.manage"
	CatalogPermissionMediaRead               = "catalog.media.read"
	CatalogPermissionPolicyManage            = "catalog.policy.manage"
	CatalogPermissionPolicyRead              = "catalog.policy.read"
	CatalogPermissionProposalRead            = "catalog.proposal.read"
	CatalogPermissionAssortmentRead          = "catalog.assortment.read"
	CatalogPermissionAssortmentManage        = "catalog.assortment.manage"
	CatalogPermissionSeedRead                = "catalog.seed.read"
)

func (s *protectedStoreServer) writeCentralCatalogError(w http.ResponseWriter, err error) {
	var conflictErr *centralcatalog.ConflictError
	switch {
	case errors.As(err, &conflictErr):
		store.SendJSON(w, http.StatusConflict, map[string]any{
			"code":            "CONFLICT",
			"message":         conflictErr.Message,
			"entityId":        conflictErr.EntityID,
			"expectedVersion": conflictErr.ExpectedVersion,
			"currentVersion":  conflictErr.CurrentVersion,
		})
	case errors.Is(err, centralcatalog.ErrConflict):
		store.SendError(w, http.StatusConflict, "CONFLICT", "central catalog entity was modified by another actor")
	case errors.Is(err, centralcatalog.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "central catalog entity not found")
	case errors.Is(err, centralcatalog.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid central catalog input")
	case errors.Is(err, centralcatalog.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "action not permitted by platform policy")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "central catalog operation failed")
	}
}
