package http

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
)

const maxGovernanceHeaderLength = 200

// RequestContractMiddleware enforces the public HTTP envelope shared by all
// JRN-002 operations without duplicating domain validation in handlers.
func RequestContractMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		if len(correlationID) > maxGovernanceHeaderLength {
			sendError(w, http.StatusBadRequest, "INVALID_CORRELATION_ID", "X-Correlation-ID is too long")
			return
		}
		if correlationID == "" {
			correlationID = newCorrelationID()
		}
		w.Header().Set("X-Correlation-ID", correlationID)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")

		if key := strings.TrimSpace(r.Header.Get("Idempotency-Key")); len(key) > maxGovernanceHeaderLength {
			sendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key is too long")
			return
		}

		if r.ContentLength > 0 && (r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch) {
			contentType := strings.ToLower(strings.TrimSpace(strings.Split(r.Header.Get("Content-Type"), ";")[0]))
			if contentType != "application/json" {
				sendError(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "application/json is required")
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func newCorrelationID() string {
	value := make([]byte, 12)
	if _, err := rand.Read(value); err != nil {
		return "identity-correlation-unavailable"
	}
	return "id_" + hex.EncodeToString(value)
}
