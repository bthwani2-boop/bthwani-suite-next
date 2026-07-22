package http

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"dsh-api/internal/store"
)

const (
	maxDispatchLocationBodyBytes = 64 << 10
	maxLocationSampleAge         = 10 * time.Minute
	maxLocationFutureSkew        = 30 * time.Second
	minLocationSampleInterval    = 5 * time.Second
	maxLocationAccuracyMeters    = 100.0
)

type dispatchLocationTimestampDecision string

const (
	locationTimestampAccepted    dispatchLocationTimestampDecision = "accepted"
	locationTimestampStale       dispatchLocationTimestampDecision = "stale"
	locationTimestampFuture      dispatchLocationTimestampDecision = "future"
	locationTimestampOutOfOrder  dispatchLocationTimestampDecision = "out_of_order"
	locationTimestampTooFrequent dispatchLocationTimestampDecision = "too_frequent"
)

func validateDispatchLocationTimestamp(recordedAt, now time.Time, previous *time.Time) dispatchLocationTimestampDecision {
	recordedAt = recordedAt.UTC()
	now = now.UTC()
	if recordedAt.Before(now.Add(-maxLocationSampleAge)) {
		return locationTimestampStale
	}
	if recordedAt.After(now.Add(maxLocationFutureSkew)) {
		return locationTimestampFuture
	}
	if previous != nil {
		previousUTC := previous.UTC()
		if !recordedAt.After(previousUTC) {
			return locationTimestampOutOfOrder
		}
		if recordedAt.Sub(previousUTC) < minLocationSampleInterval {
			return locationTimestampTooFrequent
		}
	}
	return locationTimestampAccepted
}

func validateDispatchLocationAccuracy(accuracyMeters *float64) bool {
	return accuracyMeters != nil && *accuracyMeters > 0 && *accuracyMeters <= maxLocationAccuracyMeters
}

// handlePushDispatchLocationGoverned validates sample freshness, monotonic
// ordering, minimum frequency, and GPS accuracy before delegating to the
// canonical dispatch handler. The request body is restored so decode/auth and
// persistence remain owned by dispatch.go.
func (s *protectedStoreServer) handlePushDispatchLocationGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}

	bodyBytes, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxDispatchLocationBodyBytes))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid location request body")
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	var body struct {
		RecordedAt     string   `json:"recordedAt"`
		AccuracyMeters *float64 `json:"accuracyMeters"`
	}
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid location request body")
		return
	}
	if !validateDispatchLocationAccuracy(body.AccuracyMeters) {
		store.SendError(w, http.StatusUnprocessableEntity, "LOCATION_ACCURACY_UNACCEPTABLE", "accuracyMeters must be greater than 0 and at most 100")
		return
	}
	if body.RecordedAt == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordedAt is required")
		return
	}

	recordedAt, err := time.Parse(time.RFC3339, body.RecordedAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordedAt must be RFC3339")
		return
	}

	var previous sql.NullTime
	err = s.db.QueryRowContext(r.Context(), `
		SELECT location_recorded_at
		FROM dsh_assignments
		WHERE id = $1::uuid AND captain_id = $2`,
		r.PathValue("assignmentId"), actor.ID,
	).Scan(&previous)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "dispatch assignment not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to validate location sequence")
		return
	}

	var previousTime *time.Time
	if previous.Valid {
		value := previous.Time
		previousTime = &value
	}
	switch validateDispatchLocationTimestamp(recordedAt, time.Now(), previousTime) {
	case locationTimestampStale:
		store.SendError(w, http.StatusUnprocessableEntity, "LOCATION_SAMPLE_STALE", "location sample is older than the allowed window")
		return
	case locationTimestampFuture:
		store.SendError(w, http.StatusUnprocessableEntity, "LOCATION_SAMPLE_FUTURE", "location sample is ahead of server time")
		return
	case locationTimestampOutOfOrder:
		store.SendError(w, http.StatusConflict, "LOCATION_SAMPLE_OUT_OF_ORDER", "location sample must be newer than the stored sample")
		return
	case locationTimestampTooFrequent:
		store.SendError(w, http.StatusTooManyRequests, "LOCATION_SAMPLE_TOO_FREQUENT", "location samples must be at least 5 seconds apart")
		return
	}

	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	s.handlePushDispatchLocation(w, r)
}
