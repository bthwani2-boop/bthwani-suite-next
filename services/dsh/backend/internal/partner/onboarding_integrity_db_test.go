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
		    masked_account_number = '*****1234'
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
	// Raw bank_account_number/bank_iban/payout_mobile_number columns were
	// dropped from dsh_partners entirely (dsh-963, D3 remediation) -- the
	// schema itself now guarantees no raw payout data can be persisted, so
	// only the WLT reference needs to be verified here.
	var reference string
	if err := db.QueryRow(`
		SELECT payout_destination_id
		FROM dsh_partners WHERE id = $1`, partner.ID,
	).Scan(&reference); err != nil {
		t.Fatal(err)
	}
	if reference != "wpd-governed-cache" {
		t.Fatalf("DSH did not persist the WLT payout reference: ref=%q", reference)
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

// TestPartnerRawPayoutColumnsStayDroppedDBIntegration locks the D3/dsh-963
// ownership boundary at the schema level: WLT is the sole owner of raw payout
// data, and DSH keeps only the reference plus masked display strings. A test
// that merely checks "we did not write raw values" passes again the moment
// someone re-adds the columns, so this asserts the columns themselves are
// absent -- the only form of the check that cannot be silently regressed.
func TestPartnerRawPayoutColumnsStayDroppedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	for _, column := range []string{"bank_account_number", "bank_iban", "payout_mobile_number"} {
		var present bool
		if err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public'
				  AND table_name = 'dsh_partners'
				  AND column_name = $1
			)`, column,
		).Scan(&present); err != nil {
			t.Fatal(err)
		}
		if present {
			t.Fatalf("dsh_partners.%s is back; raw payout data belongs to WLT only (see dsh-963)", column)
		}
	}
}
