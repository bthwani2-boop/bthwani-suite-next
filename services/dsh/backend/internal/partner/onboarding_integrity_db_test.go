package partner

import (
	"context"
	"errors"
	"testing"
)

func TestLinkPartnerStoreGovernedRejectsReassignmentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	first := createPartnerFixture(t, db, "LINK-OWNER-A")
	second := createPartnerFixture(t, db, "LINK-OWNER-B")
	secondStoreID := partnerStoreID(t, db, second.ID)

	_, err := LinkPartnerStoreGoverned(context.Background(), db, first.ID, secondStoreID, "operator-local-001")
	if !errors.Is(err, ErrStoreOwnershipConflict) {
		t.Fatalf("expected store ownership conflict, got %v", err)
	}
	var owner string
	if err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1`, secondStoreID).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if owner != second.ID {
		t.Fatalf("store owner changed after rejected reassignment: got %q want %q", owner, second.ID)
	}
}

func TestGovernedSubmissionRequiresWltPayoutReferenceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partner := createPartnerFixture(t, db, "SUBMIT-PAYOUT")
	storeID := partnerStoreID(t, db, partner.ID)
	if _, err := db.Exec(`
		UPDATE dsh_stores
		SET city_code = 'SAN', service_area_code = 'SAN-1', address_line = 'Test address',
		    operating_hours = '08:00-22:00', delivery_readiness = 'ready'
		WHERE id = $1`, storeID); err != nil {
		t.Fatal(err)
	}

	_, _, err := TransitionStatusGoverned(context.Background(), db, partner.ID, TransitionInput{
		ToStatus: StatusSubmitted,
		ActorID: "field-local-001",
		ActorSurface: "app-field",
		IdempotencyKey: "submit-payout-required",
	}, partner.Version)
	if !errors.Is(err, ErrReadinessGate) {
		t.Fatalf("expected payout readiness gate, got %v", err)
	}
}

func TestGovernedTransitionReplaysSameEventDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partner := createPartnerFixture(t, db, "TRANSITION-REPLAY")
	storeID := partnerStoreID(t, db, partner.ID)
	if _, err := db.Exec(`
		UPDATE dsh_partners
		SET payout_destination_id = 'wpd-test-replay',
		    masked_account_number = '*****1234',
		    bank_account_number = '', bank_iban = '', payout_mobile_number = ''
		WHERE id = $1`, partner.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_stores
		SET city_code = 'SAN', service_area_code = 'SAN-1', address_line = 'Test address',
		    operating_hours = '08:00-22:00', delivery_readiness = 'ready'
		WHERE id = $1`, storeID); err != nil {
		t.Fatal(err)
	}
	input := TransitionInput{
		ToStatus: StatusSubmitted,
		Reason: "governed replay",
		ActorID: "field-local-001",
		ActorSurface: "app-field",
		IdempotencyKey: "partner-submit-replay-key",
		CorrelationID: "partner-submit-replay-correlation",
	}
	firstPartner, firstEvent, err := TransitionStatusGoverned(context.Background(), db, partner.ID, input, partner.Version)
	if err != nil {
		t.Fatal(err)
	}
	secondPartner, secondEvent, err := TransitionStatusGoverned(context.Background(), db, partner.ID, input, partner.Version)
	if err != nil {
		t.Fatal(err)
	}
	if firstEvent.ID != secondEvent.ID || firstPartner.Version != secondPartner.Version {
		t.Fatalf("transition retry did not replay the original result: first=%s/%d second=%s/%d", firstEvent.ID, firstPartner.Version, secondEvent.ID, secondPartner.Version)
	}
}

func TestUpdatePartnerGovernedPersistsOnlyWltReferenceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partner := createPartnerFixture(t, db, "PAYOUT-CACHE")
	holderMatches := true
	updated, err := UpdatePartnerGoverned(db, partner.ID, UpdatePartnerInput{
		DisplayName: partner.DisplayName,
		PayoutDestinationID: "wpd-governed-cache",
		MaskedAccountNumber: "*****4321",
		MaskedIBAN: "********8765",
		MaskedMobileNumber: "*******0002",
		BeneficiaryName: "Masked Owner",
		BankName: "Governed Bank",
		SettlementPreference: "bank_transfer",
		BankAccountHolderMatchesOwner: &holderMatches,
		BankAccountNumber: "must-not-persist",
		BankIBAN: "must-not-persist",
		PayoutMobileNumber: "must-not-persist",
	}, partner.Version)
	if err != nil {
		t.Fatal(err)
	}
	if updated.BankAccountNumber != "*****4321" {
		t.Fatalf("surface response did not use masked account value: %q", updated.BankAccountNumber)
	}
	var account, iban, mobile, reference string
	if err := db.QueryRow(`
		SELECT bank_account_number, bank_iban, payout_mobile_number, payout_destination_id
		FROM dsh_partners WHERE id = $1`, partner.ID,
	).Scan(&account, &iban, &mobile, &reference); err != nil {
		t.Fatal(err)
	}
	if account != "" || iban != "" || mobile != "" || reference != "wpd-governed-cache" {
		t.Fatalf("DSH persisted raw payout data: account=%q iban=%q mobile=%q ref=%q", account, iban, mobile, reference)
	}
}

func TestCreateFieldVisitGovernedBindsFirstStoreDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partner := createPartnerFixture(t, db, "VISIT-STORE")
	wantStoreID := partnerStoreID(t, db, partner.ID)
	visit, err := CreateFieldVisitGoverned(db, CreateFieldVisitInput{
		PartnerID: partner.ID,
		FieldActorID: "field-local-001",
		VisitNotes: "evidence-bearing visit",
	})
	if err != nil {
		t.Fatal(err)
	}
	if visit.StoreID != wantStoreID {
		t.Fatalf("field visit store = %q, want %q", visit.StoreID, wantStoreID)
	}
}
