package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"testing"
)

func TestGovernedProgressiveRolloutJourney(t *testing.T) {
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

	repository := NewRepository(db)
	service := NewService(repository)
	changeSet, err := service.CreateChangeSet(
		ctx,
		"operator-1",
		[]string{"platform-operator"},
		"rollout-integration-1",
		CreateChangeSetInput{
			Title:            "Create guarded smart dispatch flag",
			Reason:           "Prove progressive rollout lifecycle",
			ImpactAssessment: "Traffic is introduced in controlled percentages",
			RollbackPlan:     "Restore the baseline flag value and targeting",
			Items: []CreateChangeSetItemInput{
				{
					TargetType:       ChangeTargetFeatureFlag,
					TargetKey:        "DSH_SMART_DISPATCH_PROGRESSIVE",
					OwnerService:     "dsh",
					ScopeType:        "global",
					ValueType:        "boolean",
					Classification:   "internal",
					ExpectedRevision: 0,
					ProposedValue:    json.RawMessage(`false`),
				},
			},
		},
	)
	if err != nil {
		t.Fatalf("create change set: %v", err)
	}
	if _, err := service.ValidateChangeSet(ctx, changeSet.ID, "operator-1", []string{"platform-operator"}, "rollout-integration-1"); err != nil {
		t.Fatalf("validate change set: %v", err)
	}
	if _, err := service.SubmitChangeSet(ctx, changeSet.ID, "operator-1", []string{"platform-operator"}, "rollout-integration-1"); err != nil {
		t.Fatalf("submit change set: %v", err)
	}
	if _, err := service.ApproveChangeSet(ctx, changeSet.ID, "approver-1", []string{"platform-approver"}, "rollout-integration-1"); err != nil {
		t.Fatalf("approve change set: %v", err)
	}
	if _, err := service.ApplyChangeSet(ctx, changeSet.ID, "applier-1", []string{"platform-applier"}, "rollout-integration-1"); err != nil {
		t.Fatalf("apply change set: %v", err)
	}

	rollout, err := repository.CreateRollout(
		ctx,
		"rollout-manager-1",
		[]string{"platform-rollout-manager"},
		"rollout-integration-1",
		CreateRolloutInput{
			ChangeSetID:    changeSet.ID,
			FeatureFlagKey: "DSH_SMART_DISPATCH_PROGRESSIVE",
			TargetScope:    map[string]any{"surface": "app-captain", "city": "sanaa"},
			Steps:          []int64{10, 50, 100},
			HealthGate:     map[string]any{"requiredState": "OPERATIONAL"},
		},
	)
	if err != nil {
		t.Fatalf("create rollout: %v", err)
	}
	if rollout.Status != RolloutRunning || rollout.CurrentStepIndex != -1 || rollout.FlagRevision != 1 {
		t.Fatalf("unexpected initial rollout: %#v", rollout)
	}

	rollout, err = repository.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil {
		t.Fatalf("advance rollout to 10: %v", err)
	}
	if rollout.Status != RolloutRunning || rollout.CurrentPercentage != 10 || rollout.FlagRevision != 2 {
		t.Fatalf("unexpected 10 percent rollout: %#v", rollout)
	}

	rollout, err = repository.PauseRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutPaused {
		t.Fatalf("pause rollout: status=%s err=%v", rollout.Status, err)
	}
	rollout, err = repository.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutRunning || rollout.CurrentPercentage != 50 || rollout.FlagRevision != 3 {
		t.Fatalf("resume rollout to 50: rollout=%#v err=%v", rollout, err)
	}
	rollout, err = repository.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutCompleted || rollout.CurrentPercentage != 100 || rollout.FlagRevision != 4 {
		t.Fatalf("complete rollout: rollout=%#v err=%v", rollout, err)
	}

	flags, err := repository.FeatureFlags(ctx)
	if err != nil || len(flags) != 1 || flags[0].Enabled == nil || !*flags[0].Enabled || flags[0].Revision != "4" {
		t.Fatalf("unexpected completed flag: flags=%#v err=%v", flags, err)
	}
	percentage, ok := flags[0].Targeting["percentage"].(float64)
	if !ok || percentage != 100 {
		t.Fatalf("unexpected completed targeting: %#v", flags[0].Targeting)
	}

	rollout, err = repository.RollbackRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutRolledBack || rollout.FlagRevision != 5 {
		t.Fatalf("rollback completed rollout: rollout=%#v err=%v", rollout, err)
	}
	flags, err = repository.FeatureFlags(ctx)
	if err != nil || len(flags) != 1 || flags[0].Enabled == nil || *flags[0].Enabled || flags[0].Revision != "5" {
		t.Fatalf("unexpected rolled-back flag: flags=%#v err=%v", flags, err)
	}
	if len(flags[0].Targeting) != 0 {
		t.Fatalf("expected baseline empty targeting, got %#v", flags[0].Targeting)
	}

	events, err := repository.AuditEvents(ctx)
	if err != nil {
		t.Fatalf("read audit events: %v", err)
	}
	if len(events) != 11 {
		t.Fatalf("expected 11 workflow and rollout audit events, got %d", len(events))
	}
}
