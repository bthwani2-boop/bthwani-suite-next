package http

import "net/http"

// CorsMiddleware is kept in a dedicated file so router rewrites cannot remove
// the runtime boundary. Local development origins are explicit and production
// deployments remain responsible for their own edge-origin policy.
func CorsMiddleware(authMode string, next http.Handler) http.Handler {
	localCorsOrigins := map[string]bool{}
	if authMode != "" {
		localCorsOrigins["http://localhost:13000"] = true
		localCorsOrigins["http://127.0.0.1:13000"] = true
		localCorsOrigins["http://localhost:13002"] = true
		localCorsOrigins["http://127.0.0.1:13002"] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "dsh")
		origin := r.Header.Get("Origin")
		if localCorsOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
