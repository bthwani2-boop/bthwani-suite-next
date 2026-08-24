package administration

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

type canonicalDecisionFenceCase struct {
	name          string
	table         string
	operationType string
	sourceID      string
	intentID      string
}

var canonicalDecisionFenceCases = []canonicalDecisionFenceCase{
	{
		name:          "role assignment",
		table:         "dsh_admin_approval_requests",
		operationType: "role-assignment",
		sourceID:      "31111111-1111-4111-8111-111111111111",
		intentID:      "41111111-1111-4111-8111-111111111111",
	},
	{
		name:          "role definition",
		table:         "dsh_admin_role_definition_requests",
		operationType: "role-definition-upsert",
		sourceID:      "32222222-2222-4222-8222-222222222222",
		intentID:      "42222222-2222-4222-8222-222222222222",
	},
	{
		name:          "role rollback",
		table:         "dsh_admin_rollback_requests",
		operationType: "role-rollback",
		sourceID:      "33333333-3333-4333-8333-333333333333",
		intentID:      "43333333-3333-4333-8333-333333333333",
	},
}

func prepareCanonicalDecisionFencingTables(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		CREATE TABLE dsh_admin_role_definition_requests (
			id UUID PRIMARY KEY,
			requested_by TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			reviewed_by TEXT,
			review_note TEXT,
			version INTEGER NOT NULL DEFAULT 1,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			reviewed_at TIMESTAMPTZ
		);
		CREATE TABLE dsh_admin_rollback_requests (
			id UUID PRIMARY KEY,
			requested_by TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			reviewed_by TEXT,
			review_note TEXT,
			version INTEGER NOT NULL DEFAULT 1,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			reviewed_at TIMESTAMPTZ
		);
	`)
	if err != nil {
		t.Fatalf("create decision fencing source tables: %v", err)
	}
}

func applyCanonicalDecisionFencingMigration(t *testing.T, db *sql.DB) {
	t.Helper()
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve canonical decision fencing test source path")
	}
	migrationPath := filepath.Clean(filepath.Join(
		filepath.Dir(sourceFile),
		"../../../database/migrations/dsh-1039_admin_canonical_decision_fencing.sql",
	))
	migration, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("read canonical decision fencing migration: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), string(migration)); err != nil {
		t.Fatalf("apply canonical decision fencing migration: %v", err)
	}
}

func insertCanonicalDecisionSource(t *testing.T, db *sql.DB, tc canonicalDecisionFenceCase, status string) {
	t.Helper()
	var err error
	if tc.operationType == "role-assignment" {
		_, err = db.ExecContext(context.Background(), `
			INSERT INTO dsh_admin_approval_requests
				(id, action_type, target_actor_id, role_name, requested_by, status)
			VALUES ($1, 'staff_role_assignment', 'beneficiary', 'dsh-operator', 'maker', $2)
		`, tc.sourceID, status)
	} else {
		_, err = db.ExecContext(
			context.Background(),
			fmt.Sprintf("INSERT INTO %s (id, requested_by, status) VALUES ($1, 'maker', $2)", tc.table),
			tc.sourceID,
			status,
		)
	}
	if err != nil {
		t.Fatalf("insert %s source: %v", tc.name, err)
	}
}

func insertCanonicalDecisionIntent(t *testing.T, db *sql.DB, tc canonicalDecisionFenceCase, status string) error {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(id, operation_type, request_id, payload, status, next_attempt_at)
		VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
	`, tc.intentID, tc.operationType, tc.sourceID,
		`{"reviewerId":"canonical-checker","reviewNote":"canonical approval"}`, status)
	return err
}

func canonicalDecisionSourceStatus(t *testing.T, db *sql.DB, tc canonicalDecisionFenceCase) string {
	t.Helper()
	var status string
	if err := db.QueryRowContext(
		context.Background(),
		fmt.Sprintf("SELECT status FROM %s WHERE id = $1", tc.table),
		tc.sourceID,
	).Scan(&status); err != nil {
		t.Fatalf("read %s source status: %v", tc.name, err)
	}
	return status
}

func TestCanonicalDecisionFenceRejectsDecisionAfterIntent(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareCanonicalDecisionFencingTables(t, db)
	applyCanonicalDecisionFencingMigration(t, db)

	for _, tc := range canonicalDecisionFenceCases {
		t.Run(tc.name, func(t *testing.T) {
			insertCanonicalDecisionSource(t, db, tc, "pending")
			if err := insertCanonicalDecisionIntent(t, db, tc, "pending"); err != nil {
				t.Fatalf("insert %s canonical intent: %v", tc.name, err)
			}
			if _, err := db.ExecContext(
				context.Background(),
				fmt.Sprintf("UPDATE %s SET status = 'rejected' WHERE id = $1", tc.table),
				tc.sourceID,
			); err == nil {
				t.Fatalf("%s rejection succeeded after canonical intent creation", tc.name)
			}
			if got := canonicalDecisionSourceStatus(t, db, tc); got != "pending" {
				t.Fatalf("%s source status = %q, want pending", tc.name, got)
			}
		})
	}
}

