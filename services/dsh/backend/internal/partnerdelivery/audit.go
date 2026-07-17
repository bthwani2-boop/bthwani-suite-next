package partnerdelivery

import (
	"database/sql"

	"github.com/google/uuid"
)

// WriteAuditEvent writes a row to dsh_partner_delivery_audit_events inside
// tx -- unlike specialrequests.WriteAuditEvent (which writes via *sql.DB
// after its caller's transaction has already committed), this package
// writes audit rows in the SAME transaction as the state change they
// describe, since AssignCourier/MarkPickedUp/etc already hold the task row
// locked under a caller-owned tx.
func WriteAuditEvent(tx *sql.Tx, entityID, actorID, actorRole, action, reason, correlationID string, fromState, toState []byte) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_partner_delivery_audit_events
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
