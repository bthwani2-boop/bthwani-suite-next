package cod

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/pricing"
	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

// seedClientWalletWithBalance credits a client wallet through the canonical
// opening-balance path so the ledger (not a direct wallet write) establishes
// the canonical balance the tender reservation is checked against.
func seedClientWalletWithBalance(t *testing.T, db *sql.DB, operatorContextID, clientID string, amount int64) {
	t.Helper()
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin wallet funding transaction: %v", err)
	}
	if _, err := ledger.PostOpeningBalance(ctx, tx, "client", clientID, "YER", amount,
		fmt.Sprintf("wallet-tender-opening-%d", time.Now().UnixNano()), ledger.Actor{ID: "system", Type: "system"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed client wallet: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit client wallet funding: %v", err)
	}
}

func walletBuckets(t *testing.T, db *sql.DB, operatorContextID, clientID string) (available, walletReserved int64) {
	t.Helper()
	if err := db.QueryRow(`
		SELECT available_balance_minor_units, wallet_reserved_balance_minor_units
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='client' AND actor_id=$2 AND currency='YER'`,
		operatorContextID, clientID).Scan(&available, &walletReserved); err != nil {
		t.Fatalf("read client wallet buckets: %v", err)
	}
	return available, walletReserved
}

func issueWalletTenderQuote(t *testing.T, db *sql.DB, operatorContextID, checkoutIntentID, clientID, storeID string, amount int64) string {
	t.Helper()
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", "wallet-tender-test-secret")
	evidence := pricing.PricingEvidence{
		Version:               1,
		Lines:                 []pricing.QuoteEvidenceLine{{MasterProductID: "product-wt", UnitPriceMinorUnits: amount - 1000, Currency: "YER"}},
		DeliveryFeeMinorUnits: 1000,
	}
	encoded, err := json.Marshal(evidence)
	if err != nil {
		t.Fatalf("encode pricing evidence: %v", err)
	}
	mac := hmac.New(sha256.New, []byte("wallet-tender-test-secret"))
	_, _ = mac.Write(encoded)
	evidence.Signature = hex.EncodeToString(mac.Sum(nil))
	quote, err := pricing.IssueCheckoutQuote(context.Background(), db, operatorContextID, pricing.CalculateQuoteRequest{
		CheckoutIntentID: checkoutIntentID,
		CartSnapshotHash: "cart-" + checkoutIntentID,
		ClientID:         clientID,
		StoreID:          storeID,
		Currency:         "YER",
		CartVersion:      1,
		Lines:            []pricing.QuoteInputLine{{MasterProductID: "product-wt", Quantity: 1}},
		PricingEvidence:  evidence,
	})
	if err != nil {
		t.Fatalf("issue canonical checkout quote: %v", err)
	}
	return quote.ID
}

// TestMixedTenderReservationHoldsWalletPart proves the wlt-960 reservation:
// creating a mixed session places a hold on the client wallet for the wallet
// part (reducing available), and the hold is visible in the reserved bucket.
func TestMixedTenderReservationHoldsWalletPart(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("op-wt-reserve-%d", time.Now().UnixNano())
	clientID := fmt.Sprintf("client-wt-%d", time.Now().UnixNano())
	seedClientWalletWithBalance(t, db, operatorContextID, clientID, 2000)

	checkoutIntentID := fmt.Sprintf("ci-wt-%d", time.Now().UnixNano())
	quoteID := issueWalletTenderQuote(t, db, operatorContextID, checkoutIntentID, clientID, "store-wt", 5000)
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		StoreID:           "store-wt",
		PaymentMethod:     "mixed",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quoteID,
		IdempotencyKey:    "idem-wt-1",
		CorrelationID:     "corr-wt-1",
	})
	if err != nil {
		t.Fatalf("CreatePaymentSession mixed: %v", err)
	}
	if session.TenderAllocation == nil || session.TenderAllocation.WalletAmountMinorUnits != 2000 {
		t.Fatalf("expected mixed tender to reserve the full wallet balance of 2000, got %#v", session.TenderAllocation)
	}

	available, reserved := walletBuckets(t, db, operatorContextID, clientID)
	if reserved != 2000 {
		t.Fatalf("expected wallet_reserved_balance_minor_units=2000 after mixed session create, got %d", reserved)
	}
	if available != 0 {
		t.Fatalf("expected available=0 after reserving the full balance, got %d", available)
	}
}

