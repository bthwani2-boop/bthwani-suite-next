package http

import "net/http"

// BrowserCorsMiddleware fails closed for browser-originated requests before
// they reach Identity handlers. Native/mobile and service requests normally do
// not carry Origin and continue through the canonical CORS response middleware.
func BrowserCorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && !allowedCorsOrigins()[origin] {
			sendError(w, http.StatusForbidden, "CORS_ORIGIN_FORBIDDEN", "browser origin is not allowed")
			return
		}
		next.ServeHTTP(w, r)
	})
}
