package specialrequests

import (
	"database/sql"

	"github.com/google/uuid"
)

// WriteAuditEvent writes a row to dsh_special_requests_audit_events inside
// tx, so the audit event commits atomically with the mutation that produced
// it (or rolls back with it) -- see partnerdelivery.WriteAuditEvent /
// pickup.WriteAuditEvent for the same pattern. A prior version of this
// function wrote via a pooled *sql.DB connection after the mutation had
// already committed, making the audit event best-effort with respect to the
// state change it was supposed to record; that gap is what this fixes.
func WriteAuditEvent(tx *sql.Tx, entityID, actorID, actorRole, action, reason, correlationID string, fromState, toState []byte) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := tx.Exec(`
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
