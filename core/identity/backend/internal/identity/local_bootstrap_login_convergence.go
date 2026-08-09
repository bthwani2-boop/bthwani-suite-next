package identity

import (
	"context"
	"errors"
	"strings"
)

// ReconcileLocalBootstrapLoginState removes only stale failed-login lockout rows
// for the canonical password-backed local-development actors after their
// credentials have been reconciled by BootstrapLocalActors and
// BootstrapLocalPlatformActors.
//
// This is part of the local bootstrap transaction boundary, not an authentication
// bypass: production never enables LocalBootstrap, the normal login rate limit
// remains unchanged, and failures created after the current bootstrap remain
// authoritative. The cleanup is intentionally scoped to the exact actors owned
// by the local bootstrap so Workforce-provisioned actors and arbitrary local
// identities are never affected.
func (r *Repository) ReconcileLocalBootstrapLoginState(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	if r == nil || r.db == nil {
		return errors.New("identity database is required for local bootstrap login convergence")
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return errors.New("BTHWANI_OPERATOR_CONTEXT_ID is required when IDENTITY_LOCAL_BOOTSTRAP=true")
	}

	// BootstrapLocalActors and BootstrapLocalPlatformActors update updated_at on
	// every canonical actor after writing the current password hash. Therefore a
	// failed attempt at or before that timestamp belongs to an older credential /
	// bootstrap epoch and must not keep the freshly reconciled local account
	// locked. New failures remain untouched and continue to enforce the standard
	// 5-attempt / 15-minute policy.
	_, err := r.db.ExecContext(ctx, `
DELETE FROM identity_login_attempts AS attempt
USING identity_actors AS actor
WHERE attempt.username = actor.username
  AND attempt.succeeded = false
  AND attempt.created_at <= actor.updated_at
  AND actor.operator_context_id = $1
  AND actor.id = ANY($2::text[])`,
		operatorContextID,
		`{"operator-local-001","partner-local-001","client-local-001","platform-approver-local-001","platform-applier-local-001","platform-rollout-manager-local-001"}`,
	)
	if err != nil {
		return err
	}
	return nil
}
