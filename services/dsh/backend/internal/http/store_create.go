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
	s.createOperatorStore(w, r, operatorContextID)
}

// Generic partner-side branch creation is intentionally retired. app-partner
// manages stores already authorized to its session; it does not create store
// ownership authority.
func (s *protectedStoreServer) handlePartnerCreateStore(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "partner"); !ok {
		return
	}
	store.SendError(w, http.StatusMethodNotAllowed, "STORE_CREATION_NOT_ALLOWED", "app-partner cannot create store ownership; use the governed operator lifecycle")
}

// Generic field-side branch creation is intentionally retired. app-field owns
// only the first-store draft embedded in partner onboarding.
func (s *protectedStoreServer) handleFieldCreateStore(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "field"); !ok {
		return
	}
	store.SendError(w, http.StatusMethodNotAllowed, "STORE_CREATION_NOT_ALLOWED", "app-field must update the governed first store through /dsh/field/partners/{partnerId}/store")
}

func (s *protectedStoreServer) createOperatorStore(w http.ResponseWriter, r *http.Request, operatorContextID string) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "authentication required")
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
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	storeRow, replayed, err := store.CreateGovernedStoreForOperatorContextIdempotent(
		r.Context(), s.db, operatorContextID, actorID, idempotencyKey, correlationID, input,
	)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrIdempotencyConflict):
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency conflict with prior request")
		case errors.Is(err, store.ErrStoreCreationInvalid):
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, store.ErrStoreCreationPartnerNotFound):
			store.SendError(w, http.StatusNotFound, "PARTNER_NOT_FOUND", err.Error())
		case errors.Is(err, store.ErrPartnerStoreOwnershipNotAllowed):
			store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_STATE_BLOCKS_STORE_OWNERSHIP", err.Error())
		default:
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		}
		return
	}

	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
		w.Header().Set("Idempotent-Replayed", "true")
	}
	store.SendJSON(w, status, storeRow)
}
