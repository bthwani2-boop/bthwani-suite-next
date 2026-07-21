package http

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"dsh-api/internal/store"
)

const (
	maxDispatchLocationBodyBytes = 64 << 10
	maxLocationSampleAge         = 10 * time.Minute
	maxLocationFutureSkew        = 30 * time.Second
)

// handlePushDispatchLocationGoverned validates sample freshness and monotonic
// ordering before delegating to the canonical dispatch handler. The request
// body is restored so decode/auth/error mapping remain owned by dispatch.go.
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
		RecordedAt string `json:"recordedAt"`
	}
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid location request body")
		return
	}
	if body.RecordedAt == "" {
		s.handlePushDispatchLocation(w, r)
		return
	}

	recordedAt, err := time.Parse(time.RFC3339, body.RecordedAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordedAt must be RFC3339")
		return
	}
	now := time.Now().UTC()
	recordedAt = recordedAt.UTC()
	if recordedAt.Before(now.Add(-maxLocationSampleAge)) {
		store.SendError(w, http.StatusUnprocessableEntity, "LOCATION_SAMPLE_STALE", "location sample is older than the allowed window")
		return
	}
	if recordedAt.After(now.Add(maxLocationFutureSkew)) {
		store.SendError(w, http.StatusUnprocessableEntity, "LOCATION_SAMPLE_FUTURE", "location sample is ahead of server time")
		return
	}

	var previous sql.NullTime
	err = s.db.QueryRowContext(r.Context(), `
		SELECT location_recorded_at
		FROM dsh_assignments
		WHERE id = $1::uuid AND captain_id = $2`,
		r.PathValue("assignmentId"), actor.ID,
	).Scan(&previous)
	if err == sql.ErrNoRows {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "dispatch assignment not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to validate location sequence")
		return
	}
	if previous.Valid && !recordedAt.After(previous.Time.UTC()) {
		store.SendError(w, http.StatusConflict, "LOCATION_SAMPLE_OUT_OF_ORDER", "location sample must be newer than the stored sample")
		return
	}

	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	s.handlePushDispatchLocation(w, r)
}
