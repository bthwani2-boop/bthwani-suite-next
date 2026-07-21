package cod

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/reference"
	"wlt-api/internal/wallet"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func insertTestCodRecord(t *testing.T, db *sql.DB) string {
	orderID := fmt.Sprintf("test-order-%d", time.Now().UnixNano())
	var id string
	err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, captain_id, collector_type, collector_id, partner_id, amount_minor_units, currency)
		VALUES ($1, 'captain-test', 'captain', 'captain-test', 'partner-test', 1000, 'YER')
		RETURNING id`, orderID).Scan(&id)
	if err != nil {
		t.Fatalf("failed to insert test COD record: %v", err)
	}
	return id
}

// TestMarkCodRemitted_BeforeCollected_Conflict verifies that a COD record
// still in 'pending_collection' cannot be remitted directly -- it must be
// collected first.
func TestMarkCodRemitted_BeforeCollected_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict remitting an uncollected record, got %v", err)
	}
}

// TestMarkCodCollected_Twice_Conflict verifies the second collect call on an
// already-collected record is rejected, not silently re-applied.
func TestMarkCodCollected_Twice_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("first collect should succeed, got error: %v", err)
	}
	if _, err := MarkCodCollected(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate collect, got %v", err)
	}
}

// TestMarkCodRemitted_Twice_Conflict verifies the second remit call on an
// already-remitted record is rejected.
func TestMarkCodRemitted_Twice_Conflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	id := insertTestCodRecord(t, db)

	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("collect should succeed, got error: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != nil {
		t.Fatalf("first remit should succeed, got error: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate remit, got %v", err)
	}
}

// TestListCommissions_ScopesByBeneficiaryTypeToo verifies that two
// beneficiaries sharing the same actor id but different actor types are not
// cross-leaked into each other's commission list.
func TestListCommissions_ScopesByBeneficiaryTypeToo(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sharedID := fmt.Sprintf("shared-actor-%d", time.Now().UnixNano())
	sourceID := fmt.Sprintf("source-%d", time.Now().UnixNano())

	if _, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   sharedID,
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceID:             sourceID,
		AmountMinorUnits:     500,
		Currency:             "YER",
		IdempotencyKey:       sourceID + "-captain",
	}); err != nil {
		t.Fatalf("failed to create captain commission: %v", err)
	}
	if _, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   sharedID,
		BeneficiaryActorType: "partner",
		SourceType:           "order",
		SourceID:             sourceID + "-2",
		AmountMinorUnits:     700,
		Currency:             "YER",
		IdempotencyKey:       sourceID + "-partner",
	}); err != nil {
		t.Fatalf("failed to create partner commission: %v", err)
	}

	captainCommissions, err := ListCommissions(db, "", sharedID, "captain")
	if err != nil {
		t.Fatalf("ListCommissions returned error: %v", err)
	}
	for _, c := range captainCommissions {
		if c.BeneficiaryActorType != "captain" {
			t.Fatalf("expected only captain commissions, got beneficiaryActorType=%q", c.BeneficiaryActorType)
		}
	}
	if len(captainCommissions) == 0 {
		t.Fatalf("expected at least one captain commission")
	}
}

// TestCreateCommission_FieldVisit_UsesPolicyAmount_AndCreditsWallet verifies
// that a field-visit commission ignores any caller-supplied amount/currency
// and instead resolves the amount from the seeded field_visit_fee policy
// (1000 minor units, YER), and that the beneficiary's wallet balances are
// credited by exactly that amount.
func TestCreateCommission_FieldVisit_UsesPolicyAmount_AndCreditsWallet(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())

	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		AmountMinorUnits:     999999, // should be ignored
		Currency:             "USD",  // should be ignored
		CommissionType:       "bogus_type",
		IdempotencyKey:       visitID,
	})
	if err != nil {
		t.Fatalf("expected field-visit commission create to succeed, got error: %v", err)
	}
	if c.AmountMinorUnits != 1000 {
		t.Fatalf("expected policy-derived amount 1000, got %d", c.AmountMinorUnits)
	}
	if c.Currency != "YER" {
		t.Fatalf("expected policy-derived currency YER, got %q", c.Currency)
	}
	if c.CommissionType != "field_visit_fee" {
		t.Fatalf("expected policy-derived commissionType field_visit_fee, got %q", c.CommissionType)
	}
	if c.CommissionPolicyID == nil || *c.CommissionPolicyID != "cpol_field_visit_standard" {
		t.Fatalf("expected commissionPolicyId to be set to the resolved policy, got %v", c.CommissionPolicyID)
	}

	w, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet returned error: %v", err)
	}
	if w == nil {
		t.Fatalf("expected wallet to have been created for field actor")
	}
	if w.PendingBalanceMinorUnits != 1000 {
		t.Fatalf("expected pendingBalanceMinorUnits=1000, got %d", w.PendingBalanceMinorUnits)
	}
	if w.EarnedTotalMinorUnits != 1000 {
		t.Fatalf("expected earnedTotalMinorUnits=1000, got %d", w.EarnedTotalMinorUnits)
	}
}

// TestCreateCommission_FieldVisit_Idempotent_DoesNotDoubleCreditWallet
// verifies that replaying the same idempotency key (as the DSH outbox
// worker would on retry) returns the original commission and does not
// increment the wallet balance a second time.
func TestCreateCommission_FieldVisit_Idempotent_DoesNotDoubleCreditWallet(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())
	input := CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	}

	first, err := CreateCommission(db, input)
	if err != nil {
		t.Fatalf("first create should succeed, got error: %v", err)
	}
	second, err := CreateCommission(db, input)
	if err != nil {
		t.Fatalf("second (replayed) create should succeed, got error: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected replayed create to return the same commission id, got %q vs %q", second.ID, first.ID)
	}

	w, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet returned error: %v", err)
	}
	if w == nil {
		t.Fatalf("expected wallet to have been created for field actor")
	}
	if w.PendingBalanceMinorUnits != 1000 {
		t.Fatalf("expected pendingBalanceMinorUnits=1000 after replay (not doubled), got %d", w.PendingBalanceMinorUnits)
	}
	if w.EarnedTotalMinorUnits != 1000 {
		t.Fatalf("expected earnedTotalMinorUnits=1000 after replay (not doubled), got %d", w.EarnedTotalMinorUnits)
	}
}

// TestCreateCommission_FieldVisit_NoActivePolicy_ReturnsError verifies that
// when no active field_visit_fee policy exists, commission creation fails
// with a clear domain error instead of silently falling back to a
// caller-supplied or zero amount.
func TestCreateCommission_FieldVisit_NoActivePolicy_ReturnsError(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	// Temporarily deactivate the seeded policy so no active
	// field_visit_fee policy exists, then restore it.
	if _, err := db.Exec(`UPDATE wlt_commission_policies SET status = 'inactive' WHERE commission_type = 'field_visit_fee' AND status = 'active'`); err != nil {
		t.Fatalf("failed to deactivate seeded policy: %v", err)
	}
	defer func() {
		if _, err := db.Exec(`UPDATE wlt_commission_policies SET status = 'active' WHERE id = 'cpol_field_visit_standard'`); err != nil {
			t.Fatalf("failed to restore seeded policy: %v", err)
		}
	}()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())

	_, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	})
	if !errors.Is(err, ErrNoActiveCommissionPolicy) {
		t.Fatalf("expected ErrNoActiveCommissionPolicy, got %v", err)
	}

	w, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet returned error: %v", err)
	}
	if w != nil {
		t.Fatalf("expected no wallet to have been created when commission creation fails, got %+v", w)
	}
}

// TestCreateCommission_NonFieldVisit_WalletUntouched verifies the existing
// checkout-linked / caller-supplied-amount commission path is unaffected by
// this change: the amount is unchanged and the wallet is not touched.
func TestCreateCommission_NonFieldVisit_WalletUntouched(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	captainID := fmt.Sprintf("captain-actor-%d", time.Now().UnixNano())
	sourceID := fmt.Sprintf("order-%d", time.Now().UnixNano())

	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   captainID,
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceID:             sourceID,
		AmountMinorUnits:     750,
		Currency:             "YER",
		IdempotencyKey:       sourceID,
	})
	if err != nil {
		t.Fatalf("expected non-field-visit commission create to succeed, got error: %v", err)
	}
	if c.AmountMinorUnits != 750 {
		t.Fatalf("expected caller-supplied amount 750 to be preserved, got %d", c.AmountMinorUnits)
	}
	if c.CommissionPolicyID != nil {
		t.Fatalf("expected commissionPolicyId to be nil for non-field-visit commission, got %v", *c.CommissionPolicyID)
	}

	w, err := wallet.GetWallet(db, "captain", captainID)
	if err != nil {
		t.Fatalf("GetWallet returned error: %v", err)
	}
	if w != nil {
		t.Fatalf("expected no wallet to be created/touched for non-field-visit commission, got %+v", w)
	}
}

func TestCreateCodRecordUsesWltSessionAndCollectorIdentity(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	checkoutIntentID := fmt.Sprintf("checkout-cod-%d", time.Now().UnixNano())
	orderID := fmt.Sprintf("order-cod-%d", time.Now().UnixNano())
	if _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		TenantID:         "tenant-cod-test",
		ClientID:         "client-cod-test",
		StoreID:          "store-cod-test",
		PaymentMethod:    "cod",
		AmountMinorUnits: 432100,
		Currency:         "YER",
		CartSnapshotHash: "cod-custody-test-snapshot",
		IdempotencyKey:   "cod-session-" + checkoutIntentID,
		CorrelationID:    "cod-session-" + checkoutIntentID,
	}); err != nil {
		t.Fatalf("create governed COD payment session: %v", err)
	}
	input := CreateCodRecordInput{OrderID: orderID, CollectorType: "store_courier", CollectorID: "courier-cod-test", PartnerID: "partner-cod-test", CheckoutIntentID: checkoutIntentID}
	first, err := CreateCodRecord(db, input)
	if err != nil {
		t.Fatalf("create COD custody: %v", err)
	}
	second, err := CreateCodRecord(db, input)
	if err != nil {
		t.Fatalf("replay COD custody: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected idempotent replay, got %s and %s", first.ID, second.ID)
	}
	if first.AmountMinorUnits != 432100 || first.Currency != "YER" {
		t.Fatalf("WLT session truth not used: %+v", first)
	}
	if first.CollectorType != "store_courier" || first.CollectorID != "courier-cod-test" || first.CaptainID != "" {
		t.Fatalf("collector identity mismatch: %+v", first)
	}
}

func TestCreateCodRecordRejectsNonCodSession(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	checkoutIntentID := fmt.Sprintf("checkout-wallet-%d", time.Now().UnixNano())
	if _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		TenantID:         "tenant-wallet-test",
		ClientID:         "client-wallet-test",
		StoreID:          "store-wallet-test",
		PaymentMethod:    "wallet",
		AmountMinorUnits: 1000,
		Currency:         "YER",
		CartSnapshotHash: "wallet-custody-test-snapshot",
		IdempotencyKey:   "wallet-session-" + checkoutIntentID,
		CorrelationID:    "wallet-session-" + checkoutIntentID,
	}); err != nil {
		t.Fatalf("create governed wallet payment session: %v", err)
	}
	_, err := CreateCodRecord(db, CreateCodRecordInput{OrderID: fmt.Sprintf("order-wallet-%d", time.Now().UnixNano()), CollectorType: "captain", CollectorID: "captain-wallet-test", PartnerID: "partner-wallet-test", CheckoutIntentID: checkoutIntentID})
	if err == nil {
		t.Fatal("expected non-COD payment session to be rejected")
	}
}
