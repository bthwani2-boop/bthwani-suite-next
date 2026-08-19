package http

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
	identityLatestMigration           = "identity-025_canonical_access_projection.sql"
	defaultReadinessProbeTimeout      = 2 * time.Second
	defaultReadinessCheckTimeout      = 750 * time.Millisecond
	defaultClockSkewLimit             = 5 * time.Second
)

const (
	reasonConfigurationInvalid = "IDENTITY_CONFIGURATION_INVALID"
	reasonSigningKeyInvalid    = "IDENTITY_SIGNING_KEY_INVALID"
	reasonDatabaseUnavailable  = "IDENTITY_DATABASE_UNAVAILABLE"
	reasonMigrationIncomplete  = "IDENTITY_MIGRATION_INCOMPLETE"
	reasonRelationsMissing     = "IDENTITY_REQUIRED_RELATIONS_MISSING"
	reasonClockUnsafe          = "IDENTITY_CLOCK_UNSAFE"
	reasonDependencyTimeout    = "IDENTITY_DEPENDENCY_TIMEOUT"
	reasonProbeConfigInvalid   = "IDENTITY_PROBE_CONFIGURATION_INVALID"
)

var (
	identityRuntimeLogger      = slog.New(slog.NewJSONHandler(os.Stderr, nil))
	readinessSuccesses         atomic.Uint64
	readinessFailures          atomic.Uint64
	lastReadinessFailed        atomic.Bool
	runtimeCorrelationSequence atomic.Uint64
	readinessSnapshot          = struct {
		sync.RWMutex
		value runtimeStatusResponse
	}{}
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

type runtimeCheckStatus struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	Critical   bool   `json:"critical"`
	ReasonCode string `json:"reasonCode,omitempty"`
	DurationMS int64  `json:"durationMs"`
}

type runtimeStatusResponse struct {
	Status        string               `json:"status"`
	Service       string               `json:"service"`
	CheckedAt     string               `json:"checkedAt"`
	LastSuccessAt string               `json:"lastSuccessAt,omitempty"`
	CorrelationID string               `json:"correlationId"`
	DurationMS    int64                `json:"durationMs"`
	Checks        []runtimeCheckStatus `json:"checks"`
	ReasonCodes   []string             `json:"reasonCodes"`
	Code          string               `json:"code,omitempty"`
	Message       string               `json:"message,omitempty"`
}

type runtimeReadinessResult struct {
	checks      []runtimeCheckStatus
	failedCheck string
	reasonCode  string
	err         error
}

type runtimeReadinessFlight struct {
	done   chan struct{}
	result runtimeReadinessResult
}

type runtimeProbeSettings struct {
	probeTimeout   time.Duration
	checkTimeout   time.Duration
	clockSkewLimit time.Duration
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
	settings runtimeProbeSettings,
) *runtimeReadinessFlight {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.inFlight != nil {
		return c.inFlight
	}

	flight := &runtimeReadinessFlight{done: make(chan struct{})}
	c.inFlight = flight
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), settings.probeTimeout)
		defer cancel()
		flight.result = evaluateRuntimeReadiness(ctx, store, settings.clockSkewLimit, settings.checkTimeout)
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

func runtimeProbeConfiguration() (runtimeProbeSettings, runtimeReadinessResult) {
	probeTimeout, ok := configuredReadinessDuration("IDENTITY_READINESS_PROBE_TIMEOUT", defaultReadinessProbeTimeout)
	if !ok {
		return runtimeProbeSettings{}, failedRuntimeCheck("probe_timeout_configuration", reasonProbeConfigInvalid, nil, 0)
	}
	checkTimeout, ok := configuredReadinessDuration("IDENTITY_READINESS_CHECK_TIMEOUT", defaultReadinessCheckTimeout)
	if !ok || checkTimeout > probeTimeout {
		return runtimeProbeSettings{}, failedRuntimeCheck("check_timeout_configuration", reasonProbeConfigInvalid, nil, 0)
	}
	clockSkewLimit, ok := configuredReadinessDuration("IDENTITY_CLOCK_SKEW_LIMIT", defaultClockSkewLimit)
	if !ok {
		return runtimeProbeSettings{}, failedRuntimeCheck("clock_skew_configuration", reasonProbeConfigInvalid, nil, 0)
	}
	return runtimeProbeSettings{
		probeTimeout:   probeTimeout,
		checkTimeout:   checkTimeout,
		clockSkewLimit: clockSkewLimit,
	}, runtimeReadinessResult{}
}

