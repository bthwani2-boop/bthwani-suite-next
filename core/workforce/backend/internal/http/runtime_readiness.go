package http

import (
	"context"
	"database/sql"
	"net/http"
	"time"
)

const (
	workforceMigrationServiceName = "workforce"
	workforceLatestMigration      = "workforce-026_availability_outbox_state_machine.sql"
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
			) = 7`,
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
