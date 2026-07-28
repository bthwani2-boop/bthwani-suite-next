package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/wlt"
)

// TrustedTenantContextMiddleware resolves an authenticated Identity session and
// installs its tenant into the request context before any DSH-to-WLT call. Route
// handlers still perform their own authorization; this middleware does not grant
// access and never accepts X-Tenant-ID from the browser as ownership evidence.
func TrustedTenantContextMiddleware(identity *auth.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if identity != nil && strings.HasPrefix(strings.TrimSpace(r.Header.Get("Authorization")), "Bearer ") {
			resolved, err := identity.Resolve(r.Context(), r.Header.Get("Authorization"))
			if err == nil && strings.TrimSpace(resolved.TenantID) != "" {
				r = r.WithContext(wlt.WithTenantContext(r.Context(), resolved.TenantID))
			}
		}
		next.ServeHTTP(w, r)
	})
}
