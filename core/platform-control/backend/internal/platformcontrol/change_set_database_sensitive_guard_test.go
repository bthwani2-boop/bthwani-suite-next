package platformcontrol

import (
	"context"
	"database/sql"
	"os"
	"testing"
)

func TestJRN040DatabaseRejectsSensitiveChangeSetItems(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for platform-control integration tests")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("ping database: %v", err)
	}
	resetPlatformTables(t, db)
	defer resetPlatformTables(t, db)

	if _, err := db.ExecContext(ctx, `
INSERT INTO platform_variables
  (variable_key, owner_service, value_type, classification, scope_type, scope_id, value_json, revision, status)
VALUES
  ('JRN040_DB_SECRET', 'vault', 'json', 'confidential', 'global', '', '{"redacted":true}'::jsonb, 1, 'active')`); err != nil {
		t.Fatalf("seed sensitive variable: %v", err)
	}

	var changeSetID string
	if err := db.QueryRowContext(ctx, `
INSERT INTO platform_change_sets
  (title, reason, impact_assessment, rollback_plan, proposer_actor_id)
VALUES
  ('database sensitive guard', 'negative proof', 'none', 'not applicable', 'test-maker')
RETURNING id::text`).Scan(&changeSetID); err != nil {
		t.Fatalf("create change set: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO platform_change_set_items
  (change_set_id, target_type, target_key, owner_service, scope_type, scope_id,
   value_type, classification, expected_revision, proposed_value_json)
VALUES
  ($1::uuid, 'variable', 'JRN040_NEW_SECRET', 'vault', 'global', '',
   'json', 'sensitive', 0, '{"enabled":false}'::jsonb)`, changeSetID); err == nil {
		t.Fatal("expected database to reject a sensitive change-set classification")
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO platform_change_set_items
  (change_set_id, target_type, target_key, owner_service, scope_type, scope_id,
   value_type, classification, expected_revision, proposed_value_json)
VALUES
  ($1::uuid, 'variable', 'JRN040_DB_SECRET', 'vault', 'global', '',
   'json', 'internal', 1, '{"enabled":false}'::jsonb)`, changeSetID); err == nil {
		t.Fatal("expected database to reject an existing confidential target")
	}
}
