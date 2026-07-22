package http

import "net/http"

// PickupMutationPathContext resolves the orderId before the mutation guard runs.
// net/http.ServeMux normally populates path values inside ServeHTTP, while the
// guard must authorize and lock the order before delegating to the mux.
func PickupMutationPathContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if route, ok := matchPickupMutationRoute(r); ok {
			r.SetPathValue("orderId", route.orderID)
		}
		next.ServeHTTP(w, r)
	})
}