// TestSecondCheckoutCannotDoubleSpendReservedTender proves the reservation
// actually restricts spendability: a second session for the same client finds
// no available wallet balance and falls back to pure COD.
func TestSecondCheckoutCannotDoubleSpendReservedTender(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("op-wt-double-%d", time.Now().UnixNano())
	clientID := fmt.Sprintf("client-wt2-%d", time.Now().UnixNano())
	seedClientWalletWithBalance(t, db, operatorContextID, clientID, 2000)

	firstIntent := fmt.Sprintf("ci-wt-a-%d", time.Now().UnixNano())
	quoteA := issueWalletTenderQuote(t, db, operatorContextID, firstIntent, clientID, "store-wt", 5000)
	first, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID:  firstIntent,
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		StoreID:           "store-wt",
		PaymentMethod:     "mixed",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + firstIntent,
		PricingQuoteID:    quoteA,
		IdempotencyKey:    "idem-wt-a",
		CorrelationID:     "corr-wt-a",
	})
	if err != nil {
		t.Fatalf("first CreatePaymentSession: %v", err)
	}
	if first.TenderAllocation.WalletAmountMinorUnits != 2000 {
		t.Fatalf("first session must reserve 2000 from the wallet, got %#v", first.TenderAllocation)
	}

	secondIntent := fmt.Sprintf("ci-wt-b-%d", time.Now().UnixNano())
	quoteB := issueWalletTenderQuote(t, db, operatorContextID, secondIntent, clientID, "store-wt", 3000)
	second, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID:  secondIntent,
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		StoreID:           "store-wt",
		PaymentMethod:     "mixed",
		AmountMinorUnits:  3000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + secondIntent,
		PricingQuoteID:    quoteB,
		IdempotencyKey:    "idem-wt-b",
		CorrelationID:     "corr-wt-b",
	})
	if err != nil {
		t.Fatalf("second CreatePaymentSession: %v", err)
	}
	if second.TenderAllocation.WalletAmountMinorUnits != 0 || second.TenderAllocation.CashOnDeliveryAmountMinorUnits != 3000 {
		t.Fatalf("second session must not reuse the reserved balance, got %#v", second.TenderAllocation)
	}

	_, reserved := walletBuckets(t, db, operatorContextID, clientID)
	if reserved != 2000 {
		t.Fatalf("total reservation must stay at the actual balance 2000, got %d", reserved)
	}
}

