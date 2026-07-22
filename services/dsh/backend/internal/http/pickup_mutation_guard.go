package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"

	"github.com/google/uuid"
)

const maxPickupMutationBodyBytes = 64 * 1024

type pickupMutationRoute struct {
	orderID         string
	action          string
	surface         string
	sessionRequired bool
}

type pickupMutationEnvelope struct {
	ExpectedVersion *int   `json:"expectedVersion"`
	CommandID       string `json:"commandId"`
	CorrelationID   string `json:"correlationId"`
}

type pickupCapturedResponse struct {
	header      http.Header
	body        bytes.Buffer
	status      int
	wroteHeader bool
}

func newPickupCapturedResponse() *pickupCapturedResponse {
	return &pickupCapturedResponse{header: make(http.Header)}
}

func (response *pickupCapturedResponse) Header() http.Header {
	return response.header
}

func (response *pickupCapturedResponse) WriteHeader(status int) {
	if response.wroteHeader {
		return
	}
	response.status = status
	response.wroteHeader = true
}

func (response *pickupCapturedResponse) Write(payload []byte) (int, error) {
	if !response.wroteHeader {
		response.WriteHeader(http.StatusOK)
	}
	return response.body.Write(payload)
}

func matchPickupMutationRoute(r *http.Request) (pickupMutationRoute, bool) {
	if r.Method != http.MethodPost {
		return pickupMutationRoute{}, false
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) == 6 && parts[0] == "dsh" && parts[1] == "partner" && parts[2] == "orders" && parts[4] == "pickup" {
		action, ok := map[string]string{
			"mark-ready":       "mark_ready",
			"notify":           "notify_customer",
			"customer-arrived": "customer_arrived",
			"verify":           "verify_otp",
			"no-show":          "no_show",
		}[parts[5]]
		if !ok {
			return pickupMutationRoute{}, false
		}
		return pickupMutationRoute{
			orderID:         parts[3],
			action:          action,
			surface:         "partner",
			sessionRequired: action != "mark_ready" && action != "notify_customer",
		}, true
	}
	if len(parts) == 5 && parts[0] == "dsh" && parts[1] == "operator" && parts[2] == "pickups" {
		action, ok := map[string]string{
			"extend-window": "extend_window",
			"reschedule":    "reschedule",
		}[parts[4]]
		if !ok {
			return pickupMutationRoute{}, false
		}
		return pickupMutationRoute{
			orderID:         parts[3],
			action:          action,
			surface:         "operator",
			sessionRequired: true,
		}, true
	}
	return pickupMutationRoute{}, false
}

func copyPickupResponse(w http.ResponseWriter, captured *pickupCapturedResponse) {
	for key, values := range captured.header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	status := captured.status
	if status == 0 {
		status = http.StatusOK
	}
	w.WriteHeader(status)
	_, _ = w.Write(captured.body.Bytes())
}

