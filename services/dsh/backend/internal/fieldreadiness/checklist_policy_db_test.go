package fieldreadiness

import (
	"context"
	"errors"
	"testing"
)

func TestChecklistPolicySnapshotIsImmutableAndVersioned(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	operatorContextID := requiredTestOperatorContextID(t)
	verticalID := "domain-restaurants"

	// Keep this policy scope deterministic even when the local runtime was used
	// interactively before the test.
	if _, err := db.ExecContext(ctx, `
		DELETE FROM dsh_readiness_checklist_templates
		WHERE operator_context_id = $1 AND business_vertical_id = $2`, operatorContextID, verticalID); err != nil {
		t.Fatalf("clear checklist policy fixture: %v", err)
	}

	firstPolicy, err := ReplaceChecklistPolicy(ctx, db, operatorContextID, verticalID, "operator-policy-test", 0, []ChecklistPolicyItem{
		{CheckType: "identity_verified", LabelAR: "التحقق من الهوية", Required: true, Critical: true, EvidenceRequired: true, DisplayOrder: 10},
	})
	if err != nil {
		t.Fatalf("create checklist policy: %v", err)
	}
	if firstPolicy.Version != 1 {
		t.Fatalf("expected first policy version 1, got %d", firstPolicy.Version)
	}

	agentID := uniqueID("agent-policy")
	partnerID := seedPartner(t, db, agentID)
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_partners SET business_vertical_id = $2 WHERE id = $1`, partnerID, verticalID); err != nil {
		t.Fatalf("bind partner business vertical: %v", err)
	}
	storeID := uniqueID("store-policy")
	seedFieldStoreForPartner(t, db, storeID, agentID, partnerID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := testFieldActor(t, agentID)

	visit, err := CreateGovernedVisit(ctx, db, nil, actor, CreateVisitInput{
		StoreID: storeID, FieldAgentID: agentID, VisitType: VisitTypeOnboarding, StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create visit from policy: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_readiness_checklist_templates WHERE operator_context_id = $1 AND business_vertical_id = $2`, operatorContextID, verticalID)
	})

	secondPolicy, err := ReplaceChecklistPolicy(ctx, db, operatorContextID, verticalID, "operator-policy-test", firstPolicy.Version, []ChecklistPolicyItem{
		{CheckType: "premises_verified", LabelAR: "التحقق من مقر النشاط", Required: true, Critical: true, EvidenceRequired: true, DisplayOrder: 10},
	})
	if err != nil {
		t.Fatalf("replace checklist policy: %v", err)
	}
	if secondPolicy.Version != 2 {
		t.Fatalf("expected second policy version 2, got %d", secondPolicy.Version)
	}
	if _, err := ReplaceChecklistPolicy(ctx, db, operatorContextID, verticalID, "stale-operator", firstPolicy.Version, secondPolicy.Items); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected stale policy version conflict, got %v", err)
	}

	checks, err := ListVisitChecks(ctx, db, nil, actor, visit.ID)
	if err != nil {
		t.Fatalf("list snapshotted visit checks: %v", err)
	}
	if len(checks) != 1 || checks[0].CheckType != "identity_verified" || checks[0].LabelAR != "التحقق من الهوية" || !checks[0].Critical {
		t.Fatalf("visit policy snapshot changed after template replacement: %#v", checks)
	}
	mediaRef := seedStoreBoundReadinessMedia(t, db, partnerID, storeID, agentID)
	updatedCheck, err := UpsertGovernedReadinessCheck(ctx, db, nil, actor, visit.ID, UpdateCheckInput{
		CheckType: "identity_verified", Status: CheckPassed, EvidenceURL: mediaRef,
	})
	if err != nil {
		t.Fatalf("upsert snapshotted policy check: %v", err)
	}
	if updatedCheck.LabelAR != "التحقق من الهوية" || !updatedCheck.Required || !updatedCheck.Critical || updatedCheck.DisplayOrder != 10 {
		t.Fatalf("upsert response lost checklist metadata: %#v", updatedCheck)
	}
	if _, err := UpsertGovernedReadinessCheck(ctx, db, nil, actor, visit.ID, UpdateCheckInput{
		CheckType: "premises_verified", Status: CheckPassed,
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected a post-snapshot check type to be rejected, got %v", err)
	}
	var auditEvents int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_readiness_checklist_policy_events
		WHERE operator_context_id = $1 AND business_vertical_id = $2`, operatorContextID, verticalID).Scan(&auditEvents); err != nil {
		t.Fatalf("count checklist policy audit events: %v", err)
	}
	if auditEvents != 2 {
		t.Fatalf("expected two checklist policy audit events, got %d", auditEvents)
	}
}
