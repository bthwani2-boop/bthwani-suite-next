package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"dsh-api/internal/auth"
)

const (
	terminalAssignmentRequestID = "51111111-1111-4111-8111-111111111111"
	terminalDefinitionRequestID = "52222222-2222-4222-8222-222222222222"
	rollbackSourceApprovalID    = "53333333-3333-4333-8333-333333333333"
	terminalRollbackRequestID   = "54444444-4444-4444-8444-444444444444"
	supportSessionRequestID     = "58888888-8888-4888-8888-888888888888"
)

func prepareLegacyTerminalSupersessionSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		ALTER TABLE dsh_admin_approval_requests
		  ALTER COLUMN id SET DEFAULT gen_random_uuid();
		ALTER TABLE dsh_admin_approval_requests
		  ADD CONSTRAINT dsh_admin_approval_requests_status_check
		    CHECK (status IN ('pending','approved','rejected')),
		  ADD CONSTRAINT legacy_approval_lifecycle_check
		    CHECK (
		      (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
		      OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
		    );

		CREATE TABLE dsh_admin_role_definition_requests (
		  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		  operator_context_id TEXT NOT NULL,
		  role_name TEXT NOT NULL,
		  description TEXT NOT NULL,
		  active BOOLEAN NOT NULL DEFAULT TRUE,
		  expected_role_version INTEGER NOT NULL DEFAULT 0,
		  permissions JSONB NOT NULL,
		  surfaces JSONB NOT NULL DEFAULT '["control-panel"]'::jsonb,
		  requested_by TEXT NOT NULL,
		  reason TEXT NOT NULL,
		  status TEXT NOT NULL DEFAULT 'pending'
		    CONSTRAINT dsh_admin_role_definition_requests_status_check
		    CHECK (status IN ('pending','approved','rejected')),
		  reviewed_by TEXT,
		  review_note TEXT,
		  version INTEGER NOT NULL DEFAULT 1,
		  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		  reviewed_at TIMESTAMPTZ,
		  CONSTRAINT legacy_definition_lifecycle_check CHECK (
		    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
		    OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
		  )
		);

		CREATE TABLE dsh_admin_rollback_requests (
		  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		  operator_context_id TEXT NOT NULL,
		  source_approval_id UUID NOT NULL REFERENCES dsh_admin_approval_requests(id) ON DELETE RESTRICT,
		  inverse_action_type TEXT NOT NULL,
		  target_actor_id TEXT NOT NULL,
		  role_name TEXT NOT NULL,
		  requested_by TEXT NOT NULL,
		  reason TEXT NOT NULL,
		  status TEXT NOT NULL DEFAULT 'pending'
		    CONSTRAINT dsh_admin_rollback_requests_status_check
		    CHECK (status IN ('pending','approved','rejected')),
		  reviewed_by TEXT,
		  review_note TEXT,
		  version INTEGER NOT NULL DEFAULT 1,
		  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		  reviewed_at TIMESTAMPTZ,
		  CONSTRAINT legacy_rollback_lifecycle_check CHECK (
		    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
		    OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
		  )
		);

		CREATE TABLE dsh_admin_support_session_requests (
		  id UUID PRIMARY KEY,
		  reason TEXT NOT NULL,
		  review_note TEXT
		);

		ALTER TABLE dsh_admin_canonical_mutation_intents
		  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_status_check
		  CHECK (status IN ('pending','failed','applied'));

		CREATE UNIQUE INDEX uq_dsh_admin_pending_role_change_by_actor_role
		  ON dsh_admin_approval_requests (target_actor_id, role_name)
		  WHERE status = 'pending';
		CREATE UNIQUE INDEX uq_dsh_admin_pending_role_definition
		  ON dsh_admin_role_definition_requests (lower(role_name))
		  WHERE status = 'pending';
		CREATE UNIQUE INDEX uq_dsh_admin_rollback_pending_source
		  ON dsh_admin_rollback_requests (source_approval_id)
		  WHERE status = 'pending';
	`)
	if err != nil {
		t.Fatalf("prepare legacy dsh-1040 schema: %v", err)
	}
}

func insertTerminalSupersessionFixtures(t *testing.T, db *sql.DB) {
	t.Helper()
	statements := []struct {
		query string
		args  []any
	}{
		{`
		INSERT INTO dsh_admin_approval_requests
		  (id, operator_context_id, action_type, target_actor_id, role_name, requested_by, reason)
		VALUES
		  ($1, $2, 'staff_role_assignment', 'assignment-beneficiary', 'ops_role', 'assignment-maker', 'initial assignment request')
	`, []any{terminalAssignmentRequestID, canonicalIntentTestOperatorContextID}},
		{`
		INSERT INTO dsh_admin_role_definition_requests
		  (id, operator_context_id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason)
		VALUES
		  ($1, $2, 'ops_role', 'governed operator role', TRUE, 6, '["roles.manage"]'::jsonb,
		   '["control-panel"]'::jsonb, 'definition-maker', 'initial definition request')
	`, []any{terminalDefinitionRequestID, canonicalIntentTestOperatorContextID}},
		{`
		INSERT INTO dsh_admin_approval_requests
		  (id, operator_context_id, action_type, target_actor_id, role_name, requested_by, reason, status, reviewed_by, reviewed_at)
		VALUES
		  ($1, $2, 'staff_role_assignment', 'rollback-beneficiary', 'ops_role', 'source-maker',
		   'approved source request', 'approved', 'source-checker', NOW())
	`, []any{rollbackSourceApprovalID, canonicalIntentTestOperatorContextID}},
		{`
		INSERT INTO dsh_admin_rollback_requests
		  (id, operator_context_id, source_approval_id, inverse_action_type, target_actor_id, role_name, requested_by, reason)
		VALUES
		  ($1, $2, $3, 'staff_role_revocation', 'rollback-beneficiary', 'ops_role',
		   'rollback-maker', 'initial rollback request')
	`, []any{terminalRollbackRequestID, canonicalIntentTestOperatorContextID, rollbackSourceApprovalID}},
		{`
		INSERT INTO dsh_admin_canonical_mutation_intents
		  (id, operator_context_id, operation_type, request_id, payload, status, attempts, last_error,
		   next_attempt_at, terminal_failure)
		VALUES
		  ('61111111-1111-4111-8111-111111111111', 'operator-main', 'role-assignment', $1,
		   '{"reviewerId":"assignment-checker","immutable":"assignment"}'::jsonb,
		   'failed', 1, 'terminal assignment failure', NULL, TRUE),
		  ('62222222-2222-4222-8222-222222222222', 'operator-main', 'role-definition-upsert', $2,
		   '{"reviewerId":"definition-checker","immutable":"definition"}'::jsonb,
		   'failed', 1, 'terminal definition failure', NULL, TRUE),
		  ('64444444-4444-4444-8444-444444444444', 'operator-main', 'role-rollback', $3,
		   '{"reviewerId":"rollback-checker","immutable":"rollback"}'::jsonb,
		   'failed', 1, 'terminal rollback failure', NULL, TRUE)
	`, []any{terminalAssignmentRequestID, terminalDefinitionRequestID, terminalRollbackRequestID}},
	}
	for _, statement := range statements {
		if _, err := db.ExecContext(context.Background(), statement.query, statement.args...); err != nil {
			t.Fatalf("insert dsh-1040 terminal fixture: %v", err)
		}
	}
}

func insertIntentNormalizationFixtures(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_approval_requests
		  (id, operator_context_id, action_type, target_actor_id, role_name, requested_by, reason)
		VALUES
		  ('55555555-5555-4555-8555-555555555551', 'operator-main', 'staff_role_assignment', 'pending-target', 'pending-role', 'maker-a', 'pending fixture'),
		  ('55555555-5555-4555-8555-555555555552', 'operator-main', 'staff_role_assignment', 'retry-target', 'retry-role', 'maker-b', 'retry fixture');
		INSERT INTO dsh_admin_approval_requests
		  (id, operator_context_id, action_type, target_actor_id, role_name, requested_by, reason, status, reviewed_by, reviewed_at)
		VALUES
		  ('55555555-5555-4555-8555-555555555553', 'operator-main', 'staff_role_assignment', 'applied-target', 'applied-role', 'maker-c',
		   'applied fixture', 'approved', 'checker-c', NOW());

		INSERT INTO dsh_admin_canonical_mutation_intents
		  (id, operator_context_id, operation_type, request_id, payload, status, attempts, last_error, next_attempt_at, terminal_failure)
		VALUES
		  ('65555555-5555-4555-8555-555555555551', 'operator-main', 'role-assignment', '55555555-5555-4555-8555-555555555551', '{}'::jsonb, 'pending', 0, NULL, NOW(), FALSE),
		  ('65555555-5555-4555-8555-555555555552', 'operator-main', 'role-assignment', '55555555-5555-4555-8555-555555555552', '{}'::jsonb, 'failed', 1, 'retry', NOW(), FALSE),
		  ('65555555-5555-4555-8555-555555555553', 'operator-main', 'role-assignment', '55555555-5555-4555-8555-555555555553', '{}'::jsonb, 'applied', 1, NULL, NULL, FALSE);
	`)
	if err != nil {
		t.Fatalf("insert dsh-1040 normalization fixtures: %v", err)
	}
}

