package payout

import (
	"fmt"
	"net/http"
	"testing"
	"time"
)

// These tests exercise the destination lifecycle against a real database
// because every invariant they assert is enforced by a constraint, an index or
// a transactional read -- none of them can be proven in memory.

func destinationTestContext(t *testing.T) (string, string, func()) {
	t.Helper()
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "ctx-destination-" + suffix
	actorID := "field-destination-" + suffix
	return operatorContextID, actorID, func() {}
}

func TestDestinationUpsertRejectsUnregisteredProvider(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "destination-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })

	// No provider is seeded, so the governed registry is empty for this
	// context and every destination must fail closed.
	_, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "1234567890", "unregistered-"+operatorContextID, "corr-unregistered")
	if code != http.StatusBadRequest {
		t.Fatalf("expected an unregistered provider to be rejected, got %d", code)
	}
}

func TestDestinationMaterialChangeOpensNewUnverifiedVersion(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "destination-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	seedOfficialWalletProvider(t, db, operatorContextID)

	first, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "1234567890", "v1-"+operatorContextID, "corr-v1")
	if code != http.StatusCreated {
		t.Fatalf("first upsert returned %d", code)
	}
	if first.DestinationVersion != 1 {
		t.Fatalf("first destination version must be 1, got %d", first.DestinationVersion)
	}
	if verifyCode := verifyOfficialWalletDestination(t, db, operatorContextID, actorID, first.DestinationVersion, verificationVerified, "finance-operator"); verifyCode != http.StatusOK {
		t.Fatalf("verification returned %d", verifyCode)
	}

	// Re-sending the identical material identity must not open a new version
	// and must not discard the verification already granted.
	same, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "1234567890", "v1-repeat-"+operatorContextID, "corr-v1-repeat")
	if code != http.StatusOK {
		t.Fatalf("unchanged upsert returned %d, expected 200", code)
	}
	if same.ID != first.ID || same.DestinationVersion != 1 {
		t.Fatalf("unchanged upsert must reuse version 1, got id=%s version=%d", same.ID, same.DestinationVersion)
	}
	if same.DestinationVerificationStatus != verificationVerified {
		t.Fatalf("unchanged upsert must preserve verification, got %q", same.DestinationVerificationStatus)
	}

	// Changing the reference is a different destination, so it must open a new
	// version that starts unverified.
	changed, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "9876543210", "v2-"+operatorContextID, "corr-v2")
	if code != http.StatusCreated {
		t.Fatalf("changed upsert returned %d", code)
	}
	if changed.DestinationVersion != 2 {
		t.Fatalf("changed destination must open version 2, got %d", changed.DestinationVersion)
	}
	if changed.DestinationVerificationStatus != verificationUnverified {
		t.Fatalf("changed destination must require re-verification, got %q", changed.DestinationVerificationStatus)
	}
	if changed.MaskedDestinationReference == "9876543210" {
		t.Fatal("destination reference must never be returned unmasked")
	}

	// The superseded version must remain readable for audit while inactive.
	var activeCount int
	if err := db.QueryRow(`SELECT count(*) FROM wlt_payout_destinations
		WHERE operator_context_id=$1 AND owner_actor_id=$2 AND active=true`, operatorContextID, actorID).Scan(&activeCount); err != nil {
		t.Fatal(err)
	}
	if activeCount != 1 {
		t.Fatalf("exactly one destination version may be active, got %d", activeCount)
	}
	var totalCount int
	if err := db.QueryRow(`SELECT count(*) FROM wlt_payout_destinations
		WHERE operator_context_id=$1 AND owner_actor_id=$2`, operatorContextID, actorID).Scan(&totalCount); err != nil {
		t.Fatal(err)
	}
	if totalCount != 2 {
		t.Fatalf("the superseded version must be preserved, got %d rows", totalCount)
	}
}

func TestDestinationVerificationRejectsSupersededVersionAndSelfApproval(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "destination-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	seedOfficialWalletProvider(t, db, operatorContextID)

	first, _ := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "1111111111", "sv1-"+operatorContextID, "corr-sv1")

	// The beneficiary cannot verify its own destination.
	if code := verifyOfficialWalletDestination(t, db, operatorContextID, actorID, first.DestinationVersion, verificationVerified, actorID); code != http.StatusForbidden {
		t.Fatalf("expected self-verification to be forbidden, got %d", code)
	}

	// Superseding the version must invalidate a decision aimed at the old one.
	if _, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "2222222222", "sv2-"+operatorContextID, "corr-sv2"); code != http.StatusCreated {
		t.Fatalf("second upsert returned %d", code)
	}
	if code := verifyOfficialWalletDestination(t, db, operatorContextID, actorID, first.DestinationVersion, verificationVerified, "finance-operator"); code != http.StatusConflict {
		t.Fatalf("expected a superseded version to be refused, got %d", code)
	}
}

func TestPayoutRequestRejectsUnverifiedDestination(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "destination-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	seedOfficialWalletProvider(t, db, operatorContextID)

	const initialBalance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, initialBalance)

	destination, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "3333333333", "unv-"+operatorContextID, "corr-unv")
	if code != http.StatusCreated {
		t.Fatalf("upsert returned %d", code)
	}

	res := executePayoutCreate(t, db, operatorContextID, actorID, destination.ID, "unverified-payout-"+operatorContextID, 25000)
	if res.Code != http.StatusConflict {
		t.Fatalf("expected an unverified destination to block the payout request, got %d: %s", res.Code, res.Body.String())
	}

	// A blocked request must not have held any of the beneficiary's funds.
	var available, held int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &held); err != nil {
		t.Fatal(err)
	}
	if available != initialBalance || held != 0 {
		t.Fatalf("rejected payout must not hold funds: available=%d held=%d", available, held)
	}
}

func cleanupDestinationContext(t *testing.T, operatorContextID, actorID string) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	for _, statement := range []string{
		`DELETE FROM wlt_payout_four_way_reconciliations WHERE operator_context_id=$1`,
		`DELETE FROM wlt_external_provider_statement_lines WHERE operator_context_id=$1`,
		`DELETE FROM wlt_external_provider_statements WHERE operator_context_id=$1`,
		`DELETE FROM wlt_external_provider_accounts WHERE operator_context_id=$1`,
		`DELETE FROM wlt_payout_audit_events WHERE operator_context_id=$1`,
		`DELETE FROM wlt_approved_payout_snapshots WHERE operator_context_id=$1`,
		`DELETE FROM wlt_payout_requests WHERE operator_context_id=$1`,
		`DELETE FROM wlt_payout_destination_requests WHERE operator_context_id=$1`,
		`DELETE FROM wlt_payout_destinations WHERE operator_context_id=$1`,
		`DELETE FROM wlt_official_wallet_providers WHERE operator_context_id=$1`,
	} {
		_, _ = db.Exec(statement, operatorContextID)
	}
	_, _ = db.Exec(`DELETE FROM wlt_wallets WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID)
}
