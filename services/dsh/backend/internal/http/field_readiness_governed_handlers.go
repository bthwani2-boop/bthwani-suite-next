package http

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/fieldreadiness"
	"dsh-api/internal/media"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

func (s *protectedStoreServer) writeGovernedFieldReadinessError(w http.ResponseWriter, err error) {
	if errors.Is(err, fieldreadiness.ErrStoreLocationRequired) {
		store.SendError(w, http.StatusConflict, "STORE_LOCATION_REQUIRED", "store coordinates must be registered before a field visit can start")
		return
	}
	s.writeFieldReadinessError(w, err)
}

// POST /dsh/field/stores/{storeId}/visits
func (s *protectedStoreServer) handleCreateGovernedFieldVisit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var body struct {
		VisitType     string                           `json:"visitType"`
		StartLocation *fieldreadiness.LocationEvidence `json:"startLocation"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	visitType := fieldreadiness.VisitTypeOnboarding
	if strings.TrimSpace(body.VisitType) != "" {
		visitType = fieldreadiness.VisitType(body.VisitType)
	}
	visit, err := fieldreadiness.CreateGovernedVisit(r.Context(), s.db, actor, fieldreadiness.CreateVisitInput{
		StoreID:       r.PathValue("storeId"),
		FieldAgentID:  actor.ID,
		VisitType:     visitType,
		StartLocation: body.StartLocation,
	})
	if err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"visit": marshalVisit(visit)})
}

// POST /dsh/field/visits/{visitId}/complete
func (s *protectedStoreServer) handleCompleteGovernedFieldVisit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var body struct {
		CompletionLocation *fieldreadiness.LocationEvidence `json:"completionLocation"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	visit, err := fieldreadiness.CompleteGovernedVisit(r.Context(), s.db, actor, r.PathValue("visitId"), fieldreadiness.CompleteVisitInput{
		CompletionLocation: body.CompletionLocation,
	})
	if err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visit": marshalVisit(visit)})
}

// PUT /dsh/field/visits/{visitId}/checks
func (s *protectedStoreServer) handleUpsertGovernedReadinessCheck(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var body struct {
		CheckType   string `json:"checkType"`
		Status      string `json:"status"`
		EvidenceURL string `json:"evidenceUrl"`
		Notes       string `json:"notes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	check, err := fieldreadiness.UpsertGovernedReadinessCheck(r.Context(), s.db, actor, r.PathValue("visitId"), fieldreadiness.UpdateCheckInput{
		CheckType:   body.CheckType,
		Status:      fieldreadiness.CheckStatus(body.Status),
		EvidenceURL: body.EvidenceURL,
		Notes:       body.Notes,
	})
	if err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"check": marshalCheck(check)})
}

// POST /dsh/field/stores/{storeId}/escalations
func (s *protectedStoreServer) handleCreateGovernedReadinessEscalation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var body struct {
		VisitID     string `json:"visitId"`
		Severity    string `json:"severity"`
		Category    string `json:"category"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	escalation, err := fieldreadiness.CreateGovernedEscalation(r.Context(), s.db, actor, fieldreadiness.CreateEscalationInput{
		VisitID:     body.VisitID,
		StoreID:     r.PathValue("storeId"),
		RaisedBy:    actor.ID,
		Severity:    fieldreadiness.EscalationSeverity(body.Severity),
		Category:    fieldreadiness.EscalationCategory(body.Category),
		Description: body.Description,
	})
	if err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"escalation": marshalEscalation(escalation)})
}

// PATCH /dsh/operator/field-readiness/escalations/{escalationId}
func (s *protectedStoreServer) handleUpdateGovernedEscalation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Status         string `json:"status"`
		ResolutionNote string `json:"resolutionNote"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	escalation, err := fieldreadiness.UpdateGovernedEscalation(r.Context(), s.db, r.PathValue("escalationId"), fieldreadiness.UpdateEscalationInput{
		Status:         fieldreadiness.EscalationStatus(body.Status),
		ResolvedBy:     actor.ID,
		ResolutionNote: body.ResolutionNote,
	})
	if err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"escalation": marshalEscalation(escalation)})
}

// GET /dsh/partner/stores/{storeId}/onboarding-status
func (s *protectedStoreServer) handleGovernedPartnerOnboardingStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	if err := fieldreadiness.AuthorizeStore(r.Context(), s.db, actor, storeID); err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	status, err := fieldreadiness.GetGovernedStoreOnboardingStatus(r.Context(), s.db, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get onboarding status")
		return
	}
	store.SendJSON(w, http.StatusOK, status)
}

// POST /dsh/field/stores/{storeId}/media/uploads
// Registers readiness evidence against the exact store in the route. This avoids
// selecting an arbitrary first store for partners that own multiple stores.
func (s *protectedStoreServer) handleFieldReadinessMediaUpload(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	mediaClient := s.mediaClient()
	if mediaClient == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	storeID := r.PathValue("storeId")
	if err := fieldreadiness.AuthorizeStore(r.Context(), s.db, actor, storeID); err != nil {
		s.writeGovernedFieldReadinessError(w, err)
		return
	}
	var partnerID sql.NullString
	if err := s.db.QueryRowContext(r.Context(), `SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&partnerID); errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load store ownership")
		return
	}
	if !partnerID.Valid || strings.TrimSpace(partnerID.String) == "" {
		store.SendError(w, http.StatusConflict, "STORE_PARTNER_REQUIRED", "store must be linked to a partner before readiness evidence can be uploaded")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxMediaUploadBytes+mediaUploadMultipartOverheadBytes)
	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return
	}
	defer file.Close()

	uploadBody, contentType, err := prepareMediaUploadBody(file, header.Header.Get("Content-Type"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "unsupported media type")
		return
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("dsh-field-readiness", "objects", opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))
	if err := mediaClient.Upload(r.Context(), key, uploadBody, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload media")
		return
	}

	var mediaRef string
	err = s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename)
		VALUES ($1,$2,'field',$3,$4,'field_readiness_evidence',$5,$6)
		RETURNING media_ref`,
		key, actor.ID, partnerID.String, storeID, contentType, header.Filename,
	).Scan(&mediaRef)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register media reference")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]string{"mediaRef": mediaRef})
}
