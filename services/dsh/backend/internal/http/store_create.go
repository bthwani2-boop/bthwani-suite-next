package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleOperatorCreateStore(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	s.createStore(w, r, operatorContextID, "control-panel")
}

func (s *protectedStoreServer) handlePartnerCreateStore(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	s.createStore(w, r, operatorContextID, "partner")
}

func (s *protectedStoreServer) handleFieldCreateStore(w http.ResponseWriter, r *http.Request) {
	operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	s.createStore(w, r, operatorContextID, "field")
}

func (s *protectedStoreServer) createStore(w http.ResponseWriter, r *http.Request, operatorContextID string, surface string) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorID := actor.ID
	if actorID == "" {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "authentication required")
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	correlationID := r.Header.Get("X-Correlation-ID")

	var input store.CreateDraftStoreInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	storeRow, replayed, err := store.CreateStoreForOperatorContextIdempotent(
		r.Context(), s.db, operatorContextID, actorID, idempotencyKey, correlationID, input,
	)
	if err != nil {
		if errors.Is(err, store.ErrIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency conflict with prior request")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(storeRow)
}
