package http

import (
	"net/http"
	"os"
	"strings"
)

const minimumActivationHMACSecretLength = 32

// RuntimeReadinessBoundary keeps the liveness probe independent while making
// readiness fail closed when Identity cannot safely issue or consume activation
// challenges for the active platform context. Database readiness remains owned
// by the downstream readiness handler.
func RuntimeReadinessBoundary(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/identity/readiness" {
			next.ServeHTTP(w, r)
			return
		}

		if len(strings.TrimSpace(os.Getenv("IDENTITY_ACTIVATION_HMAC_SECRET"))) < minimumActivationHMACSecretLength {
			sendError(
				w,
				http.StatusServiceUnavailable,
				"IDENTITY_NOT_READY",
				"identity activation security is not configured",
			)
			return
		}
		if strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")) == "" {
			sendError(
				w,
				http.StatusServiceUnavailable,
				"IDENTITY_NOT_READY",
				"identity platform context is not configured",
			)
			return
		}

		next.ServeHTTP(w, r)
	})
}