func replayOrRecoverPickupMutationCommand(
	ctx context.Context,
	conn *sql.Conn,
	w http.ResponseWriter,
	route pickupMutationRoute,
	commandID string,
	expectedVersion int,
) (bool, error) {
	var existingOrderID string
	var existingAction string
	var existingExpectedVersion int
	var responseStatus sql.NullInt64
	var responseBody sql.NullString
	var completed bool
	err := conn.QueryRowContext(ctx, `
		SELECT order_id::text, action, expected_version, response_status,
		       response_body::text, completed_at IS NOT NULL
		FROM dsh_pickup_mutation_commands
		WHERE command_id = $1`, commandID,
	).Scan(
		&existingOrderID,
		&existingAction,
		&existingExpectedVersion,
		&responseStatus,
		&responseBody,
		&completed,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if existingOrderID != route.orderID || existingAction != route.action || existingExpectedVersion != expectedVersion {
		store.SendError(w, http.StatusConflict, "PICKUP_COMMAND_CONFLICT", "commandId is already bound to another pickup mutation")
		return true, nil
	}
	if !completed {
		_, err := conn.ExecContext(ctx, `
			DELETE FROM dsh_pickup_mutation_commands
			WHERE command_id = $1 AND completed_at IS NULL`, commandID)
		return false, err
	}
	if !responseStatus.Valid || !responseBody.Valid {
		return false, errors.New("completed pickup command has no replayable response")
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(int(responseStatus.Int64))
	_, _ = w.Write([]byte(responseBody.String))
	return true, nil
}

func authorizePickupMutation(
	protected *protectedStoreServer,
	w http.ResponseWriter,
	r *http.Request,
	route pickupMutationRoute,
) bool {
	if route.surface == "partner" {
		_, _, ok := protected.partnerOrder(w, r)
		return ok
	}
	_, ok := protected.requirePermission(w, r, "control-panel", PickupPermissionManage, "operator")
	return ok
}

func deletePendingPickupCommand(ctx context.Context, conn *sql.Conn, commandID string) {
	_, _ = conn.ExecContext(ctx, `
		DELETE FROM dsh_pickup_mutation_commands
		WHERE command_id = $1 AND completed_at IS NULL`, commandID)
}

// PickupMutationGuard makes commandId and expectedVersion authoritative for all
// JRN-015 mutations. A per-order advisory lock serializes partner and operator
// writes, completed command receipts are replayed, and stale surface versions
// are rejected before the domain mutation executes.
func PickupMutationGuard(
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
	next http.Handler,
) http.Handler {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route, guarded := matchPickupMutationRoute(r)
		if !guarded {
			next.ServeHTTP(w, r)
			return
		}
		if _, err := uuid.Parse(route.orderID); err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId must be a UUID")
			return
		}
		if !authorizePickupMutation(protected, w, r, route) {
			return
		}

		payload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxPickupMutationBodyBytes))
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid pickup mutation body")
			return
		}
		var envelope pickupMutationEnvelope
		if err := json.Unmarshal(payload, &envelope); err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid pickup mutation body")
			return
		}
		commandID := strings.TrimSpace(envelope.CommandID)
		if commandID == "" || len(commandID) > 160 || envelope.ExpectedVersion == nil || *envelope.ExpectedVersion < 0 {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId and non-negative expectedVersion are required")
			return
		}

		var body map[string]any
		if err := json.Unmarshal(payload, &body); err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid pickup mutation body")
			return
		}
		if strings.TrimSpace(envelope.CorrelationID) == "" {
			body["correlationId"] = commandID
			payload, err = json.Marshal(body)
			if err != nil {
				store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup command could not be prepared")
				return
			}
		}

		ctx := r.Context()
		conn, err := db.Conn(ctx)
		if err != nil {
			store.SendError(w, http.StatusServiceUnavailable, "PICKUP_UNAVAILABLE", "pickup command store is unavailable")
			return
		}
		defer conn.Close()
		if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_lock(hashtextextended($1, 0))`, "pickup:"+route.orderID); err != nil {
			store.SendError(w, http.StatusServiceUnavailable, "PICKUP_UNAVAILABLE", "pickup command lock is unavailable")
			return
		}
		defer func() {
			_, _ = conn.ExecContext(context.Background(), `SELECT pg_advisory_unlock(hashtextextended($1, 0))`, "pickup:"+route.orderID)
		}()

		replayed, err := replayOrRecoverPickupMutationCommand(ctx, conn, w, route, commandID, *envelope.ExpectedVersion)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup command receipt could not be read")
			return
		}
		if replayed {
			return
		}

		var currentVersion int
		err = conn.QueryRowContext(ctx, `SELECT version FROM dsh_pickup_sessions WHERE order_id = $1::uuid`, route.orderID).Scan(&currentVersion)
		if errors.Is(err, sql.ErrNoRows) {
			if route.sessionRequired || *envelope.ExpectedVersion != 0 {
				store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup session version changed; reload before retrying")
				return
			}
		} else if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup session version could not be read")
			return
		} else if currentVersion != *envelope.ExpectedVersion {
			store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup session version changed; reload before retrying")
			return
		}

		result, err := conn.ExecContext(ctx, `
			INSERT INTO dsh_pickup_mutation_commands
				(command_id, order_id, action, expected_version)
			VALUES ($1, $2::uuid, $3, $4)
			ON CONFLICT (command_id) DO NOTHING`,
			commandID,
			route.orderID,
			route.action,
			*envelope.ExpectedVersion,
		)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup command receipt could not be created")
			return
		}
		if affected, _ := result.RowsAffected(); affected == 0 {
			replayed, err = replayOrRecoverPickupMutationCommand(ctx, conn, w, route, commandID, *envelope.ExpectedVersion)
			if err != nil || !replayed {
				store.SendError(w, http.StatusConflict, "PICKUP_COMMAND_CONFLICT", "pickup command could not be reserved")
			}
			return
		}

		r.Body = io.NopCloser(bytes.NewReader(payload))
		captured := newPickupCapturedResponse()
		next.ServeHTTP(captured, r)
		status := captured.status
		if status == 0 {
			status = http.StatusOK
		}
		if status < 200 || status >= 300 {
			deletePendingPickupCommand(ctx, conn, commandID)
			copyPickupResponse(w, captured)
			return
		}
		responseBody := captured.body.Bytes()
		if len(responseBody) == 0 {
			responseBody = []byte("{}")
		}
		if !json.Valid(responseBody) {
			deletePendingPickupCommand(ctx, conn, commandID)
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup mutation returned an invalid response")
			return
		}
		if _, err := conn.ExecContext(ctx, `
			UPDATE dsh_pickup_mutation_commands
			SET response_status = $2,
			    response_body = $3::jsonb,
			    completed_at = NOW(),
			    updated_at = NOW()
			WHERE command_id = $1 AND completed_at IS NULL`,
			commandID,
			status,
			string(responseBody),
		); err != nil {
			deletePendingPickupCommand(ctx, conn, commandID)
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup command receipt could not be completed")
			return
		}
		copyPickupResponse(w, captured)
	})
}

func (s *protectedStoreServer) handleReschedulePickupWindow(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PickupPermissionManage, "operator")
	if !ok {
		return
	}
	var body extendPickupWindowBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.CommandID = strings.TrimSpace(body.CommandID)
	body.Reason = strings.TrimSpace(body.Reason)
	if body.CommandID == "" || body.Reason == "" || body.NewExpiry.IsZero() {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId, reason and newExpiry are required")
		return
	}
	session, err := pickup.NewService(s.db).RescheduleWindow(
		r.Context(),
		r.PathValue("orderId"),
		body.NewExpiry,
		actor.ID,
		actor.Role,
		body.Reason,
		operationalCorrelationID(r, body.CorrelationID),
	)
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

// RegisterPickupRecoveryRoutes adds the operator-owned no-show recovery route.
// Existing pickup routes remain registered by NewRouter and are protected by
// PickupMutationGuard at the composed HTTP boundary.
func RegisterPickupRecoveryRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/operator/pickups/{orderId}/reschedule", protected.handleReschedulePickupWindow)
}