func configurationChecks() runtimeReadinessResult {
	checks := make([]runtimeCheckStatus, 0, 4)
	configuration := []struct {
		name       string
		ready      bool
		reasonCode string
	}{
		{"activation_signing_key", configuredRuntimeSecret("IDENTITY_ACTIVATION_HMAC_SECRET", minimumActivationHMACSecretLength), reasonSigningKeyInvalid},
		{"operator_context", !strings.EqualFold(strings.TrimSpace(os.Getenv("IDENTITY_LOCAL_BOOTSTRAP")), "true") || strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")) != "", reasonConfigurationInvalid},
		{"workforce_service_auth", configuredRuntimeSecret("IDENTITY_WORKFORCE_SERVICE_TOKEN", minimumInternalServiceTokenLength), reasonConfigurationInvalid},
		{"dsh_service_auth", configuredRuntimeSecret("IDENTITY_DSH_SERVICE_TOKEN", minimumInternalServiceTokenLength), reasonConfigurationInvalid},
	}
	for _, item := range configuration {
		status := runtimeCheckStatus{Name: item.name, Status: "PASS", Critical: true}
		if !item.ready {
			status.Status = "FAIL"
			status.ReasonCode = item.reasonCode
			checks = append(checks, status)
			return runtimeReadinessResult{
				checks:      checks,
				failedCheck: item.name,
				reasonCode:  item.reasonCode,
			}
		}
		checks = append(checks, status)
	}
	return runtimeReadinessResult{checks: checks}
}

func runRuntimeCheck(
	parent context.Context,
	name string,
	reasonCode string,
	timeout time.Duration,
	operation func(context.Context) error,
) runtimeCheckStatus {
	startedAt := time.Now()
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	err := operation(ctx)
	status := runtimeCheckStatus{
		Name:       name,
		Status:     "PASS",
		Critical:   true,
		DurationMS: time.Since(startedAt).Milliseconds(),
	}
	if err != nil {
		status.Status = "FAIL"
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			status.ReasonCode = reasonDependencyTimeout
		} else {
			status.ReasonCode = reasonCode
		}
	}
	return status
}

func failedRuntimeCheck(name, reasonCode string, err error, durationMS int64) runtimeReadinessResult {
	return runtimeReadinessResult{
		checks: []runtimeCheckStatus{{
			Name:       name,
			Status:     "FAIL",
			Critical:   true,
			ReasonCode: reasonCode,
			DurationMS: durationMS,
		}},
		failedCheck: name,
		reasonCode:  reasonCode,
		err:         err,
	}
}

