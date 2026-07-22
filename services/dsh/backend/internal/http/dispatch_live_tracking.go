package http

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"net/http"
	"os"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/mapproviders"
	"dsh-api/internal/store"
)

const (
	clientTrackingCoordinatePrecision = 10000.0
	trackingFreshWindow               = 5 * time.Minute
	trackingStaleAlertWindow          = 10 * time.Minute
)

type dispatchEtaProjection struct {
	ProviderCode       string    `json:"providerCode"`
	DistanceMeters     int64     `json:"distanceMeters"`
	DurationSeconds    int64     `json:"durationSeconds"`
	EstimatedArrivalAt time.Time `json:"estimatedArrivalAt"`
	ComputedAt         time.Time `json:"computedAt"`
}

type dispatchLocationProjection struct {
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	RecordedAt     time.Time `json:"recordedAt"`
	FreshnessState string    `json:"freshnessState"`
	AgeSeconds     int64     `json:"ageSeconds"`
}

func roundTrackingCoordinate(value float64) float64 {
	return math.Round(value*clientTrackingCoordinatePrecision) / clientTrackingCoordinatePrecision
}

func trackingFreshness(recordedAt time.Time, now time.Time) (string, int64) {
	age := now.Sub(recordedAt.UTC())
	if age < 0 {
		age = 0
	}
	switch {
	case age <= trackingFreshWindow:
		return "fresh", int64(age.Seconds())
	case age <= trackingStaleAlertWindow:
		return "stale", int64(age.Seconds())
	default:
		return "lost", int64(age.Seconds())
	}
}

func clientCanSeeCaptainLocation(status dispatch.DeliveryStatus) bool {
	switch status {
	case dispatch.DeliveryPickedUp, dispatch.DeliveryArrivedCustomer:
		return true
	default:
		return false
	}
}

func loadOrderDestination(ctx context.Context, db *sql.DB, orderID string) (float64, float64, error) {
	var latitude sql.NullFloat64
	var longitude sql.NullFloat64
	err := db.QueryRowContext(ctx, `
		SELECT address.latitude, address.longitude
		FROM dsh_orders orders
		JOIN dsh_checkout_intents intent ON intent.id = orders.checkout_intent_id
		JOIN dsh_client_addresses address ON address.id = intent.delivery_address_id
		WHERE orders.id = $1::uuid AND address.deleted_at IS NULL`, orderID,
	).Scan(&latitude, &longitude)
	if errors.Is(err, sql.ErrNoRows) || !latitude.Valid || !longitude.Valid {
		return 0, 0, sql.ErrNoRows
	}
	if err != nil {
		return 0, 0, err
	}
	return latitude.Float64, longitude.Float64, nil
}

func routeEta(
	ctx context.Context,
	authorization string,
	originLatitude float64,
	originLongitude float64,
	destinationLatitude float64,
	destinationLongitude float64,
) (*dispatchEtaProjection, error) {
	client := mapproviders.NewClient(os.Getenv("DSH_PROVIDERS_BASE_URL"))
	route, err := client.Route(ctx, authorization, mapproviders.RouteInput{
		OriginLatitude:       originLatitude,
		OriginLongitude:      originLongitude,
		DestinationLatitude:  destinationLatitude,
		DestinationLongitude: destinationLongitude,
	})
	if err != nil {
		return nil, err
	}
	computedAt := time.Now().UTC()
	duration := time.Duration(math.Round(route.DurationSeconds)) * time.Second
	return &dispatchEtaProjection{
		ProviderCode:       route.ProviderCode,
		DistanceMeters:     int64(math.Round(route.DistanceMeters)),
		DurationSeconds:    int64(math.Round(route.DurationSeconds)),
		EstimatedArrivalAt: computedAt.Add(duration),
		ComputedAt:         computedAt,
	}, nil
}

