package http

import "net/http"

// withFieldActor preserves the explicit field-surface role boundary at the
// router layer. Concrete handlers own store/visit authorization and
// readiness-state checks; this wrapper does not create a readiness policy.
func (s *protectedStoreServer) withFieldActor(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := s.requireActor(w, r, "field"); !ok {
			return
		}
		next(w, r)
	}
}
