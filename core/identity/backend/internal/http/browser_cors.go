package http

import "net/http"

// BrowserOriginGuard fails closed for browser-originated requests before
// CorsMiddleware can answer a preflight request. Native/mobile and service
// callers normally omit Origin and remain unaffected.
func BrowserOriginGuard(next http.Handler) http.Handler {
	allowed := allowedCorsOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && !allowed[origin] {
			sendError(w, http.StatusForbidden, "CORS_ORIGIN_FORBIDDEN", "browser origin is not allowed")
			return
		}
		next.ServeHTTP(w, r)
	})
}
