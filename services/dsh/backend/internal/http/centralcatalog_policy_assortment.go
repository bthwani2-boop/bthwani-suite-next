package http

import (
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// ── Platform catalog policies ────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogPolicies(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionPolicyRead, "operator"); !ok {
		return
	}
	items, err := centralcatalog.ListCatalogPolicies(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policies": items})
}

func (s *protectedStoreServer) handleUpdateCatalogPolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionPolicyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogPolicyInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	p, err := centralcatalog.UpdateCatalogPolicy(r.Context(), s.db, r.PathValue("policyId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": p})
}

// ── Store assortment ─────────────────────────────────────────────────────────

func (s *protectedStoreServer) handleOperatorGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentRead, "operator"); !ok {
		return
	}
	items, err := centralcatalog.ListStoreAssortment(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

func (s *protectedStoreServer) upsertStoreAssortment(w http.ResponseWriter, r *http.Request, actorID, actorRole, storeID string) {
	masterProductID := r.PathValue("masterProductId")
	var input centralcatalog.StoreAssortmentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	mp, err := centralcatalog.GetMasterProduct(r.Context(), s.db, masterProductID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	if actorRole != "operator" {
		if mp.ApprovalStatus != "approved" || !mp.IsActive {
			s.writeCentralCatalogError(w, centralcatalog.ErrForbidden)
			return
		}
		input.PublicationStatus = "submitted"
	}
	nodeID := ""
	if mp.CategoryNodeID != nil {
		nodeID = *mp.CategoryNodeID
	}
	policy, err := centralcatalog.ResolveEffectivePolicy(r.Context(), s.db, mp.DomainID, nodeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	a, err := centralcatalog.UpsertStoreAssortment(r.Context(), s.db, storeID, masterProductID, actorID, input, policy.AllowsStoreProductCustomImage)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": a})
}

func (s *protectedStoreServer) handleOperatorUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage, "operator")
	if !ok {
		return
	}
	s.upsertStoreAssortment(w, r, actor.ID, "operator", r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePartnerGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	_ = actor
	items, err := centralcatalog.ListStoreAssortment(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

func (s *protectedStoreServer) handlePartnerUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.upsertStoreAssortment(w, r, actor.ID, actor.Role, storeID)
}

func (s *protectedStoreServer) handleFieldUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to this partner draft")
		return
	}
	s.upsertStoreAssortment(w, r, actorID, "field", storeID)
}

func (s *protectedStoreServer) handleFieldGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	items, err := centralcatalog.ListStoreAssortment(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "assortment": items})
}
