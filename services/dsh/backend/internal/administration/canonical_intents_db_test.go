package administration

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
)

const canonicalIntentTestOperatorContextID = "operator-main"

func openCanonicalIntentTestDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := strings.TrimSpace(os.Getenv("DSH_TEST_DATABASE_URL"))
	if databaseURL == "" {
		t.Skip("DSH_TEST_DATABASE_URL is not configured")
	}

	adminDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open administration test database: %v", err)
	}
	if err := adminDB.PingContext(context.Background()); err != nil {
		_ = adminDB.Close()
		t.Fatalf("ping administration test database: %v", err)
	}

	schema := fmt.Sprintf("administration_intent_test_%d", time.Now().UnixNano())
	quotedSchema := pq.QuoteIdentifier(schema)
	if _, err := adminDB.ExecContext(context.Background(), "CREATE SCHEMA "+quotedSchema); err != nil {
		_ = adminDB.Close()
		t.Fatalf("create isolated administration test schema: %v", err)
	}

	parsed, err := url.Parse(databaseURL)
	if err != nil || parsed.Scheme == "" {
		_, _ = adminDB.ExecContext(context.Background(), "DROP SCHEMA "+quotedSchema+" CASCADE")
		_ = adminDB.Close()
		t.Fatalf("DSH_TEST_DATABASE_URL must be a PostgreSQL URL")
	}
	query := parsed.Query()
	query.Set("search_path", schema)
	parsed.RawQuery = query.Encode()
	scopedDB, err := sql.Open("postgres", parsed.String())
	if err != nil {
		_, _ = adminDB.ExecContext(context.Background(), "DROP SCHEMA "+quotedSchema+" CASCADE")
		_ = adminDB.Close()
		t.Fatalf("open isolated administration test database: %v", err)
	}

	const schemaSQL = `
		CREATE TABLE dsh_admin_approval_requests (
			id UUID PRIMARY KEY,
			operator_context_id TEXT NOT NULL,
			action_type TEXT NOT NULL,
			target_actor_id TEXT NOT NULL,
			role_name TEXT NOT NULL,
			expected_role_version INTEGER,
			requested_by TEXT NOT NULL,
			reason TEXT NOT NULL DEFAULT 'test reason',
			status TEXT NOT NULL DEFAULT 'pending',
			reviewed_by TEXT,
			review_note TEXT,
			version INTEGER NOT NULL DEFAULT 1,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			reviewed_at TIMESTAMPTZ
		);
		CREATE TABLE dsh_admin_canonical_mutation_intents (
			id UUID PRIMARY KEY,
			operator_context_id TEXT NOT NULL,
			operation_type TEXT NOT NULL,
			request_id UUID NOT NULL,
			payload JSONB NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			last_error TEXT,
			next_attempt_at TIMESTAMPTZ,
			lease_owner TEXT,
			lease_expires_at TIMESTAMPTZ,
			lease_generation BIGINT NOT NULL DEFAULT 0,
			terminal_failure BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (operator_context_id, operation_type, request_id)
		);
		CREATE TABLE dsh_admin_audit (
			id BIGSERIAL PRIMARY KEY,
			operator_context_id TEXT,
			actor_id TEXT NOT NULL,
			action TEXT NOT NULL,
			target_id TEXT,
			detail TEXT,
			sensitivity TEXT NOT NULL,
			correlation_id TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`
	if _, err := scopedDB.ExecContext(context.Background(), schemaSQL); err != nil {
		_ = scopedDB.Close()
		_, _ = adminDB.ExecContext(context.Background(), "DROP SCHEMA "+quotedSchema+" CASCADE")
		_ = adminDB.Close()
		t.Fatalf("create isolated administration tables: %v", err)
	}

	t.Cleanup(func() {
		_ = scopedDB.Close()
		_, _ = adminDB.ExecContext(context.Background(), "DROP SCHEMA "+quotedSchema+" CASCADE")
		_ = adminDB.Close()
	})
	return scopedDB
}

