package fixtures

import "context"

func floatingAuditInsert(ctx context.Context, db execer) error {
	_, err := db.ExecContext(ctx, `INSERT INTO workforce_action_audit (operator_context_id) VALUES ($1)`, "oc")
	return err
}
