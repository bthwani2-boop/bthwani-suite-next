package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
)

func writeClientAddressPrivacyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, clientaddress.ErrPrivacyInvalid):
		store.SendError(
			w,
			http.StatusBadRequest,
			"INVALID_PRIVACY_REQUEST",
			"client address privacy request is invalid",
		)
	case errors.Is(err, clientaddress.ErrPrivacyVersionConflict):
		store.SendError(
			w,
			http.StatusConflict,
			"PRIVACY_VERSION_CONFLICT",
			"privacy policy changed; reload and retry",
		)
	case errors.Is(err, clientaddress.ErrPrivacyIdempotencyConflict):
		store.SendError(
			w,
			http.StatusConflict,
			"IDEMPOTENCY_CONFLICT",
			"idempotency key was reused with a different privacy request",
		)
	default:
		store.SendError(
			w,
			http.StatusInternalServerError,
			"INTERNAL_ERROR",
			"client address privacy operation failed",
		)
	}
}

func privacyMutationContext(
	w http.ResponseWriter,
	r *http.Request,
	actorID string,
) (clientaddress.PrivacyMutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(idempotencyKey) < 8 {
		store.SendError(
			w,
			http.StatusBadRequest,
			"IDEMPOTENCY_KEY_REQUIRED",
			"Idempotency-Key must contain at least 8 characters",
		)
		return clientaddress.PrivacyMutationContext{}, false
	}
	if len(correlationID) < 8 {
		store.SendError(
			w,
			http.StatusBadRequest,
			"CORRELATION_ID_REQUIRED",
			"X-Correlation-ID must contain at least 8 characters",
		)
		return clientaddress.PrivacyMutationContext{}, false
	}
	return clientaddress.PrivacyMutationContext{
		ActorID:        actorID,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	}, true
}

func (s *protectedStoreServer) handleGetClientAddressPrivacyPolicy(
	w http.ResponseWriter,
	r *http.Request,
) {
	if _, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		"platform.read",
		"operator",
	); !ok {
		return
	}
	policy, err := clientaddress.GetPrivacyPolicy(r.Context(), s.db)
	if err != nil {
		writeClientAddressPrivacyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleUpdateClientAddressPrivacyPolicy(
	w http.ResponseWriter,
	r *http.Request,
) {
	actor, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		"platform.manage",
		"operator",
	)
	if !ok {
		return
	}
	mutation, ok := privacyMutationContext(w, r, actor.ID)
	if !ok {
		return
	}
	var input clientaddress.UpdatePrivacyPolicyInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	policy, err := clientaddress.UpdatePrivacyPolicy(
		r.Context(),
		s.db,
		input,
		mutation,
	)
	if err != nil {
		writeClientAddressPrivacyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleAnonymizeExpiredClientAddresses(
	w http.ResponseWriter,
	r *http.Request,
) {
	actor, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		"platform.manage",
		"operator",
	)
	if !ok {
		return
	}
	mutation, ok := privacyMutationContext(w, r, actor.ID)
	if !ok {
		return
	}
	var body struct {
		Limit int `json:"limit"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	result, err := clientaddress.AnonymizeExpiredIdempotent(
		r.Context(),
		s.db,
		body.Limit,
		mutation,
	)
	if err != nil {
		writeClientAddressPrivacyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"result": result})
}
