package marketing

import (
	"database/sql"
	"encoding/json"

	"github.com/google/uuid"
)

func campaignJSON(c Campaign) []byte {
	b, _ := json.Marshal(c)
	return b
}

// WriteAuditEvent records a marketing mutation for the audit trail.
// It is best-effort with respect to the caller's primary mutation: callers
// should still return success to the client if the primary write succeeded,
// but the error is returned so handlers can log it.
func WriteAuditEvent(db *sql.DB, entityType, entityID, actorID, actorRole, action, reason, correlationID string, fromState, toState []byte) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := db.Exec(`
		INSERT INTO dsh_marketing_audit_events
			(id, entity_type, entity_id, actor_id, actor_role, action, from_state, to_state, reason, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		uuid.NewString(), entityType, entityID, actorID, actorRole, action,
		nullableJSON(fromState), nullableJSON(toState), reason, correlationID,
	)
	return err
}

func nullableJSON(b []byte) []byte {
	if len(b) == 0 {
		return []byte("{}")
	}
	return b
}

// WriteVisibilityGateCheck records the outcome of a target visibility-gate
// evaluation for audit/debugging purposes.
func WriteVisibilityGateCheck(db *sql.DB, entityType, entityID, targetType, targetID, gate string, passed bool, reason string) error {
	_, err := db.Exec(`
		INSERT INTO dsh_marketing_visibility_gates
			(id, entity_type, entity_id, target_type, target_id, gate, passed, reason)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		uuid.NewString(), entityType, entityID, targetType, nullableAuditString(targetID), gate, passed, reason,
	)
	return err
}

// WriteTargetBinding records a successful (entity, target) binding for audit
// history.
func WriteTargetBinding(db *sql.DB, entityType, entityID, targetType, targetID, actorID, correlationID string) error {
	if correlationID == "" {
		correlationID = uuid.NewString()
	}
	_, err := db.Exec(`
		INSERT INTO dsh_marketing_target_bindings
			(id, entity_type, entity_id, target_type, target_id, bound_by_actor_id, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		uuid.NewString(), entityType, entityID, targetType, nullableAuditString(targetID), actorID, correlationID,
	)
	return err
}

func nullableAuditString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
