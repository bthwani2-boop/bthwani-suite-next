package http

import (
	"dsh-api/internal/opctx"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
)

// TrustedOperatorContextMiddleware resolves an authenticated Identity session and
// installs its OperatorContext into the request context before any DSH-to-WLT call. Route
// handlers still perform their own authorization; this middleware does not grant
// access and never accepts X-Operator-Context-ID from the browser as ownership evidence.
func TrustedOperatorContextMiddleware(identity *auth.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if identity != nil && strings.HasPrefix(strings.TrimSpace(r.Header.Get("Authorization")), "Bearer ") {
			resolved, err := identity.Resolve(r.Context(), r.Header.Get("Authorization"))
			if err == nil && strings.TrimSpace(resolved.OperatorContextID) != "" {
				r = r.WithContext(opctx.WithOperatorContext(r.Context(), resolved.OperatorContextID))
			}
		}
		next.ServeHTTP(w, r)
	})
}
