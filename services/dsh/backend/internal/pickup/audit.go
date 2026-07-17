package pickup

import (
	"database/sql"

	"github.com/google/uuid"
)

// WriteAuditEvent writes a row to dsh_pickup_audit_events inside tx, in the
// same transaction as the state change it describes (see
// partnerdelivery.WriteAuditEvent for why this differs from
// specialrequests.WriteAuditEvent's post-commit *sql.DB shape).
func WriteAuditEvent(tx *sql.Tx, entityID, actorID, actorRole, action, reason, correlationID string, fromState, toState []byte) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_pickup_audit_events
			(id, entity_id, actor_id, actor_role, action, from_state, to_state, reason, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		uuid.NewString(), entityID, actorID, actorRole, action, nullableAuditJSON(fromState), nullableAuditJSON(toState), reason, correlationID)
	return err
}

func nullableAuditJSON(raw []byte) interface{} {
	if len(raw) == 0 {
		return nil
	}
	return string(raw)
}
