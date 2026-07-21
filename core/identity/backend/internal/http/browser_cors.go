package http

import "net/http"

// rejectForbiddenBrowserOrigin fails closed for browser-originated requests
// before CorsMiddleware can answer a preflight request. Native/mobile and
// service callers normally omit Origin and remain unaffected.
func rejectForbiddenBrowserOrigin(w http.ResponseWriter, r *http.Request, allowed map[string]bool) bool {
	origin := r.Header.Get("Origin")
	if origin == "" || allowed[origin] {
		return false
	}
	sendError(w, http.StatusForbidden, "CORS_ORIGIN_FORBIDDEN", "browser origin is not allowed")
	return true
}