func insertLegacyAdministrationAuditFixtures(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_support_session_requests (id, reason, review_note)
		VALUES ($1, 'raw support reason', 'raw support review note')
	`, supportSessionRequestID); err != nil {
		t.Fatalf("insert legacy support-session request fixture: %v", err)
	}
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_audit
		  (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES
		  ('operator-main', 'audit-actor', 'ROLE_ASSIGNMENT_REQUESTED', $1,
		   'Requested ops_role for assignment-beneficiary because secret reason', 'restricted', $1),
		  ('operator-main', 'audit-actor', 'ROLE_DEFINITION_REQUESTED', $2,
		   '{"role_name":"ops_role","reason":"secret reason"}', 'restricted', $2),
		  ('operator-main', 'audit-actor', 'ROLLBACK_REQUESTED', $3,
		   'rollback role=ops_role; actor=rollback-beneficiary', 'restricted', $3),
		  ('operator-main', 'audit-actor', 'CANONICAL_DECISION_RECONCILED', $1,
		   'Reconciled invalid rejection for assignment-beneficiary', 'restricted', 'role-assignment:' || $1),
		  ('operator-main', 'audit-actor', 'support_session_requested', 'support-target',
		   'request_id=' || $4 || '; reason=raw support reason', 'restricted', $4),
		  ('operator-main', 'audit-actor', 'support_session_approved', 'support-target',
		   'request_id=' || $4 || '; note=raw support review note', 'restricted', $4);
	`, terminalAssignmentRequestID, terminalDefinitionRequestID, terminalRollbackRequestID, supportSessionRequestID)
	if err != nil {
		t.Fatalf("insert legacy administration audit fixtures: %v", err)
	}
}

