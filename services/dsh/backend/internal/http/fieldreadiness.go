package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/fieldreadiness"
	"dsh-api/internal/store"
)


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
	case errors.Is(err, fieldreadiness.ErrLocationRequired):
		store.SendError(w, http.StatusBadRequest, "LOCATION_REQUIRED", "GPS location evidence is required")
	case errors.Is(err, fieldreadiness.ErrLocationStale):
		store.SendError(w, http.StatusBadRequest, "LOCATION_STALE", "GPS location is too old — please recapture")
	case errors.Is(err, fieldreadiness.ErrLocationAccuracy):
		store.SendError(w, http.StatusBadRequest, "LOCATION_ACCURACY", "GPS accuracy is insufficient")
	case errors.Is(err, fieldreadiness.ErrLocationMocked):
		store.SendError(w, http.StatusBadRequest, "LOCATION_MOCKED", "mocked GPS location is not permitted")
	case errors.Is(err, fieldreadiness.ErrGeofenceViolation):
		store.SendError(w, http.StatusConflict, "GEOFENCE_VIOLATION", "completion location is outside the allowed geofence radius")
	case errors.Is(err, fieldreadiness.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "field readiness operation failed")
	}
}

func marshalVisit(v fieldreadiness.Visit) map[string]any {
	m := map[string]any{
		"id":                   v.ID,
		"storeId":              v.StoreID,
		"fieldAgentId":         v.FieldAgentID,
		"visitType":            v.VisitType,
		"status":               v.Status,
		"notes":                v.Notes,
		"startedAt":            v.StartedAt,
		"createdAt":            v.CreatedAt,
		"updatedAt":            v.UpdatedAt,
		"geofenceRadiusMeters": v.GeofenceRadiusMeters,
		"startIsMocked":        v.StartIsMocked,
	}
	if v.CompletedAt != nil {
		m["completedAt"] = v.CompletedAt
	}
	if v.StartLatitude != nil {
		m["startLatitude"] = v.StartLatitude
		m["startLongitude"] = v.StartLongitude
		m["startAccuracyMeters"] = v.StartAccuracyMeters
		m["startGeofenceStatus"] = v.StartGeofenceStatus
		m["startDistanceFromStoreMeters"] = v.StartDistanceFromStoreMeters
	}
	if v.CompletionLatitude != nil {
		m["completionLatitude"] = v.CompletionLatitude
		m["completionLongitude"] = v.CompletionLongitude
		m["completionAccuracyMeters"] = v.CompletionAccuracyMeters
		m["completionGeofenceStatus"] = v.CompletionGeofenceStatus
		m["completionDistanceFromStoreMeters"] = v.CompletionDistanceFromStoreMeters
	}
	if v.StoreLatitude != nil {
		m["storeLatitude"] = v.StoreLatitude
		m["storeLongitude"] = v.StoreLongitude
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
