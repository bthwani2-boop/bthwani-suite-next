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
	dshLatestMigration      = "dsh-998_operator_store_creation_idempotency_backfill.sql"
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
			AND to_regclass('public.dsh_captain_financial_eligibility') IS NOT NULL`,
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

func HandleReadiness(db *sql.DB, mediaProvider *media.Provider, identityClient interface{ CheckHealth(context.Context) string }) http.HandlerFunc {
	var readinessStore runtimeReadinessStore
	if db != nil {
		readinessStore = sqlRuntimeReadinessStore{db: db}
	}
	storageStatus := func(context.Context) string { return "unavailable" }
	if mediaProvider != nil {
		storageStatus = mediaProvider.Status
	}
	identityCheck := func(context.Context) string { return "NOT_READY" }
	if identityClient != nil {
		identityCheck = identityClient.CheckHealth
	}
	return handleReadiness(readinessStore, storageStatus, identityCheck)
}

func handleReadiness(readinessStore runtimeReadinessStore, storageStatus func(context.Context) string, identityCheck func(context.Context) string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")

		ctx, cancel := context.WithTimeout(r.Context(), dshReadinessTimeout)
		defer cancel()

		dbStatus := "NOT_READY"
		if readinessStore != nil {
			ready, err := readinessStore.Ready(ctx)
			if err == nil && ready {
				dbStatus = "HEALTHY"
			}
		}
		wltBaseURLStatus := configuredStatus(os.Getenv("DSH_WLT_BASE_URL"))
		wltTokenStatus := configuredStatus(os.Getenv("WLT_DSH_SERVICE_TOKEN"))
		storageDependencyStatus := storageStatus(ctx)
		if storageDependencyStatus == "ready" || storageDependencyStatus == "ok" || storageDependencyStatus == "HEALTHY" {
			storageDependencyStatus = "HEALTHY"
		} else {
			storageDependencyStatus = "NOT_READY"
		}

		wltStatus := "NOT_READY"
		if wltBaseURLStatus == "configured" && wltTokenStatus == "configured" {
			wltStatus = "HEALTHY"
		}

		identityStatus := identityCheck(ctx)

		overallStatus := "HEALTHY"
		httpStatus := http.StatusOK
		if dbStatus != "HEALTHY" || wltStatus != "HEALTHY" || identityStatus == "NOT_READY" || storageDependencyStatus != "HEALTHY" {
			overallStatus = "NOT_READY"
			httpStatus = http.StatusServiceUnavailable
		} else if identityStatus == "DEGRADED" {
			overallStatus = "DEGRADED"
			// DEGRADED returns 200 OK because the service is fundamentally alive, just degraded
			httpStatus = http.StatusOK
		}

		resp := ReadinessResponse{
			Service: "dsh",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":          dbStatus,
				"wlt_base_url":      wltBaseURLStatus,
				"wlt_service_token": wltTokenStatus,
				"wlt_service":       wltStatus,
				"storage":           storageDependencyStatus,
				"identity":          identityStatus,
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