func evaluateRuntimeReadiness(
	ctx context.Context,
	store runtimeReadinessStore,
	clockSkewLimit time.Duration,
	checkTimeout time.Duration,
) runtimeReadinessResult {
	result := configurationChecks()
	if result.failedCheck != "" {
		return result
	}
	if store == nil {
		result.checks = append(result.checks, runtimeCheckStatus{
			Name:       "database",
			Status:     "FAIL",
			Critical:   true,
			ReasonCode: reasonDatabaseUnavailable,
		})
		result.failedCheck = "database_configuration"
		result.reasonCode = reasonDatabaseUnavailable
		return result
	}

	databaseCheck := runRuntimeCheck(ctx, "database", reasonDatabaseUnavailable, checkTimeout, store.Ping)
	result.checks = append(result.checks, databaseCheck)
	if databaseCheck.Status == "FAIL" {
		result.failedCheck = "database_ping"
		result.reasonCode = databaseCheck.ReasonCode
		result.err = context.Cause(ctx)
		return result
	}

	migrationCheck := runRuntimeCheck(ctx, "migrations", reasonMigrationIncomplete, checkTimeout, func(checkContext context.Context) error {
		migrationID, success, dirty, err := store.LatestMigration(checkContext)
		if err != nil {
			return err
		}
		if migrationID != identityLatestMigration || !success || dirty {
			return errors.New("migration ledger is not at the governed head")
		}
		return nil
	})
	result.checks = append(result.checks, migrationCheck)
	if migrationCheck.Status == "FAIL" {
		result.failedCheck = "migration_ledger"
		result.reasonCode = migrationCheck.ReasonCode
		return result
	}

	relationsCheck := runRuntimeCheck(ctx, "required_relations", reasonRelationsMissing, checkTimeout, func(checkContext context.Context) error {
		for _, relation := range []string{
			"identity_actors",
			"identity_sessions",
			"identity_activation_challenges",
			"identity_login_attempts",
			"identity_roles",
			"identity_actor_roles",
			"identity_permission_vocabulary",
			"identity_role_permissions",
			"identity_actor_direct_permissions",
		} {
			exists, relationErr := store.RelationExists(checkContext, relation)
			if relationErr != nil {
				return relationErr
			}
			if !exists {
				return errors.New("required relation is unavailable")
			}
		}
		return nil
	})
	result.checks = append(result.checks, relationsCheck)
	if relationsCheck.Status == "FAIL" {
		result.failedCheck = "required_relations"
		result.reasonCode = relationsCheck.ReasonCode
		return result
	}

	clockCheck := runRuntimeCheck(ctx, "clock", reasonClockUnsafe, checkTimeout, func(checkContext context.Context) error {
		databaseTime, err := store.DatabaseTime(checkContext)
		if err != nil {
			return err
		}
		clockSkew := time.Since(databaseTime)
		if clockSkew < 0 {
			clockSkew = -clockSkew
		}
		if clockSkew > clockSkewLimit {
			return errors.New("database clock exceeds the governed skew limit")
		}
		return nil
	})
	result.checks = append(result.checks, clockCheck)
	if clockCheck.Status == "FAIL" {
		result.failedCheck = "database_clock"
		result.reasonCode = clockCheck.ReasonCode
		return result
	}
	return result
}

func runtimeCorrelationID(r *http.Request) string {
	if correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID")); correlationID != "" {
		if len(correlationID) > 128 {
			return correlationID[:128]
		}
		return correlationID
	}
	return fmt.Sprintf("identity-runtime-%d", runtimeCorrelationSequence.Add(1))
}

func recordRuntimeSnapshot(snapshot runtimeStatusResponse) {
	readinessSnapshot.Lock()
	readinessSnapshot.value = snapshot
	readinessSnapshot.Unlock()
}

func currentHealthSnapshot(correlationID string) (runtimeStatusResponse, int) {
	readinessSnapshot.RLock()
	last := readinessSnapshot.value
	readinessSnapshot.RUnlock()

	status := last.Status
	statusCode := http.StatusOK
	if status == "NOT_READY" {
		statusCode = http.StatusServiceUnavailable
	}

	return runtimeStatusResponse{
		Status:        status,
		Service:       "core-identity",
		CheckedAt:     time.Now().UTC().Format(time.RFC3339Nano),
		LastSuccessAt: last.LastSuccessAt,
		CorrelationID: correlationID,
		Checks:        append([]runtimeCheckStatus(nil), last.Checks...),
		ReasonCodes:   append([]string(nil), last.ReasonCodes...),
	}, statusCode
}

func readinessStatus(
	status string,
	result runtimeReadinessResult,
	startedAt time.Time,
	correlationID string,
) runtimeStatusResponse {
	lastSuccessAt := ""
	readinessSnapshot.RLock()
	lastSuccessAt = readinessSnapshot.value.LastSuccessAt
	readinessSnapshot.RUnlock()
	checkedAt := time.Now().UTC()
	response := runtimeStatusResponse{
		Status:        status,
		Service:       "core-identity",
		CheckedAt:     checkedAt.Format(time.RFC3339Nano),
		LastSuccessAt: lastSuccessAt,
		CorrelationID: correlationID,
		DurationMS:    time.Since(startedAt).Milliseconds(),
		Checks:        result.checks,
		ReasonCodes:   []string{},
	}
	if status == "HEALTHY" {
		response.LastSuccessAt = response.CheckedAt
		return response
	}
	if result.reasonCode != "" {
		response.ReasonCodes = []string{result.reasonCode}
	}
	response.Code = "IDENTITY_NOT_READY"
	response.Message = "identity runtime is not ready"
	return response
}

