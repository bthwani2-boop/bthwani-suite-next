package http

import (
	"net/http"
	"strings"
)

// ActivationMutationSafetyMiddleware enforces retry identity before issuing a
// one-time provider activation code. Repeated operator submissions must reach
// Identity with the same stable key instead of revoking and replacing a valid
// pending challenge accidentally.
func ActivationMutationSafetyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/activation-codes") {
			if len(strings.TrimSpace(r.Header.Get("Idempotency-Key"))) < 8 {
				sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
