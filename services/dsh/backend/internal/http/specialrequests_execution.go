package http

import (
	"net/http"

	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

func marshalSpecialRequestExecution(evidence *specialrequests.ExecutionEvidence) map[string]any {
	var exception any
	if evidence.LatestException != nil {
		exception = map[string]any{
			"id":               evidence.LatestException.ID,
			"reasonCode":       evidence.LatestException.ReasonCode,
			"note":             evidence.LatestException.Note,
			"severity":         evidence.LatestException.Severity,
			"status":           evidence.LatestException.Status,
			"reportedAt":       evidence.LatestException.ReportedAt,
			"acknowledgedAt":   evidence.LatestException.AcknowledgedAt,
			"resolvedAt":       evidence.LatestException.ResolvedAt,
			"resolutionAction": evidence.LatestException.ResolutionAction,
			"resolutionNote":   evidence.LatestException.ResolutionNote,
		}
	}
	return map[string]any{
		"specialRequestId":      evidence.SpecialRequestID,
		"assignmentId":          evidence.AssignmentID,
		"captainId":             evidence.CaptainID,
		"assignmentStatus":      evidence.AssignmentStatus,
		"assignmentCreatedAt":   evidence.AssignmentCreatedAt,
		"acceptedAt":            evidence.AcceptedAt,
		"assignmentCompletedAt": evidence.AssignmentCompletedAt,
		"deliveryStatus":        evidence.DeliveryStatus,
		"podMethod":             evidence.PoDMethod,
		"podReference":          evidence.PoDReference,
		"deliveryNote":          evidence.DeliveryNote,
		"deliveryUpdatedAt":     evidence.DeliveryUpdatedAt,
		"latestException":       exception,
	}
}

// GET /dsh/client/special-requests/{requestId}/execution
func (s *protectedStoreServer) handleGetClientSpecialRequestExecution(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForClientInTenant(r.Context(), actor.TenantID, requestID, actor.ID); err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	evidence, err := svc.ExecutionEvidenceInTenant(r.Context(), actor.TenantID, requestID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"execution": marshalSpecialRequestExecution(evidence)})
}

// GET /dsh/operator/special-requests/{requestId}/execution
func (s *protectedStoreServer) handleGetOperatorSpecialRequestExecution(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsSpecialRequestsPermissionRead, "operator")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	evidence, err := svc.ExecutionEvidenceInTenant(r.Context(), actor.TenantID, requestID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"execution": marshalSpecialRequestExecution(evidence)})
}
