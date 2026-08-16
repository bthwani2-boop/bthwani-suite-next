package http

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"
)

const (
	providersMigrationServiceName = "providers"
	providersLatestMigration      = "providers-002_operator_execution_context.sql"
	defaultReadinessProbeTimeout  = 2 * time.Second
	defaultClockSkewLimit         = 5 * time.Second
)

var (
	providersRuntimeLogger = slog.New(slog.NewJSONHandler(os.Stderr, nil))
	readinessSuccesses     atomic.Uint64
	readinessFailures      atomic.Uint64
)

type runtimeReadinessStore interface {
	Ping(context.Context) error
	LatestMigration(context.Context) (migrationID string, success bool, dirty bool, err error)
	RelationExists(context.Context, string) (bool, error)
	DatabaseTime(context.Context) (time.Time, error)
}

type sqlRuntimeReadinessStore struct {
	db *sql.DB
}

func (s sqlRuntimeReadinessStore) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func (s sqlRuntimeReadinessStore) LatestMigration(ctx context.Context) (string, bool, bool, error) {
	var migrationID string
	var success bool
	var dirty bool
	err := s.db.QueryRowContext(
		ctx,
		`SELECT migration_id, success, dirty
		 FROM schema_migrations
		 WHERE service_name = $1
		 ORDER BY migration_id DESC
		 LIMIT 1`,
		providersMigrationServiceName,
	).Scan(&migrationID, &success, &dirty)
	return migrationID, success, dirty, err
}

func (s sqlRuntimeReadinessStore) RelationExists(ctx context.Context, relation string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `SELECT to_regclass($1) IS NOT NULL`, "public."+relation).Scan(&exists)
	return exists, err
}

func (s sqlRuntimeReadinessStore) DatabaseTime(ctx context.Context) (time.Time, error) {
	var databaseTime time.Time
	err := s.db.QueryRowContext(ctx, `SELECT clock_timestamp()`).Scan(&databaseTime)
	return databaseTime, err
}

func configuredReadinessDuration(name string, fallback time.Duration) (time.Duration, bool) {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback, true
	}
	value, err := time.ParseDuration(raw)
	if err != nil || value <= 0 {
		return 0, false
	}
	return value, true
}

func runtimeConfigurationReady() bool {
	if strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")) == "" {
		return false
	}
	return true
}

func RuntimeReadinessBoundary(next http.Handler, databases ...*sql.DB) http.Handler {
	var store runtimeReadinessStore
	if len(databases) > 0 && databases[0] != nil {
		store = sqlRuntimeReadinessStore{db: databases[0]}
	}
	return runtimeReadinessBoundary(store, next)
}

func runtimeReadinessBoundary(store runtimeReadinessStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/providers/readiness" {
			next.ServeHTTP(w, r)
			return
		}

		startedAt := time.Now()
		w.Header().Set("Cache-Control", "no-store")
		if !runtimeConfigurationReady() {
			writeReadinessFailure(w, "configuration", startedAt, nil)
			return
		}

		probeTimeout, ok := configuredReadinessDuration("PROVIDERS_READINESS_PROBE_TIMEOUT", defaultReadinessProbeTimeout)
		if !ok {
			writeReadinessFailure(w, "probe_timeout_configuration", startedAt, nil)
			return
		}
		clockSkewLimit, ok := configuredReadinessDuration("PROVIDERS_CLOCK_SKEW_LIMIT", defaultClockSkewLimit)
		if !ok {
			writeReadinessFailure(w, "clock_skew_configuration", startedAt, nil)
			return
		}

		if store == nil {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), probeTimeout)
		defer cancel()

		if err := store.Ping(ctx); err != nil {
			writeReadinessFailure(w, "database_ping", startedAt, err)
			return
		}

		migrationID, success, dirty, err := store.LatestMigration(ctx)
		if err != nil || migrationID != providersLatestMigration || !success || dirty {
			writeReadinessFailure(w, "migration_ledger", startedAt, err)
			return
		}

		for _, relation := range []string{
			"external_providers",
			"providers_action_audit",
			"providers_idempotency",
		} {
			exists, relationErr := store.RelationExists(ctx, relation)
			if relationErr != nil || !exists {
				writeReadinessFailure(w, "required_relations", startedAt, relationErr)
				return
			}
		}

		databaseTime, err := store.DatabaseTime(ctx)
		if err != nil {
			writeReadinessFailure(w, "database_clock", startedAt, err)
			return
		}
		clockSkew := time.Since(databaseTime)
		if clockSkew < 0 {
			clockSkew = -clockSkew
		}
		if clockSkew > clockSkewLimit {
			writeReadinessFailure(w, "clock_skew", startedAt, nil)
			return
		}

		successTotal := readinessSuccesses.Add(1)
		providersRuntimeLogger.Info(
			"providers readiness probe",
			"service", "core-providers",
			"result", "ready",
			"duration_ms", time.Since(startedAt).Milliseconds(),
			"success_total", successTotal,
			"failure_total", readinessFailures.Load(),
		)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"HEALTHY","service":"core-providers"}`))
	})
}

func writeReadinessFailure(w http.ResponseWriter, check string, startedAt time.Time, err error) {
	failureTotal := readinessFailures.Add(1)
	reason := "failed"
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		reason = "timeout"
	}
	providersRuntimeLogger.Warn(
		"providers readiness probe",
		"service", "core-providers",
		"result", "not_ready",
		"check", check,
		"reason", reason,
		"duration_ms", time.Since(startedAt).Milliseconds(),
		"success_total", readinessSuccesses.Load(),
		"failure_total", failureTotal,
	)
	w.Header().Set("X-Providers-Runtime-Status", "NOT_READY")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	w.Write([]byte(`{"error":{"code":"PROVIDERS_NOT_READY","message":"providers runtime is not ready"}}`))
}
