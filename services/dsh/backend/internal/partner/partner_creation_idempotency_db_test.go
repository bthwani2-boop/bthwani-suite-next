package partner

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestPartnerCreationUnknownResultRetryReplaysOriginalAuthorityDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-j020-" + suffix
	actorID := "field-j020-" + suffix
	idempotencyKey := "partner-create-j020-" + suffix
	input := CreatePartnerInput{
		LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© " + suffix,
		LegalNameEn:         "J020 retry partner " + suffix,
		DisplayName:         "J020 Partner " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "J020-CR-" + suffix,
		PrimaryPhone:        "+9677" + suffix[len(suffix)-8:],
		Category:            "restaurant",
		CreatedByActorID:    actorID,
		CreatedBySurface:    "app-field",
	}

	first, replayed, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		operatorContextID,
		idempotencyKey,
		"j020-first-attempt-"+suffix,
		input,
	)
	if err != nil {
		t.Fatal(err)
	}
	if replayed {
		t.Fatal("first partner creation was incorrectly classified as a replay")
	}
	registerPartnerFixtureCleanup(t, db, first.ID, partnerStoreID(t, db, first.ID))

	second, replayed, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		operatorContextID,
		idempotencyKey,
		"j020-retry-after-unknown-result-"+suffix,
		input,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !replayed {
		t.Fatal("unknown-result retry did not replay the original partner creation")
	}
	if second.ID != first.ID {
		t.Fatalf("retry created parallel partner authority: first=%s second=%s", first.ID, second.ID)
	}

	var partnerCount int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_partners
		WHERE operator_context_id = $1
		  AND legal_identity_type = $2
		  AND legal_identity_number = $3`,
		operatorContextID,
		input.LegalIdentityType,
		input.LegalIdentityNumber,
	).Scan(&partnerCount); err != nil {
		t.Fatal(err)
	}
	if partnerCount != 1 {
		t.Fatalf("partner creation retry produced %d partner rows, want 1", partnerCount)
	}

	var storeCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_stores WHERE partner_id = $1`, first.ID).Scan(&storeCount); err != nil {
		t.Fatal(err)
	}
	if storeCount != 1 {
		t.Fatalf("partner creation retry produced %d first stores, want 1", storeCount)
	}

	var scopeCount int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_store_actor_scopes AS scope
		JOIN dsh_stores AS store ON store.id = scope.store_id
		WHERE store.partner_id = $1
		  AND scope.actor_id = $2
		  AND scope.actor_role = 'field'
		  AND scope.active = true`, first.ID, actorID,
	).Scan(&scopeCount); err != nil {
		t.Fatal(err)
	}
	if scopeCount != 1 {
		t.Fatalf("partner creation retry produced %d active field scopes, want 1", scopeCount)
	}

	var eventCount int
	var requestHash string
	if err := db.QueryRow(`
		SELECT COUNT(*), MAX(COALESCE(request_hash, ''))
		FROM dsh_partner_activation_events
		WHERE partner_id = $1
		  AND actor_id = $2
		  AND idempotency_key = $3
		  AND from_status = 'none'
		  AND to_status = 'draft'`, first.ID, actorID, idempotencyKey,
	).Scan(&eventCount, &requestHash); err != nil {
		t.Fatal(err)
	}
	if eventCount != 1 || requestHash == "" {
		t.Fatalf("creation retry journal is incomplete: events=%d hash=%q", eventCount, requestHash)
	}

	changed := input
	changed.DisplayName = input.DisplayName + " changed"
	_, _, err = CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		operatorContextID,
		idempotencyKey,
		"j020-conflicting-retry-"+suffix,
		changed,
	)
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("same key with different payload = %v, want ErrIdempotencyConflict", err)
	}
}

func TestPartnerCreationRequiresRetryIdentityDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	_, _, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		"operator-context-j020-key-"+suffix,
		"",
		"",
		CreatePartnerInput{
			LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ø¯ÙˆÙ† Ù…ÙØªØ§Ø­",
			DisplayName:         "Missing Key " + suffix,
			LegalIdentityType:   "commercial_register",
			LegalIdentityNumber: "J020-MISSING-KEY-" + suffix,
			PrimaryPhone:        "+967700000001",
			CreatedByActorID:    "field-j020-key-" + suffix,
			CreatedBySurface:    "app-field",
		},
	)
	if !errors.Is(err, ErrPartnerCreationIdempotencyRequired) {
		t.Fatalf("missing key = %v, want ErrPartnerCreationIdempotencyRequired", err)
	}
}
