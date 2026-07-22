package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
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

	var healthy atomic.Bool
	healthy.Store(true)
	healthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if !healthy.Load() {
			http.Error(w, "degraded", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer healthServer.Close()

	repository := NewRepository(db)
	service := NewService(repository)
	service.ConfigureDependencies([]ServiceDependency{{Name: "dsh", HealthURL: healthServer.URL}})
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

	rollout, err := service.CreateRollout(
		ctx,
		"rollout-manager-1",
		[]string{"platform-rollout-manager"},
		"rollout-integration-1",
		CreateRolloutInput{
			ChangeSetID:    changeSet.ID,
			FeatureFlagKey: "DSH_SMART_DISPATCH_PROGRESSIVE",
			TargetScope:    map[string]any{"surface": "app-captain", "city": "sanaa"},
			Steps:          []int64{10, 50, 100},
			HealthGate:     map[string]any{"requiredState": "OPERATIONAL", "requiredServices": []string{"dsh"}},
		},
	)
	if err != nil {
		t.Fatalf("create rollout: %v", err)
	}
	if rollout.Status != RolloutRunning || rollout.CurrentStepIndex != -1 || rollout.FlagRevision != 1 {
		t.Fatalf("unexpected initial rollout: %#v", rollout)
	}

	rollout, err = service.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil {
		t.Fatalf("advance rollout to 10: %v", err)
	}
	if rollout.Status != RolloutRunning || rollout.CurrentPercentage != 10 || rollout.FlagRevision != 2 {
		t.Fatalf("unexpected 10 percent rollout: %#v", rollout)
	}

	rollout, err = service.PauseRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutPaused {
		t.Fatalf("pause rollout: status=%s err=%v", rollout.Status, err)
	}
	if _, err := service.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1"); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("advance while paused must be rejected, got %v", err)
	}

	healthy.Store(false)
	if _, err := service.ResumeRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-health-blocked"); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("resume while unhealthy must be rejected, got %v", err)
	}
	stillPaused, err := repository.GetRollout(ctx, rollout.ID)
	if err != nil || stillPaused.Status != RolloutPaused || stillPaused.CurrentPercentage != 10 || stillPaused.FlagRevision != 2 {
		t.Fatalf("health-blocked resume changed rollout: rollout=%#v err=%v", stillPaused, err)
	}
	blockedGuide, err := service.GetRolloutRecoveryGuide(ctx, rollout.ID)
	if err != nil || blockedGuide.CanResume || blockedGuide.RecommendedAction != "resume_after_health_or_abort" {
		t.Fatalf("unexpected blocked recovery guide: guide=%#v err=%v", blockedGuide, err)
	}

	healthy.Store(true)
	rollout, err = service.ResumeRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutRunning || rollout.CurrentPercentage != 10 || rollout.FlagRevision != 2 || rollout.PausedAt != nil {
		t.Fatalf("resume rollout without advance: rollout=%#v err=%v", rollout, err)
	}
	rollout, err = service.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
	if err != nil || rollout.Status != RolloutRunning || rollout.CurrentPercentage != 50 || rollout.FlagRevision != 3 {
		t.Fatalf("advance rollout to 50: rollout=%#v err=%v", rollout, err)
	}
	rollout, err = service.AdvanceRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
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
	completedGuide, err := service.GetRolloutRecoveryGuide(ctx, rollout.ID)
	if err != nil || !completedGuide.CanRollback || completedGuide.RollbackPlan == "" {
		t.Fatalf("unexpected completed recovery guide: guide=%#v err=%v", completedGuide, err)
	}

	rollout, err = service.RollbackRollout(ctx, rollout.ID, "rollout-manager-1", []string{"platform-rollout-manager"}, "rollout-integration-1")
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
	if len(events) != 13 {
		t.Fatalf("expected 13 workflow, rollout and health-block audit events, got %d", len(events))
	}
	foundHealthBlock := false
	foundResume := false
	for _, event := range events {
		if event.Action == "rollout_health_gate_blocked" && event.CorrelationID == "rollout-health-blocked" {
			foundHealthBlock = true
		}
		if event.Action == "rollout_resumed" {
			foundResume = true
		}
	}
	if !foundHealthBlock || !foundResume {
		t.Fatalf("missing governed audit evidence: healthBlock=%t resume=%t events=%#v", foundHealthBlock, foundResume, events)
	}
}
