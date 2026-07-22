package http

import (
	"context"
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

func (s *protectedStoreServer) specialRequestFinancialReadback(ctx context.Context, request *specialrequests.SpecialRequest) map[string]any {
	result := map[string]any{
		"owner":                   "WLT",
		"readState":               "not_started",
		"paymentSession":          nil,
		"settlementApplicability": "not_applicable",
		"settlementReason":        "JRN-022 has no partner settlement source; WLT payment-session status is the complete applicable financial readback.",
	}
	if request.WltPaymentSessionID == nil || *request.WltPaymentSessionID == "" {
		return result
	}
	if s.wlt == nil || !s.wlt.Configured() {
		result["readState"] = "unavailable"
		return result
	}
	session, err := s.wlt.GetPaymentSession(ctx, *request.WltPaymentSessionID)
	if err != nil {
		result["readState"] = "unavailable"
		return result
	}
	if session == nil {
		result["readState"] = "not_found"
		return result
	}
	result["readState"] = "available"
	result["paymentSession"] = map[string]any{
		"id":                session.ID,
		"specialRequestId":  session.SpecialRequestID,
		"status":            session.Status,
		"providerReference": session.ProviderReference,
		"amountMinorUnits":  session.AmountMinorUnits,
		"currency":          session.Currency,
		"updatedAt":         session.UpdatedAt,
	}
	return result
}

// GET /dsh/client/special-requests/{requestId}/execution
func (s *protectedStoreServer) handleGetClientSpecialRequestExecution(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	request, err := svc.GetForClientInTenant(r.Context(), actor.TenantID, requestID, actor.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	evidence, err := svc.ExecutionEvidenceInTenant(r.Context(), actor.TenantID, requestID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"execution": marshalSpecialRequestExecution(evidence),
		"financial": s.specialRequestFinancialReadback(r.Context(), request),
	})
}

// GET /dsh/operator/special-requests/{requestId}/execution
func (s *protectedStoreServer) handleGetOperatorSpecialRequestExecution(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsSpecialRequestsPermissionRead, "operator")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	request, err := svc.GetForOperatorInTenant(r.Context(), actor.TenantID, requestID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	evidence, err := svc.ExecutionEvidenceInTenant(r.Context(), actor.TenantID, requestID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"execution": marshalSpecialRequestExecution(evidence),
		"financial": s.specialRequestFinancialReadback(r.Context(), request),
	})
}
