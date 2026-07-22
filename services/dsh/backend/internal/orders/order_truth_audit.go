package orders

import (
	"database/sql"
	"encoding/json"
	"strings"
)

type OrderTruthAuditInput struct {
	TenantID        string
	ActorID         string
	ActorRole       string
	OrderID         string
	CheckoutIntentID string
	EventType       string
	ResultCode      string
	CorrelationID   string
	Metadata        map[string]any
}

// RecordOrderTruthAudit is deliberately best-effort at HTTP boundaries. It
// stores only allow-listed operational metadata and never request bodies,
// address snapshots, tokens, idempotency keys or provider payloads.
func RecordOrderTruthAudit(db *sql.DB, input OrderTruthAuditInput) error {
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.EventType = strings.TrimSpace(input.EventType)
	input.ResultCode = strings.TrimSpace(input.ResultCode)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.TenantID == "" || input.EventType == "" || input.ResultCode == "" { return ErrInvalid }
	if input.ActorRole == "" { input.ActorRole = "system" }

	safe := map[string]any{}
	for _, key := range []string{"surface", "route", "status", "replay", "version", "outboxStatus"} {
		if value, ok := input.Metadata[key]; ok { safe[key] = value }
	}
	metadata, err := json.Marshal(safe)
	if err != nil { return err }
	_, err = db.Exec(`
		INSERT INTO dsh_order_truth_audit
		(tenant_id,actor_id,actor_role,order_id,checkout_intent_id,event_type,result_code,correlation_id,metadata)
		VALUES ($1,$2,$3,NULLIF($4,'')::uuid,NULLIF($5,'')::uuid,$6,$7,$8,$9::jsonb)`,
		input.TenantID,
		input.ActorID,
		input.ActorRole,
		input.OrderID,
		input.CheckoutIntentID,
		input.EventType,
		input.ResultCode,
		input.CorrelationID,
		string(metadata),
	)
	return err
}
