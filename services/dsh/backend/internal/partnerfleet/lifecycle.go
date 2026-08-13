package partnerfleet

import (
	"context"
	"database/sql"
	"strings"
)

func validateLifecycleKey(value string) (string, error) {
	value = strings.TrimSpace(value)
	if len(value) < 8 || len(value) > 240 {
		return "", ErrInvalid
	}
	return value, nil
}

func resolveCorrelationID(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value != "" {
		return value
	}
	return fallback
}

func insertMembershipHistory(
	ctx context.Context,
	tx *sql.Tx,
	membershipID, action, actorID, fromStatus, toStatus, idempotencyKey, correlationID string,
) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history
			(membership_id, action_label, actor_id, from_status, to_status, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (membership_id, idempotency_key) WHERE btrim(idempotency_key) <> '' DO NOTHING`,
		membershipID, action, actorID, fromStatus, toStatus, idempotencyKey, correlationID)
	return err
}

func insertFleetNotification(
	ctx context.Context,
	tx *sql.Tx, actorID, actorType, topic, title, body string,
) error {
	if strings.TrimSpace(actorID) == "" {
		return nil
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, $2, $3, $4, $5, NULL)`,
		actorID, actorType, topic, title, body)
	return err
}
