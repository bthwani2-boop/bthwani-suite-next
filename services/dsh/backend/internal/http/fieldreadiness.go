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
	visit, err := fieldreadiness.CreateVisit(s.db, fieldreadiness.CreateVisitInput{
		StoreID:      storeID,
		FieldAgentID: actor.ID,
		VisitType:    vt,
	})
	if err != nil {
		if errors.Is(err, fieldreadiness.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create field visit")
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
	_ = actor
	visits, err := fieldreadiness.ListStoreVisits(s.db, storeID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list visits")
		return
	}
	result := make([]map[string]any, 0, len(visits))
	for _, v := range visits {
		result = append(result, marshalVisit(v))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visits": result})
}

// POST /dsh/field/visits/{visitId}/complete
func (s *protectedStoreServer) handleCompleteFieldVisit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visitID := r.PathValue("visitId")
	visit, err := fieldreadiness.CompleteVisit(s.db, visitID, actor.ID)
	if errors.Is(err, fieldreadiness.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "visit not found or not owned by this agent")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to complete visit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"visit": marshalVisit(visit)})
}

// PUT /dsh/field/visits/{visitId}/checks
func (s *protectedStoreServer) handleUpsertReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
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
	check, err := fieldreadiness.UpsertReadinessCheck(s.db, visitID, fieldreadiness.UpdateCheckInput{
		CheckType:   body.CheckType,
		Status:      fieldreadiness.CheckStatus(body.Status),
		EvidenceURL: body.EvidenceURL,
		Notes:       body.Notes,
	})
	if errors.Is(err, fieldreadiness.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "visit not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upsert readiness check")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"check": marshalCheck(check)})
}

// GET /dsh/field/visits/{visitId}/checks
func (s *protectedStoreServer) handleListVisitChecks(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	visitID := r.PathValue("visitId")
	checks, err := fieldreadiness.ListVisitChecks(s.db, visitID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list checks")
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
	esc, err := fieldreadiness.CreateEscalation(s.db, fieldreadiness.CreateEscalationInput{
		VisitID:     body.VisitID,
		StoreID:     storeID,
		RaisedBy:    actor.ID,
		Severity:    fieldreadiness.EscalationSeverity(body.Severity),
		Category:    fieldreadiness.EscalationCategory(body.Category),
		Description: body.Description,
	})
	if errors.Is(err, fieldreadiness.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "missing required escalation fields")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create escalation")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"escalation": marshalEscalation(esc)})
}

// GET /dsh/operator/field-readiness/escalations
func (s *protectedStoreServer) handleListOperatorEscalations(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	statusFilter := r.URL.Query().Get("status")
	list, err := fieldreadiness.ListOperatorEscalations(s.db, statusFilter, 100)
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
	actor, ok := s.requireActor(w, r, "operator")
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
	esc, err := fieldreadiness.UpdateEscalation(s.db, escalationID, fieldreadiness.UpdateEscalationInput{
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
	_, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	status, err := fieldreadiness.GetStoreOnboardingStatus(s.db, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get onboarding status")
		return
	}
	store.SendJSON(w, http.StatusOK, status)
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
