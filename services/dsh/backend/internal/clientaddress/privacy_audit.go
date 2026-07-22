package clientaddress

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type PrivacyAuditEvent struct {
	EventID           string         `json:"eventId"`
	AddressID         string         `json:"addressId"`
	ClientSubjectHash string         `json:"clientSubjectHash"`
	Action            string         `json:"action"`
	ActorID           string         `json:"actorId"`
	CorrelationID     *string        `json:"correlationId"`
	PolicyVersion     int            `json:"policyVersion"`
	Metadata          map[string]any `json:"metadata"`
	CreatedAt         time.Time      `json:"createdAt"`
}

func ListPrivacyAuditEvents(ctx context.Context, db *sql.DB, limit int) ([]PrivacyAuditEvent, error) {
	if limit < 1 || limit > 200 {
		return nil, ErrPrivacyInvalid
	}
	rows, err := db.QueryContext(ctx, `
		SELECT event_id, address_id, client_subject_hash, action, actor_id,
		       correlation_id, policy_version, metadata, created_at
		FROM dsh_client_address_privacy_audit_projection
		ORDER BY created_at DESC, event_id DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]PrivacyAuditEvent, 0)
	for rows.Next() {
		var event PrivacyAuditEvent
		var metadata []byte
		if err := rows.Scan(
			&event.EventID,
			&event.AddressID,
			&event.ClientSubjectHash,
			&event.Action,
			&event.ActorID,
			&event.CorrelationID,
			&event.PolicyVersion,
			&metadata,
			&event.CreatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(metadata, &event.Metadata); err != nil {
			return nil, err
		}
		if event.Metadata == nil {
			event.Metadata = map[string]any{}
		}
		events = append(events, event)
	}
	return events, rows.Err()
}
