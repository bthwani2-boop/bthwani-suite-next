package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/fieldreadiness"
	"dsh-api/internal/store"
)

// POST /dsh/field/stores/{storeId}/visits
func (s *protectedStoreServer) handleCreateFieldVisit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	var body struct {
		VisitType string `json:"visitType"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	vt := fieldreadiness.VisitTypeOnboarding
	if body.VisitType != "" {
		vt = fieldreadiness.VisitType(body.VisitType)
	}
	visit, err := fieldreadiness.CreateVisit(r.Context(), s.db, actor, fieldreadiness.CreateVisitInput{
		StoreID:      storeID,
		FieldAgentID: actor.ID,
		VisitType:    vt,
	})
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"visit": marshalVisit(visit)})
}

// GET /dsh/field/stores/{storeId}/visits
func (s *protectedStoreServer) handleListFieldVisits(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	visits, err := fieldreadiness.ListStoreVisits(r.Context(), s.db, actor, storeID, 50)
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	result := make([]map[string]any, 0, len(visits))
	for _, v := range visits {
		result = append(result, marshalVisit(v))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visits": result})
}

// GET /dsh/field/work-queue
func (s *protectedStoreServer) handleFieldWorkQueue(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visits, err := fieldreadiness.ListAgentVisits(r.Context(), s.db, actor.ID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list field work queue visits")
		return
	}
	escalations, err := fieldreadiness.ListAgentEscalations(r.Context(), s.db, actor.ID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list field work queue escalations")
		return
	}
	visitResult := make([]map[string]any, 0, len(visits))
	for _, v := range visits {
		visitResult = append(visitResult, marshalVisit(v))
	}
	escalationResult := make([]map[string]any, 0, len(escalations))
	for _, e := range escalations {
		escalationResult = append(escalationResult, marshalEscalation(e))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visits": visitResult, "escalations": escalationResult})
}

// POST /dsh/field/visits/{visitId}/complete
func (s *protectedStoreServer) handleCompleteFieldVisit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visitID := r.PathValue("visitId")
	visit, err := fieldreadiness.CompleteVisit(r.Context(), s.db, actor, visitID)
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visit": marshalVisit(visit)})
}

// PUT /dsh/field/visits/{visitId}/checks
func (s *protectedStoreServer) handleUpsertReadinessCheck(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visitID := r.PathValue("visitId")
	var body struct {
		CheckType   string `json:"checkType"`
		Status      string `json:"status"`
		EvidenceURL string `json:"evidenceUrl"`
		Notes       string `json:"notes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	check, err := fieldreadiness.UpsertReadinessCheck(r.Context(), s.db, actor, visitID, fieldreadiness.UpdateCheckInput{
		CheckType:   body.CheckType,
		Status:      fieldreadiness.CheckStatus(body.Status),
		EvidenceURL: body.EvidenceURL,
		Notes:       body.Notes,
	})
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"check": marshalCheck(check)})
}

// GET /dsh/field/visits/{visitId}/checks
func (s *protectedStoreServer) handleListVisitChecks(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visitID := r.PathValue("visitId")
	checks, err := fieldreadiness.ListVisitChecks(r.Context(), s.db, actor, visitID)
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	result := make([]map[string]any, 0, len(checks))
	for _, c := range checks {
		result = append(result, marshalCheck(c))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"checks": result})
}

// POST /dsh/field/stores/{storeId}/escalations
func (s *protectedStoreServer) handleCreateReadinessEscalation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	var body struct {
		VisitID     string `json:"visitId"`
		Severity    string `json:"severity"`
		Category    string `json:"category"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	esc, err := fieldreadiness.CreateEscalation(r.Context(), s.db, actor, fieldreadiness.CreateEscalationInput{
		VisitID:     body.VisitID,
		StoreID:     storeID,
		RaisedBy:    actor.ID,
		Severity:    fieldreadiness.EscalationSeverity(body.Severity),
		Category:    fieldreadiness.EscalationCategory(body.Category),
		Description: body.Description,
	})
	if err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"escalation": marshalEscalation(esc)})
}

// GET /dsh/operator/field-readiness/escalations
func (s *protectedStoreServer) handleListOperatorEscalations(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	statusFilter := r.URL.Query().Get("status")
	list, err := fieldreadiness.ListOperatorEscalations(r.Context(), s.db, statusFilter, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list escalations")
		return
	}
	result := make([]map[string]any, 0, len(list))
	for _, e := range list {
		result = append(result, marshalEscalation(e))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"escalations": result})
}

// PATCH /dsh/operator/field-readiness/escalations/{escalationId}
func (s *protectedStoreServer) handleUpdateEscalation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	escalationID := r.PathValue("escalationId")
	var body struct {
		Status         string `json:"status"`
		ResolutionNote string `json:"resolutionNote"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	esc, err := fieldreadiness.UpdateEscalation(r.Context(), s.db, escalationID, fieldreadiness.UpdateEscalationInput{
		Status:         fieldreadiness.EscalationStatus(body.Status),
		ResolvedBy:     actor.ID,
		ResolutionNote: body.ResolutionNote,
	})
	if errors.Is(err, fieldreadiness.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "escalation not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update escalation")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"escalation": marshalEscalation(esc)})
}

