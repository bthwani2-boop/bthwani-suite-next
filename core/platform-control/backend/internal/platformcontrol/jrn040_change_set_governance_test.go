package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

func TestJRN040CreateValidationRejectsUnsafeInputs(t *testing.T) {
	base := CreateChangeSetInput{
		Title:            "safe change",
		Reason:           "verified operational reason",
		ImpactAssessment: "bounded impact",
		RollbackPlan:     "restore baseline",
		Items: []CreateChangeSetItemInput{{
			TargetType:       ChangeTargetVariable,
			TargetKey:        "SAFE_KEY",
			OwnerService:     "dsh",
			ScopeType:        "global",
			ValueType:        "json",
			Classification:   "internal",
			ExpectedRevision: 0,
			ProposedValue:    json.RawMessage(`{"limit":12}`),
		}},
	}
	if err := validateGovernedCreateInput(base); err != nil {
		t.Fatalf("expected safe input, got %v", err)
	}

	secretClassification := base
	secretClassification.Items = append([]CreateChangeSetItemInput(nil), base.Items...)
	secretClassification.Items[0].Classification = "secret"
	if err := validateGovernedCreateInput(secretClassification); !errors.Is(err, ErrSensitiveValue) {
		t.Fatalf("expected sensitive classification rejection, got %v", err)
	}

	secretField := base
	secretField.Items = append([]CreateChangeSetItemInput(nil), base.Items...)
	secretField.Items[0].ProposedValue = json.RawMessage(`{"client_secret":"do-not-store"}`)
	if err := validateGovernedCreateInput(secretField); !errors.Is(err, ErrSensitiveValue) {
		t.Fatalf("expected secret-shaped JSON rejection, got %v", err)
	}

	scopedFlag := base
	scopedFlag.Items = []CreateChangeSetItemInput{{
		TargetType:       ChangeTargetFeatureFlag,
		TargetKey:        "FLAG",
		OwnerService:     "dsh",
		ScopeType:        "store",
		ScopeID:          "store-1",
		ValueType:        "boolean",
		Classification:   "internal",
		ExpectedRevision: 0,
		ProposedValue:    json.RawMessage(`true`),
	}}
	if err := validateGovernedCreateInput(scopedFlag); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected scoped feature flag rejection, got %v", err)
	}

	duplicate := base
	duplicate.Items = append(append([]CreateChangeSetItemInput(nil), base.Items...), base.Items[0])
	if err := validateGovernedCreateInput(duplicate); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected duplicate target rejection, got %v", err)
	}
}

func TestJRN040ConflictStaleSnapshotAndMetadataRollback(t *testing.T) {
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
  ('JRN040_TARGET', 'legacy-owner', 'integer', 'public', 'global', '', '5'::jsonb, 1, 'inactive'),
  ('JRN040_SECRET', 'vault', 'json', 'secret', 'global', '', '{"credential":"redacted"}'::jsonb, 1, 'active')`); err != nil {
		t.Fatalf("seed variables: %v", err)
	}

	service := NewService(NewRepository(db))
	if _, err := service.CreateChangeSet(ctx, "maker", nil, "secret-target", CreateChangeSetInput{
		Title:            "must not snapshot secret",
		Reason:           "negative proof",
		ImpactAssessment: "must fail before persistence",
		RollbackPlan:     "not applicable",
		Items: []CreateChangeSetItemInput{{
			TargetType:       ChangeTargetVariable,
			TargetKey:        "JRN040_SECRET",
			OwnerService:     "vault",
			ScopeType:        "global",
			ValueType:        "json",
			Classification:   "internal",
			ExpectedRevision: 1,
			ProposedValue:    json.RawMessage(`{"enabled":false}`),
		}},
	}); !errors.Is(err, ErrSensitiveValue) {
		t.Fatalf("expected existing sensitive target rejection, got %v", err)
	}

	create := func(title string, expectedRevision int64) ChangeSet {
		changeSet, createErr := service.CreateChangeSet(ctx, "maker", []string{"platform-operator"}, title, CreateChangeSetInput{
			Title:            title,
			Reason:           "reason",
			ImpactAssessment: "impact",
			RollbackPlan:     "restore",
			Items: []CreateChangeSetItemInput{{
				TargetType:       ChangeTargetVariable,
				TargetKey:        "JRN040_TARGET",
				OwnerService:     "new-owner",
				ScopeType:        "global",
				ValueType:        "integer",
				Classification:   "internal",
				ExpectedRevision: expectedRevision,
				ProposedValue:    json.RawMessage(`7`),
			}},
		})
		if createErr != nil {
			t.Fatalf("create %s: %v", title, createErr)
		}
		return changeSet
	}

	first := create("first", 1)
	if _, err := service.ValidateChangeSet(ctx, first.ID, "maker", nil, "first"); err != nil {
		t.Fatalf("validate first: %v", err)
	}
	second := create("second", 1)
	if _, err := service.ValidateChangeSet(ctx, second.ID, "maker", nil, "second"); !errors.Is(err, ErrTargetConflict) {
		t.Fatalf("expected active target conflict, got %v", err)
	}

	if _, err := service.SubmitChangeSet(ctx, first.ID, "maker", nil, "first"); err != nil {
		t.Fatalf("submit first: %v", err)
	}
	if _, err := service.RejectChangeSet(ctx, first.ID, "maker", nil, "first", "self review"); !errors.Is(err, ErrMakerCheckerReview) {
		t.Fatalf("expected self-reject maker-checker failure, got %v", err)
	}
	if _, err := service.ApproveChangeSet(ctx, first.ID, "checker", nil, "first"); err != nil {
		t.Fatalf("approve first: %v", err)
	}
	if _, err := service.ApplyChangeSet(ctx, first.ID, "applier", nil, "first"); err != nil {
		t.Fatalf("apply first: %v", err)
	}
	if _, err := service.RollbackChangeSet(ctx, first.ID, "rollback-operator", nil, "first", "restore legacy metadata"); err != nil {
		t.Fatalf("rollback first: %v", err)
	}

	var owner, valueType, classification, status string
	var valueRaw []byte
	var revision int64
	if err := db.QueryRowContext(ctx, `SELECT owner_service, value_type, classification, status, value_json, revision FROM platform_variables WHERE variable_key='JRN040_TARGET' AND scope_type='global' AND scope_id=''`).Scan(&owner, &valueType, &classification, &status, &valueRaw, &revision); err != nil {
		t.Fatalf("read restored variable: %v", err)
	}
	if owner != "legacy-owner" || valueType != "integer" || classification != "public" || status != "inactive" || string(valueRaw) != "5" || revision != 3 {
		t.Fatalf("rollback did not restore metadata: owner=%s type=%s class=%s status=%s value=%s revision=%d", owner, valueType, classification, status, string(valueRaw), revision)
	}

	stale := create("stale", revision)
	if _, err := service.ValidateChangeSet(ctx, stale.ID, "maker", nil, "stale"); err != nil {
		t.Fatalf("validate stale candidate: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE platform_variables SET revision=revision+1, value_json='9'::jsonb WHERE variable_key='JRN040_TARGET' AND scope_type='global' AND scope_id=''`); err != nil {
		t.Fatalf("mutate target after validation: %v", err)
	}
	if _, err := service.SubmitChangeSet(ctx, stale.ID, "maker", nil, "stale"); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected stale validation conflict, got %v", err)
	}
}
