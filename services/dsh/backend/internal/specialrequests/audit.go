package specialrequests

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

// WriteAuditEvent records a special request mutation for the audit trail.
// It is best-effort with respect to the caller's primary mutation: callers
// should still return success to the client if the primary write succeeded,
// but the error is returned so handlers can log it.
func WriteAuditEvent(ctx context.Context, db *sql.DB, entityID, actorID, actorRole, action, reason, correlationID string, fromState, toState []byte) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO dsh_special_requests_audit_events
			(id, entity_id, actor_id, actor_role, action, from_state, to_state, reason, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		uuid.NewString(), entityID, actorID, actorRole, action,
		nullableAuditJSON(fromState), nullableAuditJSON(toState), reason, correlationID,
	)
	return err
}

func nullableAuditJSON(b []byte) []byte {
	if len(b) == 0 {
		return []byte("{}")
	}
	return b
}
