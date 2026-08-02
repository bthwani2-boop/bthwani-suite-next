package http

import (
	"net/http"
	"os"
	"strings"
)

// RuntimeOperatorContextBoundary prevents internal callers from becoming the
// source of operator scope. Every internal Identity operation is unavailable
// unless the active platform context is fixed by server configuration first.
func RuntimeOperatorContextBoundary(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/internal/") && strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")) == "" {
			sendError(
				w,
				http.StatusServiceUnavailable,
				"INTERNAL_API_UNAVAILABLE",
				"trusted operator context is not configured",
			)
			return
		}
		next.ServeHTTP(w, r)
	})
}
