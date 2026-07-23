package http

import (
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// ReferenceReadBoundary protects the narrow WLT projections that historically
// remained public. Health/readiness and all non-reference routes preserve their
// existing ownership; active SaaS reference reads require a trusted DSH service
// or a same-tenant Identity session.
func ReferenceReadBoundary(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/wlt/references/") {
			if !shared.RequireReferenceReader(w, r) {
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