func TestCanonicalDecisionFenceRejectsIntentAfterDecision(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareCanonicalDecisionFencingTables(t, db)
	applyCanonicalDecisionFencingMigration(t, db)

	for _, tc := range canonicalDecisionFenceCases {
		t.Run(tc.name, func(t *testing.T) {
			insertCanonicalDecisionSource(t, db, tc, "rejected")
			if err := insertCanonicalDecisionIntent(t, db, tc, "pending"); err == nil {
				t.Fatalf("%s canonical intent succeeded after rejection", tc.name)
			}
			var count int
			if err := db.QueryRowContext(
				context.Background(),
				`SELECT COUNT(*) FROM dsh_admin_canonical_mutation_intents WHERE operation_type = $1 AND request_id = $2`,
				tc.operationType,
				tc.sourceID,
			).Scan(&count); err != nil {
				t.Fatalf("count %s canonical intents: %v", tc.name, err)
			}
			if count != 0 {
				t.Fatalf("%s canonical intent count = %d, want 0", tc.name, count)
			}
		})
	}
}

func TestCanonicalDecisionFenceReconcilesHistoricalRejectedIntent(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareCanonicalDecisionFencingTables(t, db)
	tc := canonicalDecisionFenceCases[0]
	insertCanonicalDecisionSource(t, db, tc, "rejected")
	if _, err := db.ExecContext(context.Background(), `
		UPDATE dsh_admin_approval_requests
		SET reviewed_by = 'late-checker', review_note = 'late rejection', reviewed_at = NOW()
		WHERE id = $1
	`, tc.sourceID); err != nil {
		t.Fatalf("prepare historically rejected source: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(id, operation_type, request_id, payload, status, attempts, last_error,
			 next_attempt_at, terminal_failure)
		VALUES ($1, $2, $3, $4::jsonb, 'failed', 1, 'source request is no longer pending',
		        NULL, TRUE)
	`, tc.intentID, tc.operationType, tc.sourceID,
		`{"reviewerId":"canonical-checker","reviewNote":"canonical approval"}`); err != nil {
		t.Fatalf("prepare historically fenced intent: %v", err)
	}

	applyCanonicalDecisionFencingMigration(t, db)

	if got := canonicalDecisionSourceStatus(t, db, tc); got != "pending" {
		t.Fatalf("reconciled source status = %q, want pending", got)
	}
	var reviewedBy sql.NullString
	var version int
	if err := db.QueryRowContext(context.Background(), `
		SELECT reviewed_by, version FROM dsh_admin_approval_requests WHERE id = $1
	`, tc.sourceID).Scan(&reviewedBy, &version); err != nil {
		t.Fatalf("read reconciled source: %v", err)
	}
	if reviewedBy.Valid || version != 2 {
		t.Fatalf("reconciled source reviewed_by=%v version=%d, want NULL/2", reviewedBy, version)
	}

	var intentStatus string
	var terminal bool
	var nextAttempt sql.NullTime
	var lastError sql.NullString
	if err := db.QueryRowContext(context.Background(), `
		SELECT status, terminal_failure, next_attempt_at, last_error
		FROM dsh_admin_canonical_mutation_intents
		WHERE operation_type = $1 AND request_id = $2
	`, tc.operationType, tc.sourceID).Scan(&intentStatus, &terminal, &nextAttempt, &lastError); err != nil {
		t.Fatalf("read reconciled intent: %v", err)
	}
	if intentStatus != "pending" || terminal || !nextAttempt.Valid || lastError.Valid {
		t.Fatalf("reconciled intent status=%q terminal=%t next_attempt=%v last_error=%v", intentStatus, terminal, nextAttempt, lastError)
	}

	var auditCount int
	if err := db.QueryRowContext(context.Background(), `
		SELECT COUNT(*)
		FROM dsh_admin_audit
		WHERE action = 'CANONICAL_DECISION_RECONCILED'
		  AND actor_id = 'canonical-checker'
		  AND correlation_id = $1
	`, tc.operationType+":"+tc.sourceID).Scan(&auditCount); err != nil {
		t.Fatalf("read reconciliation audit: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("reconciliation audit count = %d, want 1", auditCount)
	}
}

func TestCanonicalDecisionFenceRestoresAppliedIntentAsApproved(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareCanonicalDecisionFencingTables(t, db)
	tc := canonicalDecisionFenceCases[0]
	insertCanonicalDecisionSource(t, db, tc, "rejected")
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(id, operation_type, request_id, payload, status, attempts, next_attempt_at, terminal_failure)
		VALUES ($1, $2, $3, $4::jsonb, 'applied', 1, NULL, FALSE)
	`, tc.intentID, tc.operationType, tc.sourceID,
		`{"reviewerId":"canonical-checker","reviewNote":"canonical approval"}`); err != nil {
		t.Fatalf("prepare applied canonical intent: %v", err)
	}

	applyCanonicalDecisionFencingMigration(t, db)

	if got := canonicalDecisionSourceStatus(t, db, tc); got != "approved" {
		t.Fatalf("reconciled applied source status = %q, want approved", got)
	}
	var reviewer sql.NullString
	var reviewNote sql.NullString
	if err := db.QueryRowContext(context.Background(), `
		SELECT reviewed_by, review_note
		FROM dsh_admin_approval_requests
		WHERE id = $1
	`, tc.sourceID).Scan(&reviewer, &reviewNote); err != nil {
		t.Fatalf("read applied reconciled source: %v", err)
	}
	if !reviewer.Valid || reviewer.String != "canonical-checker" || !reviewNote.Valid || reviewNote.String != "canonical approval" {
		t.Fatalf("applied source reviewer=%v note=%v", reviewer, reviewNote)
	}
}
