package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) getFieldAggregatedReadiness(r *http.Request, operatorContextID, actorID string) (map[string]any, error) {
	workforceReadiness, err := s.workforce.FieldActivationReadiness(r.Context(), actorID)
	if err != nil {
		return nil, err
	}

	isReady := true
	reasons := []string{}

	if !workforceReadiness.IsActive {
		isReady = false
		reasons = append(reasons, "WORKFORCE_INACTIVE")
	}
	if len(workforceReadiness.Missing) > 0 {
		isReady = false
		reasons = append(reasons, workforceReadiness.Missing...)
	}

	return map[string]any{
		"isReady": isReady,
		"reasons": reasons,
	}, nil
}

func (s *protectedStoreServer) handleGetFieldSelfReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	operatorContextID := strings.TrimSpace(actor.OperatorContextID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted operator context is required")
		return
	}

	readiness, err := s.getFieldAggregatedReadiness(r, operatorContextID, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch field readiness")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"fieldReadiness": readiness})
}

func (s *protectedStoreServer) handleGetFieldOperatorReadiness(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "MISSING_OPERATOR_CONTEXT", "operator context is required")
		return
	}

	fieldID := r.PathValue("fieldId")
	if fieldID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "fieldId is required")
		return
	}

	readiness, err := s.getFieldAggregatedReadiness(r, operatorContextID, fieldID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch field readiness")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"fieldReadiness": readiness})
}

func (s *protectedStoreServer) enforceFieldReadinessGate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := s.requireActor(w, r, "field")
		if !ok {
			return
		}
		operatorContextID := strings.TrimSpace(actor.OperatorContextID)
		if operatorContextID == "" {
			store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted operator context is required")
			return
		}

		readiness, err := s.getFieldAggregatedReadiness(r, operatorContextID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to check field readiness")
			return
		}

		if isReady, ok := readiness["isReady"].(bool); !ok || !isReady {
			store.SendError(w, http.StatusForbidden, "FIELD_NOT_READY", "field agent is not ready for operations")
			return
		}

		// Field agent is ready; proceed
		next(w, r)
	}
}
