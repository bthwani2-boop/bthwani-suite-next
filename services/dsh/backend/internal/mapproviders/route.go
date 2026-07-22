package mapproviders

import (
	"context"
	"math"
	"strings"
)

type RouteInput struct {
	OriginLatitude       float64 `json:"originLatitude"`
	OriginLongitude      float64 `json:"originLongitude"`
	DestinationLatitude  float64 `json:"destinationLatitude"`
	DestinationLongitude float64 `json:"destinationLongitude"`
}

type RouteResponse struct {
	ProviderCode    string  `json:"providerCode"`
	DistanceMeters  float64 `json:"distanceMeters"`
	DurationSeconds float64 `json:"durationSeconds"`
}

func (c *Client) Route(ctx context.Context, authorization string, input RouteInput) (RouteResponse, error) {
	if !validCoordinate(input.OriginLatitude, input.OriginLongitude) ||
		!validCoordinate(input.DestinationLatitude, input.DestinationLongitude) {
		return RouteResponse{}, ErrInvalid
	}
	var response RouteResponse
	if err := c.post(ctx, authorization, "/providers/maps/route", input, &response); err != nil {
		return RouteResponse{}, err
	}
	response.ProviderCode = strings.TrimSpace(response.ProviderCode)
	if response.ProviderCode == "" || math.IsNaN(response.DistanceMeters) || math.IsInf(response.DistanceMeters, 0) || response.DistanceMeters < 0 ||
		math.IsNaN(response.DurationSeconds) || math.IsInf(response.DurationSeconds, 0) || response.DurationSeconds < 0 {
		return RouteResponse{}, ErrUncertain
	}
	return response, nil
}
