package partner

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"dsh-api/internal/store"
)

func TestGovernedStoreTransferRejectsClosedPartnerStatesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-j024-" + suffix

	create := func(label string, phoneSuffix string) Partner {
		t.Helper()
		p, err := CreatePartnerForOperatorContext(db, operatorContextID, CreatePartnerInput{
			LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ù…Ù„ÙƒÙŠØ© " + label + " " + suffix,
			LegalNameEn:         "J024 ownership " + label + " " + suffix,
			DisplayName:         "J024 " + label + " " + suffix,
			LegalIdentityType:   "commercial_register",
			LegalIdentityNumber: "J024-" + label + "-" + suffix,
			PrimaryPhone:        "+9677" + suffix[len(suffix)-7:] + phoneSuffix,
			Category:            "restaurant",
			CreatedByActorID:    "field-j024-" + label + "-" + suffix,
			CreatedBySurface:    "app-field",
		})
		if err != nil {
			t.Fatal(err)
		}
		return p
	}

	source := create("source", "1")
	target := create("target", "2")
	sourceStore, err := store.GetStoreByPartnerID(db, source.ID)
	if err != nil || sourceStore == nil {
		t.Fatalf("load source store: row=%v err=%v", sourceStore, err)
	}
	originalVersion := sourceStore.Version

	for _, status := range []ActivationStatus{StatusOpsRejected, StatusPartnerSuspended, StatusPartnerTerminated} {
		if _, err := db.Exec(`
			UPDATE dsh_partners
			SET activation_status = $2, version = version + 1
			WHERE id = $1`, target.ID, status); err != nil {
			t.Fatal(err)
		}

		_, err = LinkPartnerStoreForOperatorContextGoverned(
			db,
			operatorContextID,
			target.ID,
			"operator-j024-reviewer",
			"correlation-j024-"+string(status)+"-"+suffix,
			GovernedStoreLinkInput{
				StoreID:              sourceStore.ID,
				Reason:               "governed ownership transfer attempt",
				ExpectedStoreVersion: originalVersion,
			},
		)
		if !errors.Is(err, ErrPartnerCannotOwnStore) {
			t.Fatalf("target status %s transfer error = %v, want ErrPartnerCannotOwnStore", status, err)
		}

		var ownerID string
		var version int
		if err := db.QueryRow(`SELECT partner_id, version FROM dsh_stores WHERE id = $1`, sourceStore.ID).Scan(&ownerID, &version); err != nil {
			t.Fatal(err)
		}
		if ownerID != source.ID || version != originalVersion {
			t.Fatalf("rejected transfer mutated store: owner=%s version=%d", ownerID, version)
		}
	}
}
