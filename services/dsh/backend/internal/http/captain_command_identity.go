package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

func requireCaptainCommandIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return "", "", false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(correlationID) < 8 || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain between 8 and 200 characters")
		return "", "", false
	}
	return idempotencyKey, correlationID, true
}
