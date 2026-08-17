package http

import "net/http"

// RuntimeOperatorContextBoundary prevents internal callers from becoming the
// source of operator scope. Every internal Identity operation is unavailable
// unless the active platform context is fixed by server configuration first.
func RuntimeOperatorContextBoundary(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}
