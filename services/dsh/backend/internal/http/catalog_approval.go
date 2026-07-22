package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/catalogapproval"
	"dsh-api/internal/store"
)

const (
	CatalogApprovalPermissionRead   = "catalog.approval.read"
	CatalogApprovalPermissionManage = "catalog.approval.manage"
)

type catalogApprovalSubmissionMetadata struct {
	MediaKey                string `json:"mediaKey,omitempty"`
	CategoryID              string `json:"categoryId,omitempty"`
	SupportsPickup          *bool  `json:"supportsPickup,omitempty"`
	SupportsPartnerDelivery *bool  `json:"supportsPartnerDelivery,omitempty"`
}

func catalogApprovalOrigin(role string) (source, stage string, ok bool) {
	switch role {
	case "partner":
		return "app-partner", "partner-submitted", true
	case "field":
		return "app-field", "field-submitted", true
	case "operator":
		return "control-panel-catalog", "marketing-review", true
	default:
		return "", "", false
	}
}

func requireCatalogApprovalTenant(w http.ResponseWriter, actor store.StoreActor) (string, bool) {
	tenantID := strings.TrimSpace(actor.TenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusForbidden, "TENANT_REQUIRED", "catalog approval access requires tenant context")
		return "", false
	}
	return tenantID, true
}

// POST /dsh/catalog-approvals
func (s *protectedStoreServer) handleCreateCatalogApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field", "operator")
	if !ok {
		return
	}
	tenantID, ok := requireCatalogApprovalTenant(w, actor)
	if !ok {
		return
	}
	source, stage, ok := catalogApprovalOrigin(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot create catalog approvals")
		return
	}
	var body struct {
		EntityType string                             `json:"entityType"`
		EntityID   string                             `json:"entityId"`
		Title      string                             `json:"title"`
		Metadata   *catalogApprovalSubmissionMetadata `json:"metadata"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	var metadata json.RawMessage
	if body.Metadata != nil {
		encoded, err := json.Marshal(body.Metadata)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "metadata must be valid JSON")
			return
		}
		metadata = encoded
	}
	rec, err := catalogapproval.Create(s.db, catalogapproval.CreateInput{
		TenantID:     tenantID,
		EntityType:   body.EntityType,
		EntityID:     body.EntityID,
		OwnerActorID: actor.ID,
		Source:       source,
		Stage:        stage,
		Title:        body.Title,
		Metadata:     metadata,
	})
	if errors.Is(err, catalogapproval.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "tenant, entityType, actor, and title are required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create catalog approval record")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"record": rec})
}

// GET /dsh/catalog-approvals
func (s *protectedStoreServer) handleListCatalogApprovals(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", CatalogApprovalPermissionRead, "operator")
	if !ok {
		return
	}
	tenantID, ok := requireCatalogApprovalTenant(w, actor)
	if !ok {
		return
	}
	q := r.URL.Query()
	records, err := catalogapproval.List(s.db, tenantID, q.Get("entityType"), q.Get("stage"), q.Get("source"), 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list catalog approval records")
		return
	}
	if records == nil {
		records = []catalogapproval.Record{}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"records": records})
}

// GET /dsh/partner/catalog-approvals
func (s *protectedStoreServer) handleListPartnerCatalogApprovals(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	tenantID, ok := requireCatalogApprovalTenant(w, actor)
	if !ok {
		return
	}
	records, err := catalogapproval.ListPartnerQueue(s.db, tenantID, actor.ID, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner queue records")
		return
	}
	if records == nil {
		records = []catalogapproval.PartnerQueueRecord{}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"records": records})
}

// GET /dsh/catalog-approvals/{recordId}
// Full metadata and audit are restricted to the governed control-panel reader.
func (s *protectedStoreServer) handleGetCatalogApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", CatalogApprovalPermissionRead, "operator")
	if !ok {
		return
	}
	tenantID, ok := requireCatalogApprovalTenant(w, actor)
	if !ok {
		return
	}
	rec, err := catalogapproval.Get(s.db, tenantID, r.PathValue("recordId"))
	if errors.Is(err, catalogapproval.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "catalog approval record not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load catalog approval record")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"record": rec})
}

// POST /dsh/catalog-approvals/{recordId}/transition
func (s *protectedStoreServer) handleTransitionCatalogApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", CatalogApprovalPermissionManage, "operator")
	if !ok {
		return
	}
	tenantID, ok := requireCatalogApprovalTenant(w, actor)
	if !ok {
		return
	}
	var body struct {
		ToStage     string `json:"toStage"`
		ActionLabel string `json:"actionLabel"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	rec, err := catalogapproval.Transition(
		s.db,
		tenantID,
		r.PathValue("recordId"),
		body.ToStage,
		"control-panel-"+actor.Role,
		body.ActionLabel,
	)
	if errors.Is(err, catalogapproval.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "tenant, toStage, and actionLabel are required")
		return
	}
	if errors.Is(err, catalogapproval.ErrInvalidTransition) {
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", "catalog approval transition is not allowed")
		return
	}
	if errors.Is(err, catalogapproval.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "catalog approval record not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to transition catalog approval record")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"record": rec})
}
