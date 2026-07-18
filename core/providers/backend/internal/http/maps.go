package http

import (
	"errors"
	"net/http"

	"providers-api/internal/auth"
	"providers-api/internal/providers"
)

func (s *server) searchMaps(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input providers.MapSearchInput
	if !decodeJSON(w, r, &input) {
		return
	}
	response, err := s.service.SearchMaps(r.Context(), input)
	if err != nil {
		writeMapError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, response)
}

func (s *server) reverseMap(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input providers.MapReverseInput
	if !decodeJSON(w, r, &input) {
		return
	}
	response, err := s.service.ReverseMap(r.Context(), input)
	if err != nil {
		writeMapError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, response)
}

func writeMapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, providers.ErrInvalidMapRequest):
		sendError(w, http.StatusBadRequest, "INVALID_MAP_REQUEST", "map request is invalid")
	case errors.Is(err, providers.ErrMapProviderNotConfigured):
		sendError(w, http.StatusServiceUnavailable, "MAP_PROVIDER_NOT_CONFIGURED", "no governed map provider is configured")
	case errors.Is(err, providers.ErrMapProviderUnavailable):
		sendError(w, http.StatusBadGateway, "MAP_PROVIDER_UNAVAILABLE", "all governed map providers are unavailable")
	default:
		sendError(w, http.StatusInternalServerError, "PROVIDERS_INTERNAL_ERROR", "map provider request failed")
	}
}
