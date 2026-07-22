package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

const (
	CatalogPermissionAttributeRead   = "catalog.attribute.read"
	CatalogPermissionAttributeManage = "catalog.attribute.manage"
	CatalogPermissionAuditRead       = "catalog.audit.read"
	CatalogPermissionRollback        = "catalog.rollback.execute"
)

func (s *protectedStoreServer) handleListCatalogAttributes(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	items, err := centralcatalog.ListCatalogAttributes(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"attributes": items})
}

func (s *protectedStoreServer) handleCreateCatalogAttribute(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogAttributeInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := centralcatalog.CreateCatalogAttribute(r.Context(), s.db, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"attribute": item})
}

func (s *protectedStoreServer) handleListCatalogAttributeOptions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	items, err := centralcatalog.ListCatalogAttributeOptions(r.Context(), s.db, r.PathValue("attributeId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"options": items})
}

func (s *protectedStoreServer) handleCreateCatalogAttributeOption(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogAttributeOptionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := centralcatalog.CreateCatalogAttributeOption(r.Context(), s.db, r.PathValue("attributeId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"option": item})
}

func (s *protectedStoreServer) handleUpsertCatalogNodeAttributeRule(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogNodeAttributeRuleInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := centralcatalog.UpsertCatalogNodeAttributeRule(
		r.Context(), s.db, r.PathValue("nodeId"), r.PathValue("attributeId"), input,
	)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rule": item})
}

func (s *protectedStoreServer) handleListMasterProductAttributeValues(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	product, err := centralcatalog.GetMasterProduct(r.Context(), s.db, r.PathValue("productId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	if actor.Role != "operator" && (product.ApprovalStatus != "approved" || !product.IsActive) {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "product attributes are not published")
		return
	}
	items, err := centralcatalog.ListMasterProductAttributeValues(r.Context(), s.db, product.ID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"values": items})
}

func (s *protectedStoreServer) handleUpsertMasterProductAttributeValue(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator"); !ok {
		return
	}
	var input centralcatalog.MasterProductAttributeValueInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := centralcatalog.UpsertMasterProductAttributeValue(
		r.Context(), s.db, r.PathValue("productId"), r.PathValue("attributeId"), input,
	)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"value": item})
}

func (s *protectedStoreServer) handleListMasterProductRelationships(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	product, err := centralcatalog.GetMasterProduct(r.Context(), s.db, r.PathValue("productId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	if actor.Role != "operator" && (product.ApprovalStatus != "approved" || !product.IsActive) {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "product relationships are not published")
		return
	}
	items, err := centralcatalog.ListMasterProductRelationships(r.Context(), s.db, product.ID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"relationships": items})
}

func (s *protectedStoreServer) handleUpsertMasterProductRelationship(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator")
	if !ok {
		return
	}
	var input centralcatalog.MasterProductRelationshipInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := centralcatalog.UpsertMasterProductRelationship(r.Context(), s.db, actor.ID, r.PathValue("productId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"relationship": item})
}

func (s *protectedStoreServer) handleDeleteMasterProductRelationship(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAttributeManage, "operator"); !ok {
		return
	}
	expectedVersion, err := strconv.Atoi(r.URL.Query().Get("expectedVersion"))
	if err != nil || expectedVersion < 1 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "expectedVersion is required")
		return
	}
	if err := centralcatalog.DeleteMasterProductRelationship(r.Context(), s.db, r.PathValue("relationshipId"), expectedVersion); err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) writeAssortmentPauseResponse(w http.ResponseWriter, r *http.Request, assortment centralcatalog.StoreAssortment, storeID, productID string) {
	pause, err := centralcatalog.GetAssortmentPauseState(r.Context(), s.db, storeID, productID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": assortment, "pause": pause})
}

func (s *protectedStoreServer) pauseAssortment(w http.ResponseWriter, r *http.Request, actorID, storeID string) {
	var input centralcatalog.StoreAssortmentPauseInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	productID := r.PathValue("masterProductId")
	item, err := centralcatalog.PauseStoreAssortment(r.Context(), s.db, storeID, productID, actorID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	s.writeAssortmentPauseResponse(w, r, item, storeID, productID)
}

func (s *protectedStoreServer) resumeAssortment(w http.ResponseWriter, r *http.Request, actorID, storeID string) {
	var input struct {
		ExpectedVersion *int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	productID := r.PathValue("masterProductId")
	item, err := centralcatalog.ResumeStoreAssortment(r.Context(), s.db, storeID, productID, actorID, input.ExpectedVersion)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	s.writeAssortmentPauseResponse(w, r, item, storeID, productID)
}

func (s *protectedStoreServer) listAssortmentPauses(w http.ResponseWriter, r *http.Request, storeID string) {
	items, err := centralcatalog.ListAssortmentPauseStates(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"pauses": items})
}

func (s *protectedStoreServer) handleListOperatorAssortmentPauses(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentRead, "operator"); !ok {
		return
	}
	s.listAssortmentPauses(w, r, r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePauseOperatorAssortment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage, "operator")
	if !ok {
		return
	}
	s.pauseAssortment(w, r, actor.ID, r.PathValue("storeId"))
}

func (s *protectedStoreServer) handleResumeOperatorAssortment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage, "operator")
	if !ok {
		return
	}
	s.resumeAssortment(w, r, actor.ID, r.PathValue("storeId"))
}

func (s *protectedStoreServer) handleListPartnerAssortmentPauses(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.listAssortmentPauses(w, r, storeID)
}

func (s *protectedStoreServer) handlePausePartnerAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.pauseAssortment(w, r, actor.ID, storeID)
}

func (s *protectedStoreServer) handleResumePartnerAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.resumeAssortment(w, r, actor.ID, storeID)
}

func (s *protectedStoreServer) handleListFieldAssortmentPauses(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.listAssortmentPauses(w, r, storeID)
}

func (s *protectedStoreServer) handlePauseFieldAssortment(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.pauseAssortment(w, r, actorID, storeID)
}

func (s *protectedStoreServer) handleResumeFieldAssortment(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.resumeAssortment(w, r, actorID, storeID)
}

func (s *protectedStoreServer) handleListCatalogAudit(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAuditRead, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := centralcatalog.ListCatalogAudit(r.Context(), s.db, centralcatalog.CatalogAuditFilter{
		EntityType: r.URL.Query().Get("entityType"),
		EntityID:   r.URL.Query().Get("entityId"),
		Action:     r.URL.Query().Get("action"),
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	effectiveLimit, effectiveOffset := centralcatalog.ClampListParams(limit, offset)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"audit": items, "total": total, "limit": effectiveLimit, "offset": effectiveOffset,
	})
}

func (s *protectedStoreServer) handleRollbackCatalogAudit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionRollback, "operator")
	if !ok {
		return
	}
	var input centralcatalog.CatalogRollbackInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	result, err := centralcatalog.RollbackCatalogAudit(r.Context(), s.db, r.PathValue("auditId"), actor.ID, actor.Role, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rollback": result})
}
