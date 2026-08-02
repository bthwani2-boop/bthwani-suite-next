package http

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	minimumActivationHMACSecretLength = 32
	minimumInternalServiceTokenLength = 32
	identityMigrationServiceName      = "identity"
	identityLatestMigration           = "identity-015_actor_lifecycle_integrity.sql"
	defaultReadinessProbeTimeout      = 2 * time.Second
	defaultClockSkewLimit             = 5 * time.Second
)

var (
	identityRuntimeLogger = slog.New(slog.NewJSONHandler(os.Stderr, nil))
	readinessSuccesses    atomic.Uint64
	readinessFailures     atomic.Uint64
	lastReadinessFailed   atomic.Bool
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

type runtimeReadinessResult struct {
	failedCheck string
	err         error
}

type runtimeReadinessFlight struct {
	done   chan struct{}
	result runtimeReadinessResult
}

// runtimeReadinessCoordinator shares one dependency probe among concurrent
// callers. If a database driver does not promptly honor context cancellation,
// HTTP responses still fail closed on their own timer without creating an
// unbounded goroutine or connection storm.
type runtimeReadinessCoordinator struct {
	mu       sync.Mutex
	inFlight *runtimeReadinessFlight
}

func (c *runtimeReadinessCoordinator) probe(
	store runtimeReadinessStore,
	timeout time.Duration,
	clockSkewLimit time.Duration,
) *runtimeReadinessFlight {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.inFlight != nil {
		return c.inFlight
	}

	flight := &runtimeReadinessFlight{done: make(chan struct{})}
	c.inFlight = flight
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		flight.result = evaluateRuntimeReadiness(ctx, store, clockSkewLimit)
		close(flight.done)

		c.mu.Lock()
		if c.inFlight == flight {
			c.inFlight = nil
		}
		c.mu.Unlock()
	}()
	return flight
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
		identityMigrationServiceName,
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
	if !configuredRuntimeSecret("IDENTITY_ACTIVATION_HMAC_SECRET", minimumActivationHMACSecretLength) {
		return false
	}
	if strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")) == "" {
		return false
	}
	for _, name := range []string{"IDENTITY_WORKFORCE_SERVICE_TOKEN", "IDENTITY_DSH_SERVICE_TOKEN"} {
		if !configuredRuntimeSecret(name, minimumInternalServiceTokenLength) {
			return false
		}
	}
	return true
}

// RuntimeReadinessBoundary keeps liveness independent while making readiness
// fail closed unless Identity configuration, PostgreSQL, governed migrations,
// critical persistence relations, and database clock are all usable. A missing
// database handle is a configuration failure, never a reason to delegate to a
// weaker readiness implementation.
func RuntimeReadinessBoundary(next http.Handler, database *sql.DB) http.Handler {
	var store runtimeReadinessStore
	if database != nil {
		store = sqlRuntimeReadinessStore{db: database}
	}
	return runtimeReadinessBoundary(store, next)
}

func runtimeReadinessBoundary(store runtimeReadinessStore, next http.Handler) http.Handler {
	coordinator := &runtimeReadinessCoordinator{}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/identity/health" {
			w.Header().Set("Cache-Control", "no-store")
			status := "HEALTHY"
			if lastReadinessFailed.Load() {
				status = "DEGRADED"
			}
			sendJSON(w, http.StatusOK, map[string]string{"status": status, "service": "core-identity"})
			return
		}
		if r.Method != http.MethodGet || r.URL.Path != "/identity/readiness" {
			next.ServeHTTP(w, r)
			return
		}

		startedAt := time.Now()
		w.Header().Set("Cache-Control", "no-store")
		if !runtimeConfigurationReady() {
			writeReadinessFailure(w, "configuration", startedAt, nil)
			return
		}

		probeTimeout, ok := configuredReadinessDuration("IDENTITY_READINESS_PROBE_TIMEOUT", defaultReadinessProbeTimeout)
		if !ok {
			writeReadinessFailure(w, "probe_timeout_configuration", startedAt, nil)
			return
		}
		clockSkewLimit, ok := configuredReadinessDuration("IDENTITY_CLOCK_SKEW_LIMIT", defaultClockSkewLimit)
		if !ok {
			writeReadinessFailure(w, "clock_skew_configuration", startedAt, nil)
			return
		}

		if store == nil {
			writeReadinessFailure(w, "database_configuration", startedAt, nil)
			return
		}

		probeTimer := time.NewTimer(probeTimeout)
		defer probeTimer.Stop()
		flight := coordinator.probe(store, probeTimeout, clockSkewLimit)
		select {
		case <-flight.done:
			result := flight.result
			if result.failedCheck != "" {
				writeReadinessFailure(w, result.failedCheck, startedAt, result.err)
				return
			}
		case <-probeTimer.C:
			writeReadinessFailure(w, "dependency_timeout", startedAt, context.DeadlineExceeded)
			return
		case <-r.Context().Done():
			return
		}

		lastReadinessFailed.Store(false)
		successTotal := readinessSuccesses.Add(1)
		identityRuntimeLogger.Info(
			"identity readiness probe",
			"service", "core-identity",
			"result", "ready",
			"duration_ms", time.Since(startedAt).Milliseconds(),
			"success_total", successTotal,
			"failure_total", readinessFailures.Load(),
		)
		sendJSON(w, http.StatusOK, map[string]string{"status": "HEALTHY", "service": "core-identity"})
	})
}

func evaluateRuntimeReadiness(
	ctx context.Context,
	store runtimeReadinessStore,
	clockSkewLimit time.Duration,
) runtimeReadinessResult {
	if err := store.Ping(ctx); err != nil {
		return runtimeReadinessResult{failedCheck: "database_ping", err: err}
	}

	migrationID, success, dirty, err := store.LatestMigration(ctx)
	if err != nil || migrationID != identityLatestMigration || !success || dirty {
		return runtimeReadinessResult{failedCheck: "migration_ledger", err: err}
	}

	for _, relation := range []string{
		"identity_actors",
		"identity_sessions",
		"identity_activation_challenges",
		"identity_login_attempts",
	} {
		exists, relationErr := store.RelationExists(ctx, relation)
		if relationErr != nil || !exists {
			return runtimeReadinessResult{failedCheck: "required_relations", err: relationErr}
		}
	}

	databaseTime, err := store.DatabaseTime(ctx)
	if err != nil {
		return runtimeReadinessResult{failedCheck: "database_clock", err: err}
	}
	clockSkew := time.Since(databaseTime)
	if clockSkew < 0 {
		clockSkew = -clockSkew
	}
	if clockSkew > clockSkewLimit {
		return runtimeReadinessResult{failedCheck: "clock_skew"}
	}
	return runtimeReadinessResult{}
}

func writeReadinessFailure(w http.ResponseWriter, check string, startedAt time.Time, err error) {
	lastReadinessFailed.Store(true)
	failureTotal := readinessFailures.Add(1)
	reason := "failed"
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		reason = "timeout"
	}
	identityRuntimeLogger.Warn(
		"identity readiness probe",
		"service", "core-identity",
		"result", "not_ready",
		"check", check,
		"reason", reason,
		"duration_ms", time.Since(startedAt).Milliseconds(),
		"success_total", readinessSuccesses.Load(),
		"failure_total", failureTotal,
	)
	w.Header().Set("X-Identity-Runtime-Status", "NOT_READY")
	sendError(w, http.StatusServiceUnavailable, "IDENTITY_NOT_READY", "identity runtime is not ready")
}
