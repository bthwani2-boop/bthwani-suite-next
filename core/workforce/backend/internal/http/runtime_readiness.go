package http

import (
	"context"
	"database/sql"
	"net/http"
	"time"
)

const (
	workforceMigrationServiceName = "workforce"
	workforceLatestMigration      = "workforce-030_identity_boundary_saga.sql"
	workforceReadinessTimeout     = 2 * time.Second
)

type workforceRuntimeReadinessStore interface {
	Ready(context.Context) (bool, error)
}

type sqlWorkforceRuntimeReadinessStore struct {
	db *sql.DB
}

func (s sqlWorkforceRuntimeReadinessStore) Ready(ctx context.Context) (bool, error) {
	var ready bool
	err := s.db.QueryRowContext(ctx, `
		SELECT
			EXISTS (
				SELECT 1
				  FROM schema_migrations
				 WHERE service_name = $1
				   AND migration_id = $2
				   AND success
				   AND NOT dirty
			)
			AND NOT EXISTS (
				SELECT 1
				  FROM schema_migrations
				 WHERE service_name = $1
				   AND (dirty OR NOT success)
			)
			AND to_regclass('public.workforce_people') IS NOT NULL
			AND to_regclass('public.workforce_operational_assignments') IS NOT NULL
			AND to_regclass('public.workforce_operational_assignment_audit') IS NOT NULL
			AND to_regclass('public.workforce_provider_availability_notices') IS NOT NULL
			AND to_regclass('public.workforce_dsh_availability_outbox') IS NOT NULL
			AND to_regclass('public.workforce_provider_penalty_commands') IS NOT NULL
			AND to_regclass('public.workforce_provisioning_cases') IS NOT NULL
			AND (
				SELECT COUNT(*)
				  FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'workforce_dsh_availability_outbox'
				   AND column_name IN (
					 'lifecycle_state', 'source_version', 'idempotency_key',
					 'lease_token', 'lease_expires_at', 'terminal_disposition',
					 'reconciliation_eligible'
				   )
			) = 7
			AND (
				SELECT COUNT(*) FROM information_schema.columns
				 WHERE table_schema='public' AND table_name='workforce_provider_penalty_commands'
					   AND column_name IN ('command_idempotency_key','incident_source_version','operation','lifecycle_state','lease_token','lease_expires_at','remote_penalty_id','remote_ledger_transaction_id','reconciliation_state','terminal_disposition')
				) = 10
				AND (
					SELECT COUNT(*) FROM information_schema.columns
					 WHERE table_schema='public' AND table_name='workforce_provisioning_cases'
					   AND column_name IN ('operation','request_hash','command_idempotency_key','requested_by_actor_id','requested_by_role','correlation_id','lifecycle_state','attempt_count','lease_token','lease_owner','lease_expires_at','next_retry_at','last_attempt_at','last_error_code','last_error','remote_result','terminal_disposition','completed_at')
				) = 18`,
		workforceMigrationServiceName,
		workforceLatestMigration,
	).Scan(&ready)
	return ready, err
}

func (s *server) readiness(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if s.readinessStore == nil {
		writeWorkforceNotReady(w)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), workforceReadinessTimeout)
	defer cancel()
	ready, err := s.readinessStore.Ready(ctx)
	if err != nil || !ready {
		writeWorkforceNotReady(w)
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"status": "HEALTHY", "service": "core-workforce"})
}

func writeWorkforceNotReady(w http.ResponseWriter) {
	w.Header().Set("X-Workforce-Runtime-Status", "NOT_READY")
	sendError(w, http.StatusServiceUnavailable, "WORKFORCE_NOT_READY", "workforce runtime is not ready")
}
