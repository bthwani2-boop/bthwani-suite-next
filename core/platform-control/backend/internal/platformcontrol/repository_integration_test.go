package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

func TestGovernedChangeSetApplyAndRollback(t *testing.T) {
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

	service := NewService(NewRepository(db))
	created, err := service.CreateChangeSet(
		ctx,
		"operator-1",
		[]string{"platform-operator"},
		"integration-change-1",
		CreateChangeSetInput{
			Title:            "Enable governed dispatch controls",
			Reason:           "Exercise the complete maker-checker workflow",
			ImpactAssessment: "Affects DSH dispatch configuration in the global scope",
			RollbackPlan:     "Restore the captured pre-apply values",
			Items: []CreateChangeSetItemInput{
				{
					TargetType:       ChangeTargetVariable,
					TargetKey:        "DSH_DISPATCH_LIMITS",
					OwnerService:     "dsh",
					ScopeType:        "global",
					ValueType:        "json",
					Classification:   "internal",
					ExpectedRevision: 0,
					ProposedValue:    json.RawMessage(`{"maxConcurrent":12}`),
				},
				{
					TargetType:       ChangeTargetFeatureFlag,
					TargetKey:        "DSH_SMART_DISPATCH_ENABLED",
					OwnerService:     "dsh",
					ScopeType:        "global",
					ValueType:        "boolean",
					Classification:   "internal",
					ExpectedRevision: 0,
					ProposedValue:    json.RawMessage(`true`),
				},
			},
		},
	)
	if err != nil {
		t.Fatalf("create change set: %v", err)
	}
	if created.Status != ChangeSetDraft || len(created.Items) != 2 {
		t.Fatalf("unexpected created change set: status=%s items=%d", created.Status, len(created.Items))
	}

	validated, err := service.ValidateChangeSet(ctx, created.ID, "operator-1", []string{"platform-operator"}, "integration-change-1")
	if err != nil || validated.Status != ChangeSetValidated {
		t.Fatalf("validate change set: status=%s err=%v", validated.Status, err)
	}
	submitted, err := service.SubmitChangeSet(ctx, created.ID, "operator-1", []string{"platform-operator"}, "integration-change-1")
	if err != nil || submitted.Status != ChangeSetSubmitted {
		t.Fatalf("submit change set: status=%s err=%v", submitted.Status, err)
	}

	if _, err := service.ApproveChangeSet(ctx, created.ID, "operator-1", []string{"platform-operator"}, "integration-change-1"); !errors.Is(err, ErrMakerChecker) {
		t.Fatalf("expected maker-checker rejection, got %v", err)
	}

	approved, err := service.ApproveChangeSet(ctx, created.ID, "approver-1", []string{"platform-approver"}, "integration-change-1")
	if err != nil || approved.Status != ChangeSetApproved {
		t.Fatalf("approve change set: status=%s err=%v", approved.Status, err)
	}
	applied, err := service.ApplyChangeSet(ctx, created.ID, "applier-1", []string{"platform-applier"}, "integration-change-1")
	if err != nil || applied.Status != ChangeSetApplied {
		t.Fatalf("apply change set: status=%s err=%v", applied.Status, err)
	}

	variable, err := service.GetVariable(ctx, "DSH_DISPATCH_LIMITS", "global", "")
	if err != nil {
		t.Fatalf("read applied variable: %v", err)
	}
	value, ok := variable.Value.(map[string]any)
	if !ok || value["maxConcurrent"] != float64(12) || variable.Revision != "1" {
		t.Fatalf("unexpected applied variable: value=%#v revision=%s", variable.Value, variable.Revision)
	}
	flags, err := service.FeatureFlags(ctx)
	if err != nil || len(flags) != 1 || flags[0].Enabled == nil || !*flags[0].Enabled || flags[0].Revision != "1" {
		t.Fatalf("unexpected applied flags: flags=%#v err=%v", flags, err)
	}

	events, err := service.AuditEvents(ctx)
	if err != nil || len(events) != 5 {
		t.Fatalf("expected five committed audit events, got %d err=%v", len(events), err)
	}

	rolledBack, err := service.RollbackChangeSet(ctx, created.ID, "applier-1", []string{"platform-applier"}, "integration-change-1")
	if err != nil || rolledBack.Status != ChangeSetRolledBack {
		t.Fatalf("rollback change set: status=%s err=%v", rolledBack.Status, err)
	}
	if _, err := service.GetVariable(ctx, "DSH_DISPATCH_LIMITS", "global", ""); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected newly created variable to be removed by rollback, got %v", err)
	}
	flags, err = service.FeatureFlags(ctx)
	if err != nil || len(flags) != 0 {
		t.Fatalf("expected newly created flag to be removed by rollback, flags=%#v err=%v", flags, err)
	}
	events, err = service.AuditEvents(ctx)
	if err != nil || len(events) != 6 || events[0].Action != "change_set_rolled_back" {
		t.Fatalf("unexpected rollback audit trail: events=%#v err=%v", events, err)
	}
}

func resetPlatformTables(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`
TRUNCATE TABLE
  platform_audit_events,
  platform_change_set_items,
  platform_change_sets,
  platform_feature_flags,
  platform_variables
RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("reset platform tables: %v", err)
	}
}
