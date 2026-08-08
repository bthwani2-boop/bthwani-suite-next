package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"
)

func seedGovernedStoreCreationPartner(
	t *testing.T,
	db *sql.DB,
	operatorContextID string,
	actorID string,
	suffix string,
) string {
	t.Helper()
	partnerID := "prt-gosc-" + suffix
	_, err := db.Exec(`
		INSERT INTO dsh_partners (
			id, operator_context_id,
			legal_name_ar, legal_name_en, display_name,
			legal_identity_type, legal_identity_number,
			owner_actor_id, workforce_person_id,
			primary_phone, category,
			created_by_actor_id, created_by_surface, onboarding_case_status
		) VALUES (
			$1, $2,
			$3, $3, $3,
			'commercial_register', $4,
			$5, '',
			$6, 'grocery',
			$5, 'control-panel', 'draft'
		)`,
		partnerID,
		operatorContextID,
		"Governed Store Partner "+suffix,
		"GOSC-CR-"+suffix,
		actorID,
		"+9677"+suffix[len(suffix)-8:],
	)
	if err != nil {
		t.Fatalf("seed governed store partner: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`
			DELETE FROM dsh_operator_store_creation_idempotency
			WHERE operator_context_id = $1`, operatorContextID)
		_, _ = db.Exec(`
			DELETE FROM dsh_store_action_audit
			WHERE store_id IN (SELECT id FROM dsh_stores WHERE partner_id = $1)`, partnerID)
		_, _ = db.Exec(`
			DELETE FROM dsh_store_actor_scopes
			WHERE store_id IN (SELECT id FROM dsh_stores WHERE partner_id = $1)`, partnerID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE partner_id = $1`, partnerID)
		_, _ = db.Exec(`DELETE FROM dsh_partners WHERE id = $1`, partnerID)
	})
	return partnerID
}

func TestGovernedOperatorStoreCreationIdempotencyIsContextScopedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	actorID := "operator-gosc-" + suffix
	idempotencyKey := "store-create-gosc-" + suffix
	contextA := "operator-context-gosc-a-" + suffix
	contextB := "operator-context-gosc-b-" + suffix
	partnerA := seedGovernedStoreCreationPartner(t, db, contextA, actorID, "a-"+suffix)
	partnerB := seedGovernedStoreCreationPartner(t, db, contextB, actorID, "b-"+suffix)

	inputA := CreateDraftStoreInput{
		PartnerID:   partnerA,
		DisplayName: "Context A Store " + suffix,
		Category:    "grocery",
	}
	firstA, replayed, err := CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, contextA, actorID, idempotencyKey, "gosc-context-a-first-"+suffix, inputA,
	)
	if err != nil {
		t.Fatal(err)
	}
	if replayed {
		t.Fatal("first context-A creation was incorrectly classified as a replay")
	}

	replayA, replayed, err := CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, contextA, actorID, idempotencyKey, "gosc-context-a-retry-"+suffix, inputA,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !replayed || replayA.ID != firstA.ID {
		t.Fatalf("same-context retry did not replay original store: replayed=%v first=%s replay=%s", replayed, firstA.ID, replayA.ID)
	}

	changedA := inputA
	changedA.DisplayName += " changed"
	_, _, err = CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, contextA, actorID, idempotencyKey, "gosc-context-a-conflict-"+suffix, changedA,
	)
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("same context/key with a different payload = %v, want ErrIdempotencyConflict", err)
	}

	inputB := CreateDraftStoreInput{
		PartnerID:   partnerB,
		DisplayName: "Context B Store " + suffix,
		Category:    "grocery",
	}
	firstB, replayed, err := CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, contextB, actorID, idempotencyKey, "gosc-context-b-first-"+suffix, inputB,
	)
	if err != nil {
		t.Fatalf("same actor/key must be independent in another OperatorContext: %v", err)
	}
	if replayed {
		t.Fatal("first context-B creation was incorrectly classified as a replay")
	}
	if firstB.ID == firstA.ID {
		t.Fatalf("independent OperatorContexts returned the same store id: %s", firstA.ID)
	}

	for _, item := range []struct {
		storeID           string
		operatorContextID string
	}{
		{storeID: firstA.ID, operatorContextID: contextA},
		{storeID: firstB.ID, operatorContextID: contextB},
	} {
		var gotContext string
		if err := db.QueryRow(`SELECT operator_context_id FROM dsh_stores WHERE id = $1`, item.storeID).Scan(&gotContext); err != nil {
			t.Fatal(err)
		}
		if gotContext != item.operatorContextID {
			t.Fatalf("store %s escaped OperatorContext: got=%q want=%q", item.storeID, gotContext, item.operatorContextID)
		}
	}

	var retryRows int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_operator_store_creation_idempotency
		WHERE actor_id = $1 AND idempotency_key = $2`,
		actorID, idempotencyKey,
	).Scan(&retryRows); err != nil {
		t.Fatal(err)
	}
	if retryRows != 2 {
		t.Fatalf("context-scoped retry ledger rows=%d, want 2", retryRows)
	}
}

func TestGovernedOperatorStoreCreationExpiredKeyIsScopedAndReusableDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	actorID := "operator-gosc-expiry-" + suffix
	operatorContextID := "operator-context-gosc-expiry-" + suffix
	idempotencyKey := "store-create-gosc-expiry-" + suffix
	partnerID := seedGovernedStoreCreationPartner(t, db, operatorContextID, actorID, "expiry-"+suffix)

	input := CreateDraftStoreInput{
		PartnerID:   partnerID,
		DisplayName: "Expiry Store " + suffix,
		Category:    "grocery",
	}
	first, replayed, err := CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, operatorContextID, actorID, idempotencyKey, "gosc-expiry-first-"+suffix, input,
	)
	if err != nil {
		t.Fatal(err)
	}
	if replayed {
		t.Fatal("first expiry-test creation was incorrectly classified as a replay")
	}

	if _, err := db.Exec(`
		UPDATE dsh_operator_store_creation_idempotency
		SET expires_at = NOW() - INTERVAL '1 minute'
		WHERE operator_context_id = $1
		  AND actor_id = $2
		  AND idempotency_key = $3`,
		operatorContextID, actorID, idempotencyKey,
	); err != nil {
		t.Fatal(err)
	}

	refreshedInput := input
	refreshedInput.DisplayName += " refreshed"
	second, replayed, err := CreateGovernedStoreForOperatorContextIdempotent(
		ctx, db, operatorContextID, actorID, idempotencyKey, "gosc-expiry-reuse-"+suffix, refreshedInput,
	)
	if err != nil {
		t.Fatalf("expired scoped key must be reusable: %v", err)
	}
	if replayed {
		t.Fatal("expired key was replayed instead of being reused")
	}
	if second.ID == first.ID {
		t.Fatalf("expired key reuse returned old store id %s", first.ID)
	}

	var retryRows int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_operator_store_creation_idempotency
		WHERE operator_context_id = $1
		  AND actor_id = $2
		  AND idempotency_key = $3`,
		operatorContextID, actorID, idempotencyKey,
	).Scan(&retryRows); err != nil {
		t.Fatal(err)
	}
	if retryRows != 1 {
		t.Fatalf("expired identity must be replaced by exactly one retry row, got %d", retryRows)
	}
}
