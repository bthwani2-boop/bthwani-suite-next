package http

import (
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

// AggregatedFieldReadiness is the DSH boundary for the field app's start-work
// decision. Workforce owns the activation facts; DSH owns this journey
// boundary and keeps action-specific store/visit prerequisites in their
// existing handlers rather than inventing a second global policy engine.
type AggregatedFieldReadiness struct {
	Ready   bool     `json:"ready"`
	Missing []string `json:"missing"`
}

func (s *protectedStoreServer) getFieldAggregatedReadiness(r *http.Request, actorID string) (AggregatedFieldReadiness, error) {
	if s.workforce == nil || !s.workforce.Configured() {
		return AggregatedFieldReadiness{}, fmt.Errorf("workforce readiness unavailable: client not configured")
	}
	workforceReadiness, err := s.workforce.FieldActivationReadiness(r.Context(), strings.TrimSpace(actorID))
	if err != nil {
		return AggregatedFieldReadiness{}, fmt.Errorf("workforce readiness unavailable: %w", err)
	}

	missing := append([]string(nil), workforceReadiness.Missing...)
	if missing == nil {
		missing = []string{}
	}
	return AggregatedFieldReadiness{
		Ready:   workforceReadiness.IsActive,
		Missing: missing,
	}, nil
}

func writeFieldOperationalReadinessError(w http.ResponseWriter, err error) {
	if strings.Contains(err.Error(), "workforce readiness unavailable") {
		store.SendError(w, http.StatusServiceUnavailable, "FIELD_READINESS_UNAVAILABLE", "a sovereign field readiness dependency could not be verified")
		return
	}
	store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "field readiness could not be evaluated")
}

// GET /dsh/field/me/readiness
func (s *protectedStoreServer) handleGetFieldSelfReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	readiness, err := s.getFieldAggregatedReadiness(r, actor.ID)
	if err != nil {
		writeFieldOperationalReadinessError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, readiness)
}
