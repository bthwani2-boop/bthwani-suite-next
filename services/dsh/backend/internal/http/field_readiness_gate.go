package http

import "net/http"

// enforceFieldReadinessGate preserves the explicit field-surface boundary at
// the router layer while the concrete handlers keep owning the store/visit
// authorization and readiness-state checks. It intentionally does not create a
// second source of assignment truth in DSH; store access still resolves through
// the Workforce-backed authorization primitives used by the handlers.
func (s *protectedStoreServer) enforceFieldReadinessGate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := s.requireActor(w, r, "field"); !ok {
			return
		}
		next(w, r)
	}
}
