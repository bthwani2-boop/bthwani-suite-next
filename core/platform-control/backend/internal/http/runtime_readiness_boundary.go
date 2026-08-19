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
	minimumInternalServiceTokenLength   = 32
	platformControlMigrationServiceName = "platform-control"
	platformControlLatestMigration      = "platform-009_partner_commercial_truth_boundary.sql"
	defaultReadinessProbeTimeout        = 2 * time.Second
	defaultClockSkewLimit               = 5 * time.Second
)

var (
	platformControlRuntimeLogger = slog.New(slog.NewJSONHandler(os.Stderr, nil))
	readinessSuccesses           atomic.Uint64
	readinessFailures            atomic.Uint64
	lastReadinessFailed          atomic.Bool
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
		platformControlMigrationServiceName,
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

func configuredRuntimeSecret(name string, minimumLength int) bool {
	return len(strings.TrimSpace(os.Getenv(name))) >= minimumLength
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
	if !configuredRuntimeSecret("PLATFORM_CONTROL_DSH_SERVICE_TOKEN", minimumInternalServiceTokenLength) {
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

func isPlatformOperationalRequest(r *http.Request) bool {
	if r.Method == http.MethodOptions {
		return false
	}
	if r.URL.Path == "/platform/health" || r.URL.Path == "/platform/readiness" {
		return false
	}
	return strings.HasPrefix(r.URL.Path, "/platform/")
}

func runtimeReadinessBoundary(store runtimeReadinessStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/platform/health" {
			w.Header().Set("Cache-Control", "no-store")
			status := "HEALTHY"
			if lastReadinessFailed.Load() {
				status = "DEGRADED"
			}
			sendJSON(w, http.StatusOK, map[string]string{"status": status, "service": "core-platform-control"})
			return
		}

		isReadinessRequest := r.Method == http.MethodGet && r.URL.Path == "/platform/readiness"
		if !isReadinessRequest && !isPlatformOperationalRequest(r) {
			next.ServeHTTP(w, r)
			return
		}

		startedAt := time.Now()
		w.Header().Set("Cache-Control", "no-store")
		if !runtimeConfigurationReady() {
			writeReadinessFailure(w, "configuration", startedAt, nil)
			return
		}

		probeTimeout, ok := configuredReadinessDuration("PLATFORM_CONTROL_READINESS_PROBE_TIMEOUT", defaultReadinessProbeTimeout)
		if !ok {
			writeReadinessFailure(w, "probe_timeout_configuration", startedAt, nil)
			return
		}
		clockSkewLimit, ok := configuredReadinessDuration("PLATFORM_CONTROL_CLOCK_SKEW_LIMIT", defaultClockSkewLimit)
		if !ok {
			writeReadinessFailure(w, "clock_skew_configuration", startedAt, nil)
			return
		}

		if store == nil {
			writeReadinessFailure(w, "database_configuration", startedAt, nil)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), probeTimeout)
		defer cancel()

		if err := store.Ping(ctx); err != nil {
			writeReadinessFailure(w, "database_ping", startedAt, err)
			return
		}

		migrationID, success, dirty, err := store.LatestMigration(ctx)
		if err != nil || migrationID != platformControlLatestMigration || !success || dirty {
			writeReadinessFailure(w, "migration_ledger", startedAt, err)
			return
		}

		for _, relation := range []string{
			"platform_variables",
			"platform_feature_flags",
			"platform_change_sets",
			"platform_change_set_items",
			"platform_audit_events",
			"platform_rollouts",
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

		lastReadinessFailed.Store(false)
		successTotal := readinessSuccesses.Add(1)
		platformControlRuntimeLogger.Info(
			"platform-control readiness probe",
			"service", "core-platform-control",
			"result", "ready",
			"duration_ms", time.Since(startedAt).Milliseconds(),
			"success_total", successTotal,
			"failure_total", readinessFailures.Load(),
		)

		if isReadinessRequest {
			sendJSON(w, http.StatusOK, map[string]string{"status": "HEALTHY", "service": "core-platform-control"})
			return
		}
		w.Header().Set("X-Platform-Control-Runtime-Status", "HEALTHY")
		next.ServeHTTP(w, r)
	})
}

func writeReadinessFailure(w http.ResponseWriter, check string, startedAt time.Time, err error) {
	lastReadinessFailed.Store(true)
	failureTotal := readinessFailures.Add(1)
	reason := "failed"
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		reason = "timeout"
	}
	platformControlRuntimeLogger.Warn(
		"platform-control readiness probe",
		"service", "core-platform-control",
		"result", "not_ready",
		"check", check,
		"reason", reason,
		"duration_ms", time.Since(startedAt).Milliseconds(),
		"success_total", readinessSuccesses.Load(),
		"failure_total", failureTotal,
	)
	w.Header().Set("X-Platform-Control-Runtime-Status", "NOT_READY")
	sendError(w, http.StatusServiceUnavailable, "PLATFORM_CONTROL_NOT_READY", "platform-control runtime is not ready")
}