func applyTerminalSupersessionMigration(t *testing.T, db *sql.DB) error {
	t.Helper()
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve terminal supersession test source path")
	}
	migrationPath := filepath.Clean(filepath.Join(
		filepath.Dir(sourceFile),
		"../../../database/migrations/dsh-1040_admin_terminal_supersession.sql",
	))
	migration, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("read terminal supersession migration: %v", err)
	}
	connection, err := db.Conn(context.Background())
	if err != nil {
		return err
	}
	defer func() { _ = connection.Close() }()
	_, err = connection.ExecContext(context.Background(), string(migration))
	if err != nil {
		_, _ = connection.ExecContext(context.Background(), "ROLLBACK")
	}
	return err
}

func TestTerminalSupersessionMigrationNormalizesIntentAuthorityAndLocksTerminalHistory(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareLegacyTerminalSupersessionSchema(t, db)
	insertTerminalSupersessionFixtures(t, db)
	insertIntentNormalizationFixtures(t, db)
	insertLegacyAdministrationAuditFixtures(t, db)

	if err := applyTerminalSupersessionMigration(t, db); err != nil {
		t.Fatalf("apply dsh-1040: %v", err)
	}

	rows, err := db.QueryContext(context.Background(), `
		SELECT request_id::text, status
		FROM dsh_admin_canonical_mutation_intents
		ORDER BY request_id
	`)
	if err != nil {
		t.Fatalf("read normalized intent statuses: %v", err)
	}
	defer func() { _ = rows.Close() }()
	statuses := map[string]string{}
	for rows.Next() {
		var requestID, status string
		if err := rows.Scan(&requestID, &status); err != nil {
			t.Fatalf("scan normalized intent: %v", err)
		}
		statuses[requestID] = status
	}
	if statuses[terminalAssignmentRequestID] != "failed_terminal" ||
		statuses["55555555-5555-4555-8555-555555555551"] != "pending" ||
		statuses["55555555-5555-4555-8555-555555555552"] != "retryable_failure" ||
		statuses["55555555-5555-4555-8555-555555555553"] != "applied" {
		t.Fatalf("normalized intent statuses = %#v", statuses)
	}

	var terminalColumnCount int
	if err := db.QueryRowContext(context.Background(), `
		SELECT count(*)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'dsh_admin_canonical_mutation_intents'
		  AND column_name = 'terminal_failure'
	`).Scan(&terminalColumnCount); err != nil {
		t.Fatalf("inspect terminal_failure column: %v", err)
	}
	if terminalColumnCount != 0 {
		t.Fatalf("terminal_failure column count = %d, want 0", terminalColumnCount)
	}

	auditRows, err := db.QueryContext(context.Background(), `
		SELECT detail
		FROM dsh_admin_audit
		WHERE action IN (
		  'ROLE_ASSIGNMENT_REQUESTED', 'ROLE_DEFINITION_REQUESTED',
		  'ROLLBACK_REQUESTED', 'CANONICAL_DECISION_RECONCILED',
		  'support_session_requested', 'support_session_approved'
		)
	`)
	if err != nil {
		t.Fatalf("read reconciled audit details: %v", err)
	}
	defer func() { _ = auditRows.Close() }()
	allowedAuditKeys := map[string]bool{
		"request_id": true, "decision": true, "action_type": true,
		"reason_provided": true, "note_provided": true,
		"permission_count": true, "surface_count": true,
	}
	for auditRows.Next() {
		var detail string
		if err := auditRows.Scan(&detail); err != nil {
			t.Fatalf("scan reconciled audit detail: %v", err)
		}
		if strings.Contains(detail, "ops_role") || strings.Contains(detail, "beneficiary") || strings.Contains(detail, "secret reason") || strings.Contains(detail, "raw support") {
			t.Fatalf("reconciled audit retained sensitive detail: %s", detail)
		}
		var object map[string]any
		if err := json.Unmarshal([]byte(detail), &object); err != nil {
			t.Fatalf("reconciled audit is not JSON: %q: %v", detail, err)
		}
		for key := range object {
			if !allowedAuditKeys[key] {
				t.Fatalf("reconciled audit retained non-allowlisted key %q in %s", key, detail)
			}
		}
	}

	if _, err := db.ExecContext(context.Background(), `
		UPDATE dsh_admin_canonical_mutation_intents
		SET status = 'pending', next_attempt_at = NOW()
		WHERE operation_type = 'role-assignment' AND request_id = $1
	`, terminalAssignmentRequestID); err == nil {
		t.Fatal("failed terminal intent reset unexpectedly succeeded")
	}
	if _, err := db.ExecContext(context.Background(), `
		DELETE FROM dsh_admin_canonical_mutation_intents
		WHERE operation_type = 'role-assignment' AND request_id = $1
	`, terminalAssignmentRequestID); err == nil {
		t.Fatal("failed terminal intent deletion unexpectedly succeeded")
	}
}

