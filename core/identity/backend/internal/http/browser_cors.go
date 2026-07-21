package http

import (
	"net/http"
)

// BrowserCorsMiddleware owns browser preflight handling for Identity's public
// HTTP surface. It is intentionally layered outside CorsMiddleware so legacy
// request handling remains unchanged while DELETE session/account operations
// are exposed to approved browser origins.
func BrowserCorsMiddleware(next http.Handler) http.Handler {
	allowed := allowedCorsOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("X-Service", "core-identity")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Fingerprint, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
