package http

import (
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) refreshCaptainFinancialEligibility(
	r *http.Request,
	operatorContextID string,
	captainID string,
) (dispatch.CaptainFinancialEligibilitySnapshot, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: operatorContextId is required", dispatch.ErrInvalid)
	}
	captainID = strings.TrimSpace(captainID)
	if captainID == "" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: captain id is required", dispatch.ErrInvalid)
	}
	if s.wlt == nil || !s.wlt.Configured() {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT integration is not configured")
	}

	decision, err := s.wlt.EvaluateDispatchFinancialEligibility(
		r.Context(),
		captainID,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, err
	}

	ineligibilityReason := ""
	if !decision.Eligible {
		ineligibilityReason = decision.ReasonCode
	}
	return dispatch.UpsertCaptainFinancialEligibilityDecision(
		r.Context(),
		s.db,
		operatorContextID,
		captainID,
		dispatch.CaptainWltFinancialEligibilityDecision{
			WltDecisionID:       decision.DecisionID,
			WltReasonCode:       decision.ReasonCode,
			WltPolicyVersion:    decision.PolicyVersion,
			Eligible:            decision.Eligible,
			IneligibilityReason: ineligibilityReason,
			SnapshotReference:   decision.DecisionID,
			EvaluatedAt:         decision.EvaluatedAt,
			ExpiresAt:           decision.ExpiresAt,
		},
	)
}

func (s *protectedStoreServer) handleGetDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", DshDispatchCapacityPermissionRead); !ok {
		return
	}
	store.SendError(w, http.StatusGone, "DISPATCH_BALANCE_POLICY_OWNED_BY_WLT", "captain dispatch financial thresholds and wallet policy are owned by WLT; DSH stores only WLT eligibility decision metadata")
}

func (s *protectedStoreServer) handleUpsertDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", DshDispatchCapacityPermissionManage); !ok {
		return
	}
	store.SendError(w, http.StatusGone, "DISPATCH_BALANCE_POLICY_OWNED_BY_WLT", "captain dispatch financial thresholds and wallet policy are owned by WLT; DSH stores only WLT eligibility decision metadata")
}

func (s *protectedStoreServer) handleRefreshOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage)
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	snapshot, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, r.PathValue("captainId"))
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func (s *protectedStoreServer) handleGetOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead)
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	snapshot, err := dispatch.GetCaptainFinancialEligibilitySnapshot(
		r.Context(), s.db, operatorContextID, r.PathValue("captainId"),
	)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func (s *protectedStoreServer) handleRefreshOwnCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OperatorContext_REQUIRED", "captain OperatorContext context is required")
		return
	}
	snapshot, err := s.refreshCaptainFinancialEligibility(r, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func (s *protectedStoreServer) handleGetOwnCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OperatorContext_REQUIRED", "captain OperatorContext context is required")
		return
	}
	snapshot, err := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func writeCaptainFinancialEligibilityError(w http.ResponseWriter, err error) {
	switch {
	case err == nil:
		return
	case strings.Contains(err.Error(), "not configured") || strings.Contains(err.Error(), "returned HTTP") || strings.Contains(err.Error(), "call WLT"):
		store.SendError(w, http.StatusServiceUnavailable, "WLT_FINANCIAL_ELIGIBILITY_UNAVAILABLE", "WLT financial eligibility decision could not be verified")
	case strings.Contains(err.Error(), "metadata is incomplete") || strings.Contains(err.Error(), "time window is invalid") || strings.Contains(err.Error(), "already expired"):
		store.SendError(w, http.StatusConflict, "WLT_FINANCIAL_DECISION_INVALID", "WLT returned an invalid dispatch financial decision")
	case strings.Contains(err.Error(), dispatch.ErrCaptainNotEligible.Error()):
		store.SendError(w, http.StatusConflict, "CAPTAIN_WLT_FINANCIAL_DECISION_REQUIRED", "captain WLT financial eligibility decision has not been verified")
	case strings.Contains(err.Error(), dispatch.ErrInvalid.Error()):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "captain financial eligibility operation failed")
	}
}
