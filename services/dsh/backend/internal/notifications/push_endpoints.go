package notifications

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type PushEndpoint struct {
	ID           string    `json:"id"`
	ActorID      string    `json:"actorId"`
	ActorType    string    `json:"actorType"`
	Provider     string    `json:"provider"`
	DeviceID     string    `json:"deviceId"`
	Platform     string    `json:"platform"`
	Active       bool      `json:"active"`
	LastSeenAt   time.Time `json:"lastSeenAt"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type PushEndpointInput struct {
	Provider      string
	EndpointToken string
	DeviceID      string
	Platform      string
}

func UpsertPushEndpoint(db *sql.DB, actorID, actorType string, input PushEndpointInput) (PushEndpoint, error) {
	if db == nil || strings.TrimSpace(actorID) == "" || !validPushActorType(actorType) {
		return PushEndpoint{}, ErrInvalid
	}
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	if provider == "" {
		provider = "expo"
	}
	token := strings.TrimSpace(input.EndpointToken)
	deviceID := strings.TrimSpace(input.DeviceID)
	platform := strings.ToLower(strings.TrimSpace(input.Platform))
	if provider != "expo" || token == "" || deviceID == "" || len(token) > 4096 || len(deviceID) > 256 {
		return PushEndpoint{}, ErrInvalid
	}
	if platform != "android" && platform != "ios" {
		return PushEndpoint{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return PushEndpoint{}, err
	}
	defer tx.Rollback()

	// A provider token can move between actors only after a logout/login or app
	// reinstall. Removing the stale owner prevents cross-actor delivery.
	if _, err := tx.Exec(`
		DELETE FROM dsh_notification_push_endpoints
		WHERE provider = $1
		  AND endpoint_token = $2
		  AND NOT (actor_id = $3 AND actor_type = $4 AND device_id = $5)`,
		provider, token, actorID, actorType, deviceID,
	); err != nil {
		return PushEndpoint{}, err
	}

	var endpoint PushEndpoint
	err = tx.QueryRow(`
		INSERT INTO dsh_notification_push_endpoints
			(actor_id, actor_type, provider, endpoint_token, device_id, platform, active, last_seen_at)
		VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
		ON CONFLICT (actor_id, actor_type, device_id)
		DO UPDATE SET provider = EXCLUDED.provider,
		              endpoint_token = EXCLUDED.endpoint_token,
		              platform = EXCLUDED.platform,
		              active = TRUE,
		              last_seen_at = NOW(),
		              updated_at = NOW()
		RETURNING id::text, actor_id, actor_type, provider, device_id, platform,
		          active, last_seen_at, created_at, updated_at`,
		actorID, actorType, provider, token, deviceID, platform,
	).Scan(
		&endpoint.ID,
		&endpoint.ActorID,
		&endpoint.ActorType,
		&endpoint.Provider,
		&endpoint.DeviceID,
		&endpoint.Platform,
		&endpoint.Active,
		&endpoint.LastSeenAt,
		&endpoint.CreatedAt,
		&endpoint.UpdatedAt,
	)
	if err != nil {
		return PushEndpoint{}, err
	}
	if err := tx.Commit(); err != nil {
		return PushEndpoint{}, err
	}
	return endpoint, nil
}

func DeactivatePushEndpoint(db *sql.DB, actorID, actorType, deviceID string) error {
	if db == nil || strings.TrimSpace(actorID) == "" || !validPushActorType(actorType) || strings.TrimSpace(deviceID) == "" {
		return ErrInvalid
	}
	result, err := db.Exec(`
		UPDATE dsh_notification_push_endpoints
		SET active = FALSE, updated_at = NOW()
		WHERE actor_id = $1 AND actor_type = $2 AND device_id = $3 AND active = TRUE`,
		actorID, actorType, strings.TrimSpace(deviceID),
	)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func validPushActorType(actorType string) bool {
	switch strings.TrimSpace(actorType) {
	case "client", "partner", "captain", "field", "operator":
		return true
	default:
		return false
	}
}

func IsPushEndpointNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}