func insertRoleAssignmentIntentFixture(t *testing.T, db *sql.DB, leaseOwner string, leaseExpiresAt time.Time) (canonicalMutationIntent, roleMutationIntentPayload) {
	t.Helper()
	const requestID = "11111111-1111-4111-8111-111111111111"
	const intentID = "22222222-2222-4222-8222-222222222222"
	payload := roleMutationIntentPayload{
		OperatorContextID:   canonicalIntentTestOperatorContextID,
		ActionType:          "staff_role_assignment",
		TargetActorID:       "beneficiary",
		RoleName:            "dsh-operator",
		ExpectedRoleVersion: 7,
		ReviewerID:          "checker",
		ReviewNote:          "approved by integration proof",
	}
	payloadJSON := `{"operatorContextId":"operator-main","actionType":"staff_role_assignment","targetActorId":"beneficiary","roleName":"dsh-operator","expectedRoleVersion":7,"reviewerId":"checker","reviewNote":"approved by integration proof"}`
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_approval_requests
			(id, operator_context_id, action_type, target_actor_id, role_name, expected_role_version, requested_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, requestID, canonicalIntentTestOperatorContextID, payload.ActionType, payload.TargetActorID, payload.RoleName, payload.ExpectedRoleVersion, "maker"); err != nil {
		t.Fatalf("insert source approval: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(id, operator_context_id, operation_type, request_id, payload, next_attempt_at, lease_owner, lease_expires_at)
		VALUES ($1, $2, 'role-assignment', $3, $4::jsonb, NOW(), $5, $6)
	`, intentID, canonicalIntentTestOperatorContextID, requestID, payloadJSON, leaseOwner, leaseExpiresAt); err != nil {
		t.Fatalf("insert canonical intent: %v", err)
	}
	return canonicalMutationIntent{
		operatorContextID: canonicalIntentTestOperatorContextID,
		operationType:     "role-assignment",
		requestID:         requestID,
		payload:           []byte(payloadJSON),
		leaseOwner:        leaseOwner,
		leaseExpires:      leaseExpiresAt,
		leaseGeneration:   0,
	}, payload
}

func assertIntentAndSourceState(t *testing.T, db *sql.DB, wantSourceStatus, wantIntentStatus string, wantAudits int) {
	t.Helper()
	var sourceStatus, intentStatus string
	if err := db.QueryRowContext(context.Background(), `SELECT status FROM dsh_admin_approval_requests`).Scan(&sourceStatus); err != nil {
		t.Fatalf("read source state: %v", err)
	}
	if err := db.QueryRowContext(context.Background(), `SELECT status FROM dsh_admin_canonical_mutation_intents`).Scan(&intentStatus); err != nil {
		t.Fatalf("read intent state: %v", err)
	}
	var auditCount int
	if err := db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM dsh_admin_audit`).Scan(&auditCount); err != nil {
		t.Fatalf("read audit state: %v", err)
	}
	if sourceStatus != wantSourceStatus || intentStatus != wantIntentStatus || auditCount != wantAudits {
		t.Fatalf("state = source:%s intent:%s audits:%d, want source:%s intent:%s audits:%d", sourceStatus, intentStatus, auditCount, wantSourceStatus, wantIntentStatus, wantAudits)
	}
}

func TestFinalizeCanonicalMutationFencesExpiredLease(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	current, payload := insertRoleAssignmentIntentFixture(t, db, "stale-worker", time.Now().Add(-time.Minute))

	err := finalizeRoleAssignmentIntent(context.Background(), db, current, payload)
	if !errors.Is(err, errCanonicalMutationLeaseLost) {
		t.Fatalf("finalize with expired lease error = %v, want lease lost", err)
	}
	assertIntentAndSourceState(t, db, "pending", "pending", 0)
}

func TestFinalizeCanonicalMutationCommitsSourceAuditAndIntentTogether(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	current, payload := insertRoleAssignmentIntentFixture(t, db, "current-worker", time.Now().Add(time.Minute))

	if err := finalizeRoleAssignmentIntent(context.Background(), db, current, payload); err != nil {
		t.Fatalf("finalize with current lease: %v", err)
	}
	assertIntentAndSourceState(t, db, "approved", "applied", 1)
}

func TestFinalizeCanonicalMutationRollsBackWhenAuditFails(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	if _, err := db.ExecContext(context.Background(), `
		ALTER TABLE dsh_admin_audit
		ADD CONSTRAINT reject_approval_audit CHECK (action <> 'ROLE_ASSIGNMENT_APPROVED')
	`); err != nil {
		t.Fatalf("install audit failure fixture: %v", err)
	}
	current, payload := insertRoleAssignmentIntentFixture(t, db, "current-worker", time.Now().Add(time.Minute))

	if err := finalizeRoleAssignmentIntent(context.Background(), db, current, payload); err == nil {
		t.Fatal("finalize succeeded despite rejected audit insert")
	}
	assertIntentAndSourceState(t, db, "pending", "pending", 0)
}

func TestClaimCanonicalMutationDoesNotStealActiveLease(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	_, _ = insertRoleAssignmentIntentFixture(t, db, "active-worker", time.Now().Add(time.Minute))

	if _, err := claimCanonicalMutation(context.Background(), db, canonicalIntentTestOperatorContextID, "role-assignment", "11111111-1111-4111-8111-111111111111", "new-worker"); !errors.Is(err, ErrCanonicalMutationInProgress) {
		t.Fatalf("claim active lease error = %v, want in progress", err)
	}
	if _, err := db.ExecContext(context.Background(), `UPDATE dsh_admin_canonical_mutation_intents SET lease_expires_at = NOW() - INTERVAL '1 second'`); err != nil {
		t.Fatalf("expire lease: %v", err)
	}
	claimed, err := claimCanonicalMutation(context.Background(), db, canonicalIntentTestOperatorContextID, "role-assignment", "11111111-1111-4111-8111-111111111111", "new-worker")
	if err != nil {
		t.Fatalf("claim expired lease: %v", err)
	}
	if claimed.leaseOwner != "new-worker" || claimed.leaseGeneration != 1 || !claimed.leaseExpires.After(time.Now()) {
		t.Fatalf("claimed lease = owner:%q generation:%d expires:%s", claimed.leaseOwner, claimed.leaseGeneration, claimed.leaseExpires)
	}
}
