package partner

import (
	"errors"
	"strconv"
	"testing"
	"time"
)

func TestPartnerTenantIsolationDB(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix
	legalIdentity := "TENANT-SHARED-" + suffix

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

	partnerA, err := CreatePartnerForTenant(db, tenantA, createInput("Tenant A Partner", "+967771"+suffix[len(suffix)-6:], "field-a"))
	if err != nil {
		t.Fatalf("create tenant A partner: %v", err)
	}
	partnerB, err := CreatePartnerForTenant(db, tenantB, createInput("Tenant B Partner", "+967772"+suffix[len(suffix)-6:], "field-b"))
	if err != nil {
		t.Fatalf("same legal identity must be valid in another tenant: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partners WHERE id IN ($1, $2)`, partnerA.ID, partnerB.ID)
	})

	listA, totalA, err := ListPartnersForTenant(db, tenantA, PartnerListQuery{Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	if totalA < 1 || !containsPartner(listA, partnerA.ID) || containsPartner(listA, partnerB.ID) {
		t.Fatalf("tenant A list leaked or omitted partners: total=%d list=%v", totalA, listA)
	}

	if _, err := GetPartnerForTenant(db, tenantA, partnerB.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-tenant partner read must be not found, got %v", err)
	}

	storeA := partnerStoreID(t, db, partnerA.ID)
	storeB := partnerStoreID(t, db, partnerB.ID)
	var partnerTenant, storeTenant string
	if err := db.QueryRow(`SELECT tenant_id FROM dsh_partners WHERE id = $1`, partnerA.ID).Scan(&partnerTenant); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT tenant_id FROM dsh_stores WHERE id = $1`, storeA).Scan(&storeTenant); err != nil {
		t.Fatal(err)
	}
	if partnerTenant != tenantA || storeTenant != tenantA {
		t.Fatalf("tenant ownership did not propagate: partner=%q store=%q", partnerTenant, storeTenant)
	}

	if _, err := LinkPartnerStoreForTenant(db, tenantA, partnerA.ID, storeB, "operator-a"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-tenant store link must be not found, got %v", err)
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
