package health

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

const (
	wltMigrationServiceName = "wlt"
	wltLatestMigration      = "wlt-119_payout_eligibility_and_snapshots.sql"
	wltReadinessTimeout     = 2 * time.Second
)

type runtimeReadinessStore interface {
	Ready(context.Context) (bool, error)
}

type sqlRuntimeReadinessStore struct {
	db *sql.DB
}

func (s sqlRuntimeReadinessStore) Ready(ctx context.Context) (bool, error) {
	var ready bool
	err := s.db.QueryRowContext(ctx, `
		SELECT
			EXISTS (
				SELECT 1 FROM schema_migrations
				 WHERE service_name = $1 AND migration_id = $2 AND success AND NOT dirty
			)
			AND NOT EXISTS (
				SELECT 1 FROM schema_migrations
				 WHERE service_name = $1 AND (dirty OR NOT success)
			)
			AND to_regclass('public.wlt_payment_sessions') IS NOT NULL
			AND to_regclass('public.wlt_ledger_transactions') IS NOT NULL
			AND to_regclass('public.wlt_ledger_lines') IS NOT NULL
			AND to_regclass('public.wlt_cod_records') IS NOT NULL
			AND to_regclass('public.wlt_settlements') IS NOT NULL
			AND to_regclass('public.wlt_refunds') IS NOT NULL
			AND to_regclass('public.wlt_payout_requests') IS NOT NULL
			AND to_regclass('public.wlt_dispatch_financial_eligibility_policies') IS NOT NULL
			AND to_regclass('public.wlt_dispatch_financial_eligibility_decisions') IS NOT NULL
			AND to_regclass('public.wlt_approved_payout_snapshots') IS NOT NULL`,
		wltMigrationServiceName,
		wltLatestMigration,
	).Scan(&ready)
	return ready, err
}

type HealthResponse struct {
	Service   string `json:"service"`
	Status    string `json:"status"`
	CheckedAt string `json:"checkedAt"`
}

type ReadinessResponse struct {
	Service      string            `json:"service"`
	Status       string            `json:"status"`
	Dependencies map[string]string `json:"dependencies"`
	CheckedAt    string            `json:"checkedAt"`
}

func HandleHealth(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Service:   "wlt",
		Status:    "healthy",
		CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	shared.SendJSON(w, http.StatusOK, resp)
}

func HandleReadiness(db *sql.DB) http.HandlerFunc {
	var readinessStore runtimeReadinessStore
	if db != nil {
		readinessStore = sqlRuntimeReadinessStore{db: db}
	}
	return handleReadiness(readinessStore)
}

func handleReadiness(readinessStore runtimeReadinessStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		dbStatus := "not_ready"
		if readinessStore != nil {
			ctx, cancel := context.WithTimeout(r.Context(), wltReadinessTimeout)
			ready, err := readinessStore.Ready(ctx)
			cancel()
			if err == nil && ready {
				dbStatus = "ready"
			}
		}
		dshCallbackBaseURLStatus := configuredStatus(os.Getenv("WLT_DSH_BASE_URL"))
		dshCallbackTokenStatus := configuredStatus(os.Getenv("DSH_WLT_SERVICE_TOKEN"))

		overallStatus := "ready"
		httpStatus := http.StatusOK
		if dbStatus != "ready" || dshCallbackBaseURLStatus != "configured" || dshCallbackTokenStatus != "configured" {
			overallStatus = "not_ready"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "wlt",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":                   dbStatus,
				"dsh_callback_base_url":      dshCallbackBaseURLStatus,
				"dsh_callback_service_token": dshCallbackTokenStatus,
			},
			CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}

		shared.SendJSON(w, httpStatus, resp)
	}
}

func configuredStatus(value string) string {
	if strings.TrimSpace(value) == "" {
		return "missing"
	}
	return "configured"
}