func buildLiveTrackingProjection(
	r *http.Request,
	db *sql.DB,
	assignment *dispatch.Assignment,
	allowCoordinates bool,
) map[string]any {
	now := time.Now().UTC()
	assignmentProjection := marshalDispatchAssignment(assignment)
	tracking := map[string]any{
		"locationVisibility": "hidden_until_pickup",
		"location":           nil,
		"eta":                nil,
		"routeState":         "not_applicable",
	}

	if assignment.LastLatitude == nil || assignment.LastLongitude == nil || assignment.LocationRecordedAt == nil {
		assignmentProjection["lastLatitude"] = nil
		assignmentProjection["lastLongitude"] = nil
		assignmentProjection["locationRecordedAt"] = nil
		tracking["routeState"] = "awaiting_location"
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}

	freshness, ageSeconds := trackingFreshness(*assignment.LocationRecordedAt, now)
	if allowCoordinates {
		latitude := roundTrackingCoordinate(*assignment.LastLatitude)
		longitude := roundTrackingCoordinate(*assignment.LastLongitude)
		assignmentProjection["lastLatitude"] = latitude
		assignmentProjection["lastLongitude"] = longitude
		tracking["locationVisibility"] = "delivery_window_rounded"
		tracking["location"] = dispatchLocationProjection{
			Latitude:       latitude,
			Longitude:      longitude,
			RecordedAt:     assignment.LocationRecordedAt.UTC(),
			FreshnessState: freshness,
			AgeSeconds:     ageSeconds,
		}
	} else {
		assignmentProjection["lastLatitude"] = nil
		assignmentProjection["lastLongitude"] = nil
		assignmentProjection["locationRecordedAt"] = nil
	}

	if freshness == "lost" {
		tracking["routeState"] = "location_lost"
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}
	if assignment.Delivery.Status == dispatch.DeliveryArrivedCustomer {
		tracking["routeState"] = "arrived"
		tracking["eta"] = dispatchEtaProjection{
			ProviderCode:       "arrival-state",
			DistanceMeters:     0,
			DurationSeconds:    0,
			EstimatedArrivalAt: now,
			ComputedAt:         now,
		}
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}
	if assignment.Delivery.Status != dispatch.DeliveryPickedUp {
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}

	destinationLatitude, destinationLongitude, err := loadOrderDestination(r.Context(), db, assignment.OrderID)
	if err != nil {
		tracking["routeState"] = "destination_unavailable"
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}
	eta, err := routeEta(
		r.Context(),
		r.Header.Get("Authorization"),
		*assignment.LastLatitude,
		*assignment.LastLongitude,
		destinationLatitude,
		destinationLongitude,
	)
	if err != nil {
		tracking["routeState"] = "provider_unavailable"
		return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
	}
	tracking["routeState"] = "ready"
	tracking["eta"] = eta
	return map[string]any{"assignment": assignmentProjection, "tracking": tracking}
}

func (s *protectedStoreServer) handleGetClientLiveTracking(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	assignment, err := dispatch.GetClientTracking(s.db, r.PathValue("orderId"), actor.ID)
	if err != nil {
		s.writeDispatchResult(w, http.StatusOK, assignment, err)
		return
	}
	store.SendJSON(w, http.StatusOK, buildLiveTrackingProjection(
		r,
		s.db,
		assignment,
		clientCanSeeCaptainLocation(assignment.Delivery.Status),
	))
}

func (s *protectedStoreServer) handleGetPartnerDispatchTrackingReference(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	assignment, err := dispatch.GetPartnerTracking(s.db, r.PathValue("orderId"), actor.ID)
	if err != nil {
		s.writeDispatchResult(w, http.StatusOK, assignment, err)
		return
	}
	projection := buildLiveTrackingProjection(r, s.db, assignment, false)
	assignmentProjection := projection["assignment"].(map[string]any)
	partnerReference := map[string]any{
		"id":                 assignmentProjection["id"],
		"orderId":            assignmentProjection["orderId"],
		"status":             assignmentProjection["status"],
		"responseDeadlineAt": assignmentProjection["responseDeadlineAt"],
		"acceptedAt":         assignmentProjection["acceptedAt"],
		"completedAt":        assignmentProjection["completedAt"],
		"delivery":           assignmentProjection["delivery"],
		"updatedAt":          assignmentProjection["updatedAt"],
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"assignment": partnerReference,
		"tracking":   projection["tracking"],
	})
}

func (s *protectedStoreServer) handleListDispatchTrackingAlerts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
		return
	}
	assignments, err := dispatch.ListOperatorAssignments(s.db, 200)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list dispatch tracking alerts")
		return
	}
	now := time.Now().UTC()
	alerts := make([]map[string]any, 0)
	for index := range assignments {
		assignment := assignments[index]
		if assignment.Status != dispatch.AssignmentAccepted || assignment.Delivery.Status == dispatch.DeliveryDelivered || assignment.Delivery.Status == dispatch.DeliveryCancelled {
			continue
		}
		if assignment.LocationRecordedAt == nil {
			alerts = append(alerts, map[string]any{
				"assignmentId": assignment.ID,
				"orderId":      assignment.OrderID,
				"captainId":    assignment.CaptainID,
				"severity":     "warning",
				"code":         "LOCATION_NOT_RECEIVED",
				"message":      "No trusted captain location has been received for the active assignment.",
			})
			continue
		}
		freshness, ageSeconds := trackingFreshness(*assignment.LocationRecordedAt, now)
		if freshness == "fresh" {
			continue
		}
		severity := "warning"
		if freshness == "lost" {
			severity = "critical"
		}
		alerts = append(alerts, map[string]any{
			"assignmentId": assignment.ID,
			"orderId":      assignment.OrderID,
			"captainId":    assignment.CaptainID,
			"severity":     severity,
			"code":         "LOCATION_" + freshness,
			"ageSeconds":   ageSeconds,
			"message":      "Captain location requires operational attention.",
		})
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alerts": alerts, "total": len(alerts)})
}
