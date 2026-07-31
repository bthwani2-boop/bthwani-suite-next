package partner

import (
	"errors"
	"strconv"
	"testing"
	"time"
)

func TestPartnerOperatorContextIsolationDB(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix
	legalIdentity := "OperatorContext-SHARED-" + suffix

	createInput := func(name, phone, actor string) CreatePartnerInput {
		return CreatePartnerInput{
			LegalNameAr:         name,
			LegalNameEn:         name,
			DisplayName:         name,
			LegalIdentityType:   "commercial_register",
			LegalIdentityNumber: legalIdentity,
			OwnerName:           name + " owner",
			PrimaryPhone:        phone,
			Category:            "grocery",
			CreatedByActorID:    actor,
			CreatedBySurface:    "app-field",
		}
	}

	partnerA, err := CreatePartnerForOperatorContext(db, OperatorContextA, createInput("OperatorContext A Partner", "+967771"+suffix[len(suffix)-6:], "field-a"))
	if err != nil {
		t.Fatalf("create OperatorContext A partner: %v", err)
	}
	partnerB, err := CreatePartnerForOperatorContext(db, OperatorContextB, createInput("OperatorContext B Partner", "+967772"+suffix[len(suffix)-6:], "field-b"))
	if err != nil {
		t.Fatalf("same legal identity must be valid in another OperatorContext: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partners WHERE id IN ($1, $2)`, partnerA.ID, partnerB.ID)
	})

	listA, totalA, err := ListPartnersForOperatorContext(db, OperatorContextA, PartnerListQuery{Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	if totalA < 1 || !containsPartner(listA, partnerA.ID) || containsPartner(listA, partnerB.ID) {
		t.Fatalf("OperatorContext A list leaked or omitted partners: total=%d list=%v", totalA, listA)
	}

	if _, err := GetPartnerForOperatorContext(db, OperatorContextA, partnerB.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-OperatorContext partner read must be not found, got %v", err)
	}

	storeA := partnerStoreID(t, db, partnerA.ID)
	storeB := partnerStoreID(t, db, partnerB.ID)
	var partnerOperatorContext, storeOperatorContext string
	if err := db.QueryRow(`SELECT operator_context_id FROM dsh_partners WHERE id = $1`, partnerA.ID).Scan(&partnerOperatorContext); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT operator_context_id FROM dsh_stores WHERE id = $1`, storeA).Scan(&storeOperatorContext); err != nil {
		t.Fatal(err)
	}
	if partnerOperatorContext != OperatorContextA || storeOperatorContext != OperatorContextA {
		t.Fatalf("OperatorContext ownership did not propagate: partner=%q store=%q", partnerOperatorContext, storeOperatorContext)
	}

	if _, err := LinkPartnerStoreForOperatorContext(db, OperatorContextA, partnerA.ID, storeB, "operator-a"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-OperatorContext store link must be not found, got %v", err)
	}
}

func containsPartner(partners []PartnerSummary, partnerID string) bool {
	for _, item := range partners {
		if item.ID == partnerID {
			return true
		}
	}
	return false
}
