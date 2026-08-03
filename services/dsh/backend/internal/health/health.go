package health

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"strings"
	"time"

	"dsh-api/internal/media"
	"dsh-api/internal/store"
)

const (
	dshMigrationServiceName = "dsh"
	dshLatestMigration      = "dsh-972_financial_eligibility_wlt_decision_boundary.sql"
	dshReadinessTimeout     = 2 * time.Second
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
			AND to_regclass('public.dsh_stores') IS NOT NULL
			AND to_regclass('public.dsh_orders') IS NOT NULL
			AND to_regclass('public.dsh_wlt_outbox_events') IS NOT NULL
			AND to_regclass('public.dsh_service_area_versions') IS NOT NULL
			AND to_regclass('public.dsh_partner_brands') IS NOT NULL
			AND to_regclass('public.dsh_captain_financial_eligibility') IS NOT NULL
			AND to_regprocedure('public.dsh_wlt_financial_decision_is_usable(text,text)') IS NOT NULL`,
		dshMigrationServiceName,
		dshLatestMigration,
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
		Service:   "dsh",
		Status:    "healthy",
		CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	store.SendJSON(w, http.StatusOK, resp)
}

func HandleReadiness(db *sql.DB, mediaProvider *media.Provider) http.HandlerFunc {
	var readinessStore runtimeReadinessStore
	if db != nil {
		readinessStore = sqlRuntimeReadinessStore{db: db}
	}
	storageStatus := func(context.Context) string { return "unavailable" }
	if mediaProvider != nil {
		storageStatus = mediaProvider.Status
	}
	return handleReadiness(readinessStore, storageStatus)
}

func handleReadiness(readinessStore runtimeReadinessStore, storageStatus func(context.Context) string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		dbStatus := "not_ready"
		if readinessStore != nil {
			ctx, cancel := context.WithTimeout(r.Context(), dshReadinessTimeout)
			ready, err := readinessStore.Ready(ctx)
			cancel()
			if err == nil && ready {
				dbStatus = "ready"
			}
		}
		wltBaseURLStatus := configuredStatus(os.Getenv("DSH_WLT_BASE_URL"))
		wltTokenStatus := configuredStatus(os.Getenv("WLT_DSH_SERVICE_TOKEN"))
		workforceBaseURLStatus := configuredStatus(os.Getenv("DSH_WORKFORCE_BASE_URL"))
		workforceTokenStatus := configuredStatus(os.Getenv("WORKFORCE_DSH_SERVICE_TOKEN"))
		storageDependencyStatus := storageStatus(r.Context())

		overallStatus := "ready"
		httpStatus := http.StatusOK
		if dbStatus != "ready" ||
			wltBaseURLStatus != "configured" ||
			wltTokenStatus != "configured" ||
			workforceBaseURLStatus != "configured" ||
			workforceTokenStatus != "configured" ||
			storageDependencyStatus == "unavailable" {
			overallStatus = "not_ready"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "dsh",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":                dbStatus,
				"wlt_base_url":            wltBaseURLStatus,
				"wlt_service_token":       wltTokenStatus,
				"workforce_base_url":      workforceBaseURLStatus,
				"workforce_service_token": workforceTokenStatus,
				"storage":                 storageDependencyStatus,
			},
			CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}

		store.SendJSON(w, httpStatus, resp)
	}
}

func configuredStatus(value string) string {
	if strings.TrimSpace(value) == "" {
		return "missing"
	}
	return "configured"
}
