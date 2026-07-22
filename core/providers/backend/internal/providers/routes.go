package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"strconv"
	"strings"
)

type MapRouteInput struct {
	OriginLatitude      float64 `json:"originLatitude"`
	OriginLongitude     float64 `json:"originLongitude"`
	DestinationLatitude  float64 `json:"destinationLatitude"`
	DestinationLongitude float64 `json:"destinationLongitude"`
}

type MapRouteResponse struct {
	ProviderCode   string  `json:"providerCode"`
	DistanceMeters float64 `json:"distanceMeters"`
	DurationSeconds float64 `json:"durationSeconds"`
}

type routeProviderParameters struct {
	Protocol  string `json:"protocol"`
	BaseURL   string `json:"baseUrl"`
	RoutePath string `json:"routePath"`
}

type osrmRouteResponse struct {
	Code   string `json:"code"`
	Routes []struct {
		Distance float64 `json:"distance"`
		Duration float64 `json:"duration"`
	} `json:"routes"`
}

func (s *Service) RouteMaps(ctx context.Context, input MapRouteInput) (MapRouteResponse, error) {
	if !validRouteCoordinate(input.OriginLatitude, input.OriginLongitude) ||
		!validRouteCoordinate(input.DestinationLatitude, input.DestinationLongitude) {
		return MapRouteResponse{}, ErrInvalidMapRequest
	}
	providers, err := s.repo.ListProvidersByKind(ctx, "maps")
	if err != nil {
		return MapRouteResponse{}, err
	}
	if len(providers) == 0 {
		return MapRouteResponse{}, ErrMapProviderNotConfigured
	}
	sortMapProviders(providers)
	var lastErr error
	for _, provider := range providers {
		response, routeErr := routeWithMapProvider(ctx, provider, input)
		if routeErr == nil {
			return response, nil
		}
		lastErr = routeErr
	}
	if lastErr == nil {
		lastErr = ErrMapProviderUnavailable
	}
	return MapRouteResponse{}, fmt.Errorf("%w: %v", ErrMapProviderUnavailable, lastErr)
}

func routeWithMapProvider(ctx context.Context, provider ExternalProvider, input MapRouteInput) (MapRouteResponse, error) {
	var routeParams routeProviderParameters
	if len(provider.Parameters) > 0 {
		_ = json.Unmarshal(provider.Parameters, &routeParams)
	}
	protocol := strings.ToLower(strings.TrimSpace(routeParams.Protocol))
	code := strings.ToLower(strings.TrimSpace(provider.Code))
	if protocol != "osrm" && !strings.Contains(code, "osrm") {
		return MapRouteResponse{}, fmt.Errorf("unsupported route provider protocol for %s", provider.Code)
	}
	params, creds := decodeMapProvider(provider)
	basePath := strings.TrimSpace(routeParams.RoutePath)
	if basePath == "" {
		basePath = "/route/v1/driving"
	}
	coordinates := strconv.FormatFloat(input.OriginLongitude, 'f', 7, 64) + "," +
		strconv.FormatFloat(input.OriginLatitude, 'f', 7, 64) + ";" +
		strconv.FormatFloat(input.DestinationLongitude, 'f', 7, 64) + "," +
		strconv.FormatFloat(input.DestinationLatitude, 'f', 7, 64)
	endpoint, err := mapEndpoint(routeParams.BaseURL, strings.TrimRight(basePath, "/")+"/"+coordinates)
	if err != nil {
		return MapRouteResponse{}, err
	}
	query := endpoint.Query()
	query.Set("overview", "false")
	query.Set("steps", "false")
	query.Set("alternatives", "false")
	applyAPIKey(query, nil, creds)
	endpoint.RawQuery = query.Encode()

	var upstream osrmRouteResponse
	if err := executeMapJSON(ctx, provider.Code, endpoint.String(), params, creds, &upstream); err != nil {
		return MapRouteResponse{}, err
	}
	if strings.ToLower(strings.TrimSpace(upstream.Code)) != "ok" || len(upstream.Routes) == 0 {
		return MapRouteResponse{}, fmt.Errorf("route provider %s returned no route", provider.Code)
	}
	route := upstream.Routes[0]
	if math.IsNaN(route.Distance) || math.IsInf(route.Distance, 0) || route.Distance < 0 ||
		math.IsNaN(route.Duration) || math.IsInf(route.Duration, 0) || route.Duration < 0 {
		return MapRouteResponse{}, fmt.Errorf("route provider %s returned invalid metrics", provider.Code)
	}
	return MapRouteResponse{
		ProviderCode: provider.Code,
		DistanceMeters: route.Distance,
		DurationSeconds: route.Duration,
	}, nil
}

func validRouteCoordinate(latitude, longitude float64) bool {
	return !math.IsNaN(latitude) && !math.IsNaN(longitude) &&
		!math.IsInf(latitude, 0) && !math.IsInf(longitude, 0) &&
		latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

var _ url.Values
