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
	// WLT-947 gates readiness before Workforce can depend on penalty command
	// idempotency and authoritative readback.
	wltLatestMigration      = "wlt-948_financial_rail_registry_seed.sql"
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
			AND to_regclass('public.wlt_cod_reservations') IS NOT NULL
			AND to_regclass('public.wlt_settlements') IS NOT NULL
			AND to_regclass('public.wlt_refunds') IS NOT NULL
			AND to_regclass('public.wlt_payout_requests') IS NOT NULL
			AND to_regclass('public.wlt_dispatch_financial_eligibility_policies') IS NOT NULL
			AND to_regclass('public.wlt_dispatch_financial_eligibility_decisions') IS NOT NULL
			AND to_regclass('public.wlt_approved_payout_snapshots') IS NOT NULL
			AND to_regclass('public.wlt_checkout_pricing_quotes') IS NOT NULL
			AND to_regclass('public.wlt_store_onboarding_fee_policy_versions') IS NOT NULL
			AND to_regclass('public.wlt_provider_penalty_policies') IS NOT NULL
			AND to_regclass('public.wlt_provider_penalties') IS NOT NULL
			AND to_regclass('public.wlt_provider_debts') IS NOT NULL
			AND to_regclass('public.wlt_captain_collateral_policies') IS NOT NULL
			AND to_regclass('public.wlt_captain_collateral_positions') IS NOT NULL
			AND to_regclass('public.wlt_captain_collateral_events') IS NOT NULL
			AND (
				SELECT COUNT(*) FROM information_schema.columns
				 WHERE table_schema='public' AND table_name='wlt_provider_penalties'
				   AND column_name IN ('post_request_hash','reversal_idempotency_key','reversal_request_hash')
			) = 3`,
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

// financeMutationDecisionProbe is the readiness view of the finance kill
// switch. Readiness reports it honestly instead of hiding it: an absent or
// unanswerable decision dependency blocks every financial mutation, so
// reporting "ready" while it is missing would misrepresent the instance.
// Declared here rather than importing the wallet package so health stays a
// leaf dependency.
type financeMutationDecisionProbe interface {
	IsCapabilityKilled(ctx context.Context, capability string, actorID string) (bool, error)
}

func HandleReadiness(db *sql.DB, decisions financeMutationDecisionProbe) http.HandlerFunc {
	var readinessStore runtimeReadinessStore
	if db != nil {
		readinessStore = sqlRuntimeReadinessStore{db: db}
	}
	return handleReadiness(readinessStore, decisions)
}

func financeMutationDecisionStatus(ctx context.Context, decisions financeMutationDecisionProbe) string {
	if decisions == nil {
		return "missing"
	}
	killed, err := decisions.IsCapabilityKilled(ctx, "finance_mutation", "service")
	if err != nil {
		return "unavailable"
	}
	if killed {
		return "killed"
	}
	return "permitting"
}

func handleReadiness(readinessStore runtimeReadinessStore, decisions financeMutationDecisionProbe) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		dbStatus := "NOT_READY"
		if readinessStore != nil {
			ctx, cancel := context.WithTimeout(r.Context(), wltReadinessTimeout)
			ready, err := readinessStore.Ready(ctx)
			cancel()
			if err == nil && ready {
				dbStatus = "HEALTHY"
			}
		}
		dshCallbackBaseURLStatus := configuredStatus(os.Getenv("WLT_DSH_BASE_URL"))
		dshCallbackTokenStatus := configuredStatus(os.Getenv("DSH_WLT_SERVICE_TOKEN"))
		decisionStatus := financeMutationDecisionStatus(r.Context(), decisions)

		overallStatus := "HEALTHY"
		httpStatus := http.StatusOK
		// "killed" is a deliberate operational state, not an unhealthy one:
		// the instance is correctly configured and correctly refusing
		// mutations. "missing" and "unavailable" are genuine dependency
		// failures.
		if dbStatus != "HEALTHY" || dshCallbackBaseURLStatus != "configured" || dshCallbackTokenStatus != "configured" ||
			decisionStatus == "missing" || decisionStatus == "unavailable" {
			overallStatus = "NOT_READY"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "wlt",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":                   dbStatus,
				"dsh_callback_base_url":      dshCallbackBaseURLStatus,
				"dsh_callback_service_token": dshCallbackTokenStatus,
				"finance_mutation_decision":  decisionStatus,
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
