package partner

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func partnerCreationScopeTestInput(suffix, actorID, ownerActorID, surface string) CreatePartnerInput {
	phoneSuffix := suffix
	if len(phoneSuffix) > 8 {
		phoneSuffix = phoneSuffix[len(phoneSuffix)-8:]
	}
	return CreatePartnerInput{
		LegalNameAr:         "شريك اختبار صلاحيات الإنشاء " + suffix,
		LegalNameEn:         "Creation scope authority " + suffix,
		DisplayName:         "Scope Authority " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "SCOPE-AUTH-" + suffix,
		OwnerActorID:        ownerActorID,
		PrimaryPhone:        "+9677" + phoneSuffix,
		Category:            "restaurant",
		CreatedByActorID:    actorID,
		CreatedBySurface:    surface,
	}
}

func createdPartnerFirstStoreID(t *testing.T, partnerID string) string {
	t.Helper()
	db := openRequiredDB(t)
	var storeID string
	if err := db.QueryRow(`
		SELECT id
		FROM dsh_stores
		WHERE partner_id = $1
		ORDER BY created_at ASC
		LIMIT 1`, partnerID,
	).Scan(&storeID); err != nil {
		t.Fatal(err)
	}
	return storeID
}

func TestPartnerCreationFieldScopesCommitAtomicallyDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-scope-field-" + suffix
	fieldActorID := "field-scope-" + suffix
	ownerActorID := "partner-owner-scope-" + suffix
	input := partnerCreationScopeTestInput(suffix, fieldActorID, ownerActorID, "app-field")

	created, replayed, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(), db, operatorContextID,
		"scope-field-create-"+suffix,
		"scope-field-correlation-"+suffix,
		input,
	)
	if err != nil {
		t.Fatal(err)
	}
	if replayed {
		t.Fatal("first field partner creation was incorrectly replayed")
	}
	storeID := createdPartnerFirstStoreID(t, created.ID)

	var fieldScopes int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_store_actor_scopes
		WHERE store_id = $1 AND actor_id = $2
		  AND actor_role = 'field' AND scope_type = 'assigned' AND active = true`,
		storeID, fieldActorID,
	).Scan(&fieldScopes); err != nil {
		t.Fatal(err)
	}
	if fieldScopes != 1 {
		t.Fatalf("field creation committed %d active assigned field scopes, want 1", fieldScopes)
	}

	var ownerScopes int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_store_actor_scopes
		WHERE store_id = $1 AND actor_id = $2
		  AND actor_role = 'partner' AND scope_type = 'own' AND active = true`,
		storeID, ownerActorID,
	).Scan(&ownerScopes); err != nil {
		t.Fatal(err)
	}
	if ownerScopes != 1 {
		t.Fatalf("field creation committed %d active partner-owner scopes, want 1", ownerScopes)
	}
}

func TestPartnerCreationControlPanelNeverPersistsFieldScopeDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-scope-operator-" + suffix
	operatorActorID := "operator-scope-" + suffix
	ownerActorID := "partner-owner-operator-scope-" + suffix
	input := partnerCreationScopeTestInput(suffix, operatorActorID, ownerActorID, "control-panel")

	created, replayed, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(), db, operatorContextID,
		"scope-operator-create-"+suffix,
		"scope-operator-correlation-"+suffix,
		input,
	)
	if err != nil {
		t.Fatal(err)
	}
	if replayed {
		t.Fatal("first control-panel partner creation was incorrectly replayed")
	}
	storeID := createdPartnerFirstStoreID(t, created.ID)

	var bogusFieldScopes int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_store_actor_scopes
		WHERE store_id = $1 AND actor_id = $2 AND actor_role = 'field'`,
		storeID, operatorActorID,
	).Scan(&bogusFieldScopes); err != nil {
		t.Fatal(err)
	}
	if bogusFieldScopes != 0 {
		t.Fatalf("control-panel creation persisted %d bogus field scope rows, want 0", bogusFieldScopes)
	}

	var ownerScopes int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_store_actor_scopes
		WHERE store_id = $1 AND actor_id = $2
		  AND actor_role = 'partner' AND scope_type = 'own' AND active = true`,
		storeID, ownerActorID,
	).Scan(&ownerScopes); err != nil {
		t.Fatal(err)
	}
	if ownerScopes != 1 {
		t.Fatalf("control-panel creation committed %d active partner-owner scopes, want 1", ownerScopes)
	}
}
