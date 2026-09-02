package http

import (
	"net/http"

	auth "github.com/bthwani2-boop/bthwani-identityauth"
	"providers-api/internal/providers"
)

func (s *server) routeMaps(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	var input providers.MapRouteInput
	if !decodeJSON(w, r, &input) {
		return
	}
	response, err := s.service.RouteMaps(r.Context(), input)
	if err != nil {
		writeMapError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, response)
}
