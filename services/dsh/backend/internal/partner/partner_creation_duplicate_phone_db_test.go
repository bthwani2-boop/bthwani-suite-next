package partner

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestPartnerCreationRejectsDuplicatePrimaryPhoneWithinOperatorContextDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-j020-phone-" + suffix
	phone := "+9677" + suffix[len(suffix)-8:]
	base := CreatePartnerInput{
		LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ù‡Ø§ØªÙ Ø£ÙˆÙ„ " + suffix,
		DisplayName:         "Phone Owner A " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "J020-PHONE-A-" + suffix,
		PrimaryPhone:        phone,
		Category:            "restaurant",
		CreatedByActorID:    "field-j020-phone-" + suffix,
		CreatedBySurface:    "app-field",
	}
	created, _, err := CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		operatorContextID,
		"j020-phone-first-"+suffix,
		"",
		base,
	)
	if err != nil {
		t.Fatal(err)
	}
	registerPartnerFixtureCleanup(t, db, created.ID, partnerStoreID(t, db, created.ID))

	duplicate := base
	duplicate.LegalNameAr = "Ø´Ø±ÙŠÙƒ Ù‡Ø§ØªÙ Ø«Ø§Ù† " + suffix
	duplicate.DisplayName = "Phone Owner B " + suffix
	duplicate.LegalIdentityNumber = "J020-PHONE-B-" + suffix
	_, _, err = CreatePartnerForOperatorContextIdempotent(
		context.Background(),
		db,
		operatorContextID,
		"j020-phone-second-"+suffix,
		"",
		duplicate,
	)
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate primary phone = %v, want ErrConflict", err)
	}

	var count int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_partners
		WHERE operator_context_id = $1
		  AND btrim(primary_phone) = btrim($2)`, operatorContextID, phone,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("duplicate primary phone produced %d partner authorities, want 1", count)
	}
}