// GET /dsh/partner/stores/{storeId}/onboarding-status
func (s *protectedStoreServer) handlePartnerOnboardingStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	if err := fieldreadiness.AuthorizeStore(r.Context(), s.db, actor, storeID); err != nil {
		s.writeFieldReadinessError(w, err)
		return
	}
	status, err := fieldreadiness.GetStoreOnboardingStatus(r.Context(), s.db, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get onboarding status")
		return
	}
	store.SendJSON(w, http.StatusOK, status)
}

func (s *protectedStoreServer) writeFieldReadinessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, fieldreadiness.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "visit not found or not owned by this agent")
	case errors.Is(err, fieldreadiness.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store or visit")
	case errors.Is(err, fieldreadiness.ErrChecklistIncomplete):
		store.SendError(w, http.StatusConflict, "CHECKLIST_INCOMPLETE", "not all required readiness checks have passed")
	case errors.Is(err, fieldreadiness.ErrEvidenceRequired):
		store.SendError(w, http.StatusConflict, "EVIDENCE_REQUIRED", "required readiness evidence is missing")
	case errors.Is(err, fieldreadiness.ErrOpenEscalation):
		store.SendError(w, http.StatusConflict, "OPEN_ESCALATION", "visit has an open blocking escalation")
	case errors.Is(err, fieldreadiness.ErrVisitAlreadyComplete):
		store.SendError(w, http.StatusConflict, "VISIT_ALREADY_COMPLETE", "visit is already complete")
	case errors.Is(err, fieldreadiness.ErrConflict):
		store.SendError(w, http.StatusConflict, "VISIT_ALREADY_IN_PROGRESS", "store or agent already has an in-progress visit")
	case errors.Is(err, fieldreadiness.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "field readiness operation failed")
	}
}

func marshalVisit(v fieldreadiness.Visit) map[string]any {
	m := map[string]any{
		"id":           v.ID,
		"storeId":      v.StoreID,
		"fieldAgentId": v.FieldAgentID,
		"visitType":    v.VisitType,
		"status":       v.Status,
		"notes":        v.Notes,
		"startedAt":    v.StartedAt,
		"createdAt":    v.CreatedAt,
		"updatedAt":    v.UpdatedAt,
	}
	if v.CompletedAt != nil {
		m["completedAt"] = v.CompletedAt
	}
	return m
}

func marshalCheck(c fieldreadiness.ReadinessCheck) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"visitId":     c.VisitID,
		"storeId":     c.StoreID,
		"checkType":   c.CheckType,
		"status":      c.Status,
		"evidenceUrl": c.EvidenceURL,
		"notes":       c.Notes,
		"verifiedBy":  c.VerifiedBy,
		"createdAt":   c.CreatedAt,
		"updatedAt":   c.UpdatedAt,
	}
}

func marshalEscalation(e fieldreadiness.Escalation) map[string]any {
	m := map[string]any{
		"id":             e.ID,
		"visitId":        e.VisitID,
		"storeId":        e.StoreID,
		"raisedBy":       e.RaisedBy,
		"severity":       e.Severity,
		"category":       e.Category,
		"description":    e.Description,
		"status":         e.Status,
		"resolutionNote": e.ResolutionNote,
		"createdAt":      e.CreatedAt,
		"updatedAt":      e.UpdatedAt,
	}
	if e.ResolvedBy != "" {
		m["resolvedBy"] = e.ResolvedBy
	}
	if e.ResolvedAt != nil {
		m["resolvedAt"] = e.ResolvedAt
	}
	return m
}
