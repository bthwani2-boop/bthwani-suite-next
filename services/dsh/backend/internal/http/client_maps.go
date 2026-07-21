package http

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"dsh-api/internal/mapproviders"
	"dsh-api/internal/servicearea"
	"dsh-api/internal/store"
)

type verifiedMapLocation struct {
	mapproviders.Location
	ServiceAreaCode     string `json:"serviceAreaCode,omitempty"`
	ServiceAreaName     string `json:"serviceAreaName,omitempty"`
	ServiceAreaVersion  int    `json:"serviceAreaVersion,omitempty"`
	ServiceAreaVerified bool   `json:"serviceAreaVerified"`
}

func writeClientMapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, mapproviders.ErrNotConfigured):
		store.SendError(w, http.StatusServiceUnavailable, "MAP_RUNTIME_NOT_CONFIGURED", "governed map runtime is not configured")
	case errors.Is(err, mapproviders.ErrInvalid), errors.Is(err, servicearea.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_MAP_REQUEST", "map request is invalid")
	case errors.Is(err, mapproviders.ErrUncertain):
		store.SendError(w, http.StatusUnprocessableEntity, "MAP_RESULT_UNCERTAIN", "map provider returned a result that could not be trusted")
	case errors.Is(err, mapproviders.ErrUnavailable):
		store.SendError(w, http.StatusBadGateway, "MAP_RUNTIME_UNAVAILABLE", "governed map runtime is unavailable")
	case errors.Is(err, servicearea.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "SERVICE_AREA_VERSION_CONFLICT", "service area changed; reload and retry")
	case errors.Is(err, servicearea.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different service-area request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "map or service-area operation failed")
	}
}

func (s *protectedStoreServer) handleClientMapSearch(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "client"); !ok {
		return
	}
	var input mapproviders.SearchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	client := mapproviders.NewClient(os.Getenv("DSH_PROVIDERS_BASE_URL"))
	response, err := client.Search(r.Context(), r.Header.Get("Authorization"), input)
	if err != nil {
		writeClientMapError(w, err)
		return
	}
	locations := make([]verifiedMapLocation, 0, len(response.Locations))
	for _, location := range response.Locations {
		verified, err := s.verifyMapLocation(r, location)
		if err != nil {
			writeClientMapError(w, err)
			return
		}
		locations = append(locations, verified)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"locations": locations})
}

func (s *protectedStoreServer) handleClientMapReverse(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "client"); !ok {
		return
	}
	var input mapproviders.ReverseInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	client := mapproviders.NewClient(os.Getenv("DSH_PROVIDERS_BASE_URL"))
	response, err := client.Reverse(r.Context(), r.Header.Get("Authorization"), input)
	if err != nil {
		writeClientMapError(w, err)
		return
	}
	location, err := s.verifyMapLocation(r, response.Location)
	if err != nil {
		writeClientMapError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"location": location})
}

func (s *protectedStoreServer) verifyMapLocation(r *http.Request, location mapproviders.Location) (verifiedMapLocation, error) {
	resolution, err := servicearea.Resolve(r.Context(), s.db, location.Latitude, location.Longitude)
	if err != nil {
		return verifiedMapLocation{}, err
	}
	return verifiedMapLocation{
		Location:            location,
		ServiceAreaCode:     resolution.ServiceAreaCode,
		ServiceAreaName:     resolution.DisplayName,
		ServiceAreaVersion:  resolution.Version,
		ServiceAreaVerified: resolution.Verified,
	}, nil
}

func (s *protectedStoreServer) handleOperatorListServiceAreas(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "platform.read", "operator"); !ok {
		return
	}
	items, err := servicearea.List(r.Context(), s.db)
	if err != nil {
		writeClientMapError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"serviceAreas": items})
}

func (s *protectedStoreServer) handleOperatorUpsertServiceArea(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage", "operator")
	if !ok {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
		return
	}
	var input servicearea.UpsertInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.ActorID = actor.ID
	input.ActorSurface = "control-panel"
	input.IdempotencyKey = idempotencyKey
	input.CorrelationID = strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	item, err := servicearea.Upsert(r.Context(), s.db, r.PathValue("serviceAreaCode"), input)
	if err != nil {
		writeClientMapError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"serviceArea": item})
}
