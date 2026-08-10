package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

// writePlatformPolicyError maps operational-policy domain errors onto the
// governed HTTP error vocabulary. Handlers must not classify these errors
// themselves, so that a version or idempotency conflict cannot be reported as a
// generic failure on one route and a conflict on another.
func writePlatformPolicyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, platformpolicies.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_PLATFORM_POLICY", "operational policy input is invalid")
	case errors.Is(err, platformpolicies.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "PLATFORM_POLICY_NOT_FOUND", "operational policy record was not found")
	case errors.Is(err, platformpolicies.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "operational policy changed; reload before retrying")
	case errors.Is(err, platformpolicies.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different operational policy request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "operational policy operation failed")
	}
}

// platformPolicyMutation builds the audited mutation context every operational
// policy write must carry. It fails closed: a write without an idempotency key,
// a correlation id and a reason never reaches the domain.
func platformPolicyMutation(
	w http.ResponseWriter,
	r *http.Request,
	actorID string,
	reason string,
) (platformpolicies.MutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	reason = strings.TrimSpace(reason)
	if len(idempotencyKey) < 8 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
		return platformpolicies.MutationContext{}, false
	}
	if len(correlationID) < 8 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain at least 8 characters")
		return platformpolicies.MutationContext{}, false
	}
	if len(reason) < 3 || len(reason) > 500 {
		store.SendError(w, http.StatusBadRequest, "REASON_REQUIRED", "a reason between 3 and 500 characters is required")
		return platformpolicies.MutationContext{}, false
	}
	return platformpolicies.MutationContext{
		ActorID:        actorID,
		ActorSurface:   "control-panel",
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		Reason:         reason,
	}, true
}