// TestMixedFinalizationCollectsWalletTender proves the completion moment: a
// mixed order's COD finalization posts BOTH journals in one transaction —
// captain collection for the COD part and client wallet collection for the
// wallet part — and the session flip to cod_finalized releases the hold.
func TestMixedFinalizationCollectsWalletTender(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("op-wt-fin-%d", time.Now().UnixNano())
	clientID := fmt.Sprintf("client-wt3-%d", time.Now().UnixNano())
	captainID := fmt.Sprintf("captain-wt-%d", time.Now().UnixNano())
	orderID := fmt.Sprintf("order-wt-%d", time.Now().UnixNano())
	seedClientWalletWithBalance(t, db, operatorContextID, clientID, 2000)

	// The captain needs COD capacity for the 3000 cash part.
	captainCtx := shared.WithOperatorContext(context.Background(), operatorContextID)
	tx, err := db.BeginTx(captainCtx, nil)
	if err != nil {
		t.Fatalf("begin captain funding: %v", err)
	}
	if _, err := ledger.PostOpeningBalance(captainCtx, tx, "captain", captainID, "YER", 3000,
		fmt.Sprintf("captain-wt-opening-%d", time.Now().UnixNano()), ledger.Actor{ID: "system", Type: "system"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed captain wallet: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit captain funding: %v", err)
	}

	checkoutIntentID := fmt.Sprintf("ci-wt-fin-%d", time.Now().UnixNano())
	quoteID := issueWalletTenderQuote(t, db, operatorContextID, checkoutIntentID, clientID, "store-wt", 5000)
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		StoreID:           "store-wt",
		PaymentMethod:     "mixed",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quoteID,
		IdempotencyKey:    "idem-wt-fin",
		CorrelationID:     "corr-wt-fin",
	})
	if err != nil {
		t.Fatalf("CreatePaymentSession mixed: %v", err)
	}
	if session.TenderAllocation.WalletAmountMinorUnits != 2000 || session.TenderAllocation.CashOnDeliveryAmountMinorUnits != 3000 {
		t.Fatalf("unexpected tender allocation: %#v", session.TenderAllocation)
	}

	if _, _, err := ReserveCodCapacity(captainCtx, db, orderID, checkoutIntentID, captainID, 3000, "YER", "idem-wt-cod"); err != nil {
		t.Fatalf("ReserveCodCapacity: %v", err)
	}

	if _, replay, err := FinalizeCodReservation(captainCtx, db, orderID, checkoutIntentID); err != nil || replay {
		t.Fatalf("FinalizeCodReservation: replay=%v err=%v", replay, err)
	}

	var captainDebit, clientWalletDebit, platformCredit int64
	err = db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN a.account_type='wallet' AND a.actor_type='captain' AND l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN a.account_type='wallet' AND a.actor_type='client' AND a.actor_id=$2 AND l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN a.account_type='platform_payable' AND l.debit_credit='credit' THEN l.amount_minor_units ELSE 0 END),0)
		FROM wlt_ledger_transactions t
		JOIN wlt_ledger_lines l ON l.ledger_transaction_id=t.id AND l.operator_context_id=t.operator_context_id
		JOIN wlt_ledger_accounts a ON a.id=l.account_id AND a.operator_context_id=l.operator_context_id
		WHERE t.operator_context_id=$1
		  AND t.transaction_type IN ('cod_finalized','wallet_tender_collected')`,
		operatorContextID, clientID).Scan(&captainDebit, &clientWalletDebit, &platformCredit)
	if err != nil {
		t.Fatalf("read finalization journals: %v", err)
	}
	if captainDebit != 3000 {
		t.Fatalf("captain COD collection must be 3000, got %d", captainDebit)
	}
	if clientWalletDebit != 2000 {
		t.Fatalf("client wallet tender collection must be 2000, got %d", clientWalletDebit)
	}
	if platformCredit != 5000 {
		t.Fatalf("platform_payable must receive the full conserved total 5000, got %d", platformCredit)
	}

	available, reserved := walletBuckets(t, db, operatorContextID, clientID)
	if reserved != 0 {
		t.Fatalf("finalization must release the wallet tender hold, got reserved=%d", reserved)
	}
	if available != 0 {
		t.Fatalf("collected wallet part must no longer be spendable, got available=%d", available)
	}
}

// TestExpiredSessionReleasesWalletTenderHold proves the fail-safe: an expired
// session returns the held tender to the client's available balance.
func TestExpiredSessionReleasesWalletTenderHold(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("op-wt-exp-%d", time.Now().UnixNano())
	clientID := fmt.Sprintf("client-wt4-%d", time.Now().UnixNano())
	seedClientWalletWithBalance(t, db, operatorContextID, clientID, 2000)

	checkoutIntentID := fmt.Sprintf("ci-wt-exp-%d", time.Now().UnixNano())
	quoteID := issueWalletTenderQuote(t, db, operatorContextID, checkoutIntentID, clientID, "store-wt", 5000)
	if _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		StoreID:           "store-wt",
		PaymentMethod:     "mixed",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quoteID,
		IdempotencyKey:    "idem-wt-exp",
		CorrelationID:     "corr-wt-exp",
	}); err != nil {
		t.Fatalf("CreatePaymentSession mixed: %v", err)
	}

	if _, reserved := walletBuckets(t, db, operatorContextID, clientID); reserved != 2000 {
		t.Fatalf("expected hold of 2000 before expiry, got %d", reserved)
	}

	if _, err := db.Exec(`UPDATE wlt_payment_sessions SET status='expired', updated_at=NOW() WHERE checkout_intent_id=$1 AND operator_context_id=$2`, checkoutIntentID, operatorContextID); err != nil {
		t.Fatalf("expire session: %v", err)
	}
	// The projection refresh is deferred; commit boundary already passed for
	// the manual UPDATE, so refresh explicitly like the trigger would.
	if _, err := db.Exec(`SELECT wlt_refresh_wallet_projection($1, 'client', $2, 'YER')`, operatorContextID, clientID); err != nil {
		t.Fatalf("refresh wallet projection: %v", err)
	}

	available, reserved := walletBuckets(t, db, operatorContextID, clientID)
	if reserved != 0 {
		t.Fatalf("expiry must release the tender hold, got reserved=%d", reserved)
	}
	if available != 2000 {
		t.Fatalf("released tender must be spendable again, got available=%d", available)
	}
}