func TestTerminalSupersessionMigrationFailsClosedOnDecisionMismatch(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareLegacyTerminalSupersessionSchema(t, db)
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_admin_approval_requests
		  (id, operator_context_id, action_type, target_actor_id, role_name, requested_by, reason)
		VALUES
		  ('57777777-7777-4777-8777-777777777777', 'operator-main', 'staff_role_assignment', 'mismatch-target', 'ops_role', 'maker', 'mismatch fixture');
		INSERT INTO dsh_admin_canonical_mutation_intents
		  (id, operator_context_id, operation_type, request_id, payload, status, attempts, next_attempt_at, terminal_failure)
		VALUES
		  ('67777777-7777-4777-8777-777777777777', 'operator-main', 'role-assignment', '57777777-7777-4777-8777-777777777777',
		   '{}'::jsonb, 'applied', 1, NULL, FALSE);
	`); err != nil {
		t.Fatalf("prepare decision mismatch fixture: %v", err)
	}

	if err := applyTerminalSupersessionMigration(t, db); err == nil {
		t.Fatal("dsh-1040 unexpectedly accepted applied intent with pending source")
	}
	var terminalColumnCount int
	if err := db.QueryRowContext(context.Background(), `
		SELECT count(*)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'dsh_admin_canonical_mutation_intents'
		  AND column_name = 'terminal_failure'
	`).Scan(&terminalColumnCount); err != nil {
		t.Fatalf("inspect rolled-back migration: %v", err)
	}
	if terminalColumnCount != 1 {
		t.Fatalf("failed migration left terminal_failure column count = %d, want 1", terminalColumnCount)
	}
}

func newTerminalSupersessionIdentity(t *testing.T, currentVersion int) (*auth.Client, func()) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		switch {
		case request.URL.Path == "/internal/rbac/permission-vocabulary":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"permissions": []map[string]string{{
					"id": "permission-id", "service": "dsh", "surface": "control-panel",
					"action": "roles.manage", "description": "Manage governed roles",
				}},
			})
		case strings.HasPrefix(request.URL.Path, "/internal/rbac/role-definitions/"):
			roleName, _ := url.PathUnescape(strings.TrimPrefix(request.URL.Path, "/internal/rbac/role-definitions/"))
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "canonical-role-id", "name": roleName, "description": "current role",
				"active": true, "version": currentVersion,
				"createdAt": time.Now().UTC(), "updatedAt": time.Now().UTC(),
				"permissions": []any{},
			})
		default:
			http.NotFound(w, request)
		}
	}))
	return auth.NewClientWithInternalAccess(server.URL, "test-service-token", ""), server.Close
}

func TestSupersedeFailedTerminalRequestsCreatesFreshRequestsForEveryFamily(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareLegacyTerminalSupersessionSchema(t, db)
	insertTerminalSupersessionFixtures(t, db)
	if err := applyTerminalSupersessionMigration(t, db); err != nil {
		t.Fatalf("apply dsh-1040: %v", err)
	}
	identityClient, closeIdentity := newTerminalSupersessionIdentity(t, 7)
	defer closeIdentity()
	operatorContext := auth.WithOperatorContext(context.Background(), canonicalIntentTestOperatorContextID)
	params := SupersedeTerminalFailureParams{
		ExpectedVersion:   1,
		ReasonCode:        "canonical_version_changed",
		ReplacementReason: "re-evaluate against current canonical truth",
	}

	assignment, err := SupersedeFailedRoleAssignmentApproval(operatorContext, db, identityClient, "replacement-maker", terminalAssignmentRequestID, params)
	if err != nil {
		t.Fatalf("supersede role assignment: %v", err)
	}
	definition, err := SupersedeFailedRoleDefinitionRequest(operatorContext, db, identityClient, "replacement-maker", terminalDefinitionRequestID, params)
	if err != nil {
		t.Fatalf("supersede role definition: %v", err)
	}
	rollback, err := SupersedeFailedRollbackRequest(operatorContext, db, identityClient, "replacement-maker", terminalRollbackRequestID, params)
	if err != nil {
		t.Fatalf("supersede rollback: %v", err)
	}

	if assignment.Status != "pending" || assignment.ExecutionStatus != "not_started" || assignment.Version != 1 ||
		definition.Status != "pending" || definition.ExecutionStatus != "not_started" || definition.Version != 1 || definition.ExpectedRoleVersion != 7 ||
		rollback.Status != "pending" || rollback.ExecutionStatus != "not_started" || rollback.Version != 1 {
		t.Fatalf("fresh replacements = assignment:%+v definition:%+v rollback:%+v", assignment, definition, rollback)
	}

	checks := []struct {
		table          string
		operationType  string
		oldRequestID   string
		replacementID  string
		expectedAction string
	}{
		{"dsh_admin_approval_requests", "role-assignment", terminalAssignmentRequestID, assignment.ID, "ROLE_ASSIGNMENT_SUPERSEDED"},
		{"dsh_admin_role_definition_requests", "role-definition-upsert", terminalDefinitionRequestID, definition.ID, "ROLE_DEFINITION_SUPERSEDED"},
		{"dsh_admin_rollback_requests", "role-rollback", terminalRollbackRequestID, rollback.ID, "ROLLBACK_SUPERSEDED"},
	}
	for _, check := range checks {
		var oldStatus, supersededBy, reasonCode string
		var oldVersion int
		if err := db.QueryRowContext(context.Background(), `SELECT status, superseded_by, superseded_reason_code, version FROM `+check.table+` WHERE id = $1`, check.oldRequestID).Scan(
			&oldStatus, &supersededBy, &reasonCode, &oldVersion,
		); err != nil {
			t.Fatalf("read superseded %s: %v", check.operationType, err)
		}
		if oldStatus != "superseded" || supersededBy != "replacement-maker" || reasonCode != params.ReasonCode || oldVersion != 2 {
			t.Fatalf("superseded %s state = %s/%s/%s/v%d", check.operationType, oldStatus, supersededBy, reasonCode, oldVersion)
		}
		var replacementStatus, supersedesID string
		var reviewer sql.NullString
		if err := db.QueryRowContext(context.Background(), `SELECT status, supersedes_request_id::text, reviewed_by FROM `+check.table+` WHERE id = $1`, check.replacementID).Scan(
			&replacementStatus, &supersedesID, &reviewer,
		); err != nil {
			t.Fatalf("read replacement %s: %v", check.operationType, err)
		}
		if replacementStatus != "pending" || supersedesID != check.oldRequestID || reviewer.Valid {
			t.Fatalf("replacement %s state = %s/%s/reviewer:%v", check.operationType, replacementStatus, supersedesID, reviewer)
		}
		var intentStatus, immutablePayload string
		if err := db.QueryRowContext(context.Background(), `
			SELECT status, payload->>'immutable'
			FROM dsh_admin_canonical_mutation_intents
			WHERE operation_type = $1 AND request_id = $2
		`, check.operationType, check.oldRequestID).Scan(&intentStatus, &immutablePayload); err != nil {
			t.Fatalf("read immutable %s intent: %v", check.operationType, err)
		}
		if intentStatus != "failed_terminal" || immutablePayload == "" {
			t.Fatalf("immutable %s intent = %s/%q", check.operationType, intentStatus, immutablePayload)
		}
		var auditReplacement, auditDecision, auditActionType string
		if err := db.QueryRowContext(context.Background(), `
			SELECT metadata->>'request_id', metadata->>'decision', metadata->>'action_type'
			FROM dsh_admin_audit
			WHERE action = $1 AND target_id = $2
		`, check.expectedAction, check.oldRequestID).Scan(&auditReplacement, &auditDecision, &auditActionType); err != nil {
			t.Fatalf("read %s supersession audit: %v", check.operationType, err)
		}
		if auditReplacement != check.replacementID || auditDecision != "superseded" || auditActionType != check.operationType {
			t.Fatalf("%s audit metadata = %s/%s/%s", check.operationType, auditReplacement, auditDecision, auditActionType)
		}
	}

	if _, err := SupersedeFailedRoleAssignmentApproval(operatorContext, db, identityClient, "replacement-maker", terminalAssignmentRequestID, params); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate supersession error = %v, want conflict", err)
	}
}

func TestSupersedeFailedTerminalRequestRollsBackSourceAndReplacementWhenAuditFails(t *testing.T) {
	db := openCanonicalIntentTestDB(t)
	prepareLegacyTerminalSupersessionSchema(t, db)
	insertTerminalSupersessionFixtures(t, db)
	if err := applyTerminalSupersessionMigration(t, db); err != nil {
		t.Fatalf("apply dsh-1040: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
		ALTER TABLE dsh_admin_audit
		ADD CONSTRAINT reject_terminal_supersession_audit
		CHECK (action <> 'ROLE_ASSIGNMENT_SUPERSEDED')
	`); err != nil {
		t.Fatalf("install audit rejection fixture: %v", err)
	}
	identityClient, closeIdentity := newTerminalSupersessionIdentity(t, 7)
	defer closeIdentity()
	operatorContext := auth.WithOperatorContext(context.Background(), canonicalIntentTestOperatorContextID)
	_, err := SupersedeFailedRoleAssignmentApproval(operatorContext, db, identityClient, "replacement-maker", terminalAssignmentRequestID, SupersedeTerminalFailureParams{
		ExpectedVersion:   1,
		ReasonCode:        "canonical_version_changed",
		ReplacementReason: "re-evaluate against current canonical truth",
	})
	if err == nil {
		t.Fatal("supersession unexpectedly succeeded after audit rejection")
	}

	var oldStatus string
	var oldVersion, replacementCount int
	if err := db.QueryRowContext(context.Background(), `
		SELECT status, version,
		       (SELECT count(*) FROM dsh_admin_approval_requests WHERE supersedes_request_id = $1)
		FROM dsh_admin_approval_requests
		WHERE id = $1
	`, terminalAssignmentRequestID).Scan(&oldStatus, &oldVersion, &replacementCount); err != nil {
		t.Fatalf("read rolled-back supersession: %v", err)
	}
	if oldStatus != "pending" || oldVersion != 1 || replacementCount != 0 {
		t.Fatalf("rolled-back supersession state = %s/v%d/replacements:%d", oldStatus, oldVersion, replacementCount)
	}
}
