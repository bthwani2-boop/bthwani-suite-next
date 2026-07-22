package http

import (
	"net/http"

	"providers-api/internal/auth"
	"providers-api/internal/providers"
)

func (s *server) routeMaps(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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