func waitForRuntimeProbe(
	r *http.Request,
	coordinator *runtimeReadinessCoordinator,
	store runtimeReadinessStore,
	settings runtimeProbeSettings,
) (runtimeReadinessResult, bool) {
	flight := coordinator.probe(store, settings)
	probeTimer := time.NewTimer(settings.probeTimeout)
	defer probeTimer.Stop()
	select {
	case <-flight.done:
		return flight.result, true
	case <-probeTimer.C:
		return failedRuntimeCheck("dependency_probe", reasonDependencyTimeout, context.DeadlineExceeded, settings.probeTimeout.Milliseconds()), true
	case <-r.Context().Done():
		return runtimeReadinessResult{}, false
	}
}

func isIdentityOperationalRequest(r *http.Request) bool {
	if r.Method == http.MethodOptions {
		return false
	}
	return strings.HasPrefix(r.URL.Path, "/auth/") || strings.HasPrefix(r.URL.Path, "/internal/")
}

// RuntimeReadinessBoundary keeps liveness independent while making readiness
// and every Identity authentication, session, actor, activation, and internal
// service request fail closed unless configuration, PostgreSQL, governed
// migrations, critical persistence relations, and database clock are all usable.
// Readiness responses are never cached and never contain raw dependency errors,
// secrets, tokens, or stack traces.
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
		correlationID := runtimeCorrelationID(r)
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Correlation-ID", correlationID)

		if r.Method == http.MethodGet && r.URL.Path == "/identity/health" {
			snapshot, statusCode := currentHealthSnapshot(correlationID)
			sendJSON(w, statusCode, snapshot)
			return
		}

		isReadinessRequest := r.Method == http.MethodGet && r.URL.Path == "/identity/readiness"
		if !isReadinessRequest && !isIdentityOperationalRequest(r) {
			next.ServeHTTP(w, r)
			return
		}

		startedAt := time.Now()
		settings, configurationFailure := runtimeProbeConfiguration()
		if configurationFailure.failedCheck != "" {
			writeReadinessFailure(w, configurationFailure, startedAt, correlationID)
			return
		}
		result, completed := waitForRuntimeProbe(r, coordinator, store, settings)
		if !completed {
			return
		}
		if result.failedCheck != "" {
			writeReadinessFailure(w, result, startedAt, correlationID)
			return
		}

		writeReadinessSuccess(result, startedAt, correlationID)
		if isReadinessRequest {
			sendJSON(w, http.StatusOK, readinessStatus("HEALTHY", result, startedAt, correlationID))
			return
		}
		w.Header().Set("X-Identity-Runtime-Status", "HEALTHY")
		next.ServeHTTP(w, r)
	})
}

func writeReadinessSuccess(result runtimeReadinessResult, startedAt time.Time, correlationID string) {
	lastReadinessFailed.Store(false)
	successTotal := readinessSuccesses.Add(1)
	snapshot := readinessStatus("HEALTHY", result, startedAt, correlationID)
	recordRuntimeSnapshot(snapshot)
	identityRuntimeLogger.Info(
		"identity readiness probe",
		"service", "core-identity",
		"result", "ready",
		"correlation_id", correlationID,
		"duration_ms", snapshot.DurationMS,
		"success_total", successTotal,
		"failure_total", readinessFailures.Load(),
	)
}

func writeReadinessFailure(
	w http.ResponseWriter,
	result runtimeReadinessResult,
	startedAt time.Time,
	correlationID string,
) {
	lastReadinessFailed.Store(true)
	failureTotal := readinessFailures.Add(1)
	reason := "failed"
	if errors.Is(result.err, context.DeadlineExceeded) || errors.Is(result.err, context.Canceled) {
		reason = "timeout"
	}
	snapshot := readinessStatus("NOT_READY", result, startedAt, correlationID)
	recordRuntimeSnapshot(snapshot)
	identityRuntimeLogger.Warn(
		"identity readiness probe",
		"service", "core-identity",
		"result", "not_ready",
		"check", result.failedCheck,
		"reason", reason,
		"reason_code", result.reasonCode,
		"correlation_id", correlationID,
		"duration_ms", snapshot.DurationMS,
		"success_total", readinessSuccesses.Load(),
		"failure_total", failureTotal,
	)
	w.Header().Set("X-Identity-Runtime-Status", "NOT_READY")
	sendJSON(w, http.StatusServiceUnavailable, snapshot)
}
