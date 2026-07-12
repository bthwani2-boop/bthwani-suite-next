package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/catalogapproval"
	"dsh-api/internal/store"
)

// Catalog-approval workflow permission actions on the control-panel
// surface. "operator" remains a valid fallback role during RBAC data
// migration.
const (
	CatalogApprovalPermissionRead   = "catalog.approval.read"
	CatalogApprovalPermissionManage = "catalog.approval.manage"
)

// POST /dsh/catalog-approvals
// Partner or field surfaces submit a product/category/media/store change for review.
func (s *protectedStoreServer) handleCreateCatalogApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "operator")
	if !ok {
		return
	}
	var body struct {
		EntityType string `json:"entityType"`
		EntityID   string `json:"entityId"`
		Source     string `json:"source"`
		Stage      string `json:"stage"`
		Title      string `json:"title"`
		Metadata   any    `json:"metadata"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	source := body.Source
	if source == "" {
		if actor.Role == "partner" {
			source = "app-partner"
		} else {
			source = "control-panel-catalog"
		}
	}
	stage := body.Stage
	if stage == "" {
		stage = "partner-submitted"
	}
	var metadata json.RawMessage
	if body.Metadata != nil {
		encoded, err := json.Marshal(body.Metadata)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "metadata must be a JSON object")
			return
		}
		metadata = encoded
	}
	rec, err := catalogapproval.Create(s.db, catalogapproval.CreateInput{
		EntityType: body.EntityType,
		EntityID:   body.EntityID,
		Source:     source,
		Stage:      stage,
		Title:      body.Title,
		Metadata:   metadata,
	})
	if errors.Is(err, catalogapproval.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "entityType, source, stage, and title are required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create catalog approval record")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"record": rec})
}

// GET /dsh/catalog-approvals
// Marketing/catalog control-panel queue view, filterable by entityType/stage/source.
func (s *protectedStoreServer) handleListCatalogApprovals(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", CatalogApprovalPermissionRead, "operator")
	if !ok {
		return
	}
	q := r.URL.Query()
	records, err := catalogapproval.List(s.db, q.Get("entityType"), q.Get("stage"), q.Get("source"), 100)
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
// Partner-facing safe projection: only the partner's own stage/ownership view.
func (s *protectedStoreServer) handleListPartnerCatalogApprovals(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	records, err := catalogapproval.ListPartnerQueue(s.db, "app-partner", 100)
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
func (s *protectedStoreServer) handleGetCatalogApproval(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator", "partner")
	if !ok {
		return
	}
	rec, err := catalogapproval.Get(s.db, r.PathValue("recordId"))
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
// Marketing/catalog control-panel actors move a record to its next stage.
func (s *protectedStoreServer) handleTransitionCatalogApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", CatalogApprovalPermissionManage, "operator")
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
	rec, err := catalogapproval.Transition(s.db, r.PathValue("recordId"), body.ToStage, "control-panel-"+actor.Role, body.ActionLabel)
	if errors.Is(err, catalogapproval.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "toStage and actionLabel are required")
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
