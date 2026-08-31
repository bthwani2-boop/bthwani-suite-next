package http

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

type AggregatedCaptainReadiness struct {
	Ready   bool     `json:"ready"`
	Missing []string `json:"missing"`
}

func (s *protectedStoreServer) getCaptainAggregatedReadiness(r *http.Request, operatorContextID, captainID string) (AggregatedCaptainReadiness, error) {
	var missing []string

	// 1. Workforce Activation Readiness
	workforceReadiness, err := s.workforce.ActivationReadinessInOperatorContext(r.Context(), operatorContextID, captainID)
	if err != nil {
		return AggregatedCaptainReadiness{}, fmt.Errorf("workforce readiness unavailable: %w", err)
	}
	if !workforceReadiness.IsActive {
		missing = append(missing, workforceReadiness.Missing...)
	}

	// 2. DSH Dispatch Profile
	profile, err := dispatch.GetCaptainDispatchProfile(s.db, operatorContextID, captainID)
	switch err {
	case nil:
		if profile.AccreditationStatus != "approved" {
			missing = append(missing, "DISPATCH_ACCREDITATION_REQUIRED")
		}
		if profile.AvailabilityStatus == "suspended" {
			missing = append(missing, "DISPATCH_SUSPENDED")
		}
	case dispatch.ErrCaptainProfileNotFound:
		missing = append(missing, "DISPATCH_PROFILE_REQUIRED")
	default:
		return AggregatedCaptainReadiness{}, err
	}

	// 3. WLT Financial Eligibility
	financial, err := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, operatorContextID, captainID)
	if err != nil || !financial.Eligible || !financial.ExpiresAt.After(time.Now()) {
		updated, refreshErr := s.refreshCaptainFinancialEligibility(r, operatorContextID, captainID)
		if refreshErr != nil {
			return AggregatedCaptainReadiness{}, fmt.Errorf("financial readiness unavailable: %w", refreshErr)
		}
		financial = updated
	}
	if !financial.Eligible {
		reason := "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"
		if financial.IneligibilityReason != "" {
			reason = financial.IneligibilityReason
		}
		missing = append(missing, reason)
	}

	return AggregatedCaptainReadiness{
		Ready:   len(missing) == 0,
		Missing: missing,
	}, nil
}

func writeCaptainReadinessError(w http.ResponseWriter, err error) {
	message := err.Error()
	if strings.Contains(message, "workforce readiness unavailable") ||
		strings.Contains(message, "financial readiness unavailable") ||
		strings.Contains(message, "not configured") ||
		strings.Contains(message, "WLT wallet read failed") {
		store.SendError(w, http.StatusServiceUnavailable, "CAPTAIN_READINESS_UNAVAILABLE", "a sovereign readiness dependency could not be verified")
		return
	}
	writeGovernedDispatchError(w, err)
}

func (s *protectedStoreServer) handleGetCaptainSelfReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}

	readiness, err := s.getCaptainAggregatedReadiness(r, operatorContextID, actor.ID)
	if err != nil {
		writeCaptainReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, readiness)
}

func (s *protectedStoreServer) handleGetCaptainOperatorReadiness(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}

	captainID := r.PathValue("captainId")
	readiness, err := s.getCaptainAggregatedReadiness(r, operatorContextID, captainID)
	if err != nil {
		writeCaptainReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, readiness)
}
