package testsupport

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// CheckoutPaymentSession is the complete persisted truth required for a
// checkout payment-session fixture. Tests must not manufacture a checkout
// session without first creating its immutable WLT quote.
type CheckoutPaymentSession struct {
	OperatorContextID              string
	CheckoutIntentID               string
	ClientID                       string
	StoreID                        string
	PaymentMethod                  string
	Status                         string
	ProviderReference              string
	AmountMinorUnits               int64
	WalletAmountMinorUnits         int64
	CashOnDeliveryAmountMinorUnits int64
	Currency                       string
	FinancialPurpose               string
	CapturedAt                     *time.Time
}

// SeedCanonicalCheckoutPaymentSession creates the immutable checkout quote and
// the session bound to it. It intentionally uses the same database invariant
// as production writes, so fixture data cannot conceal a broken quote binding.
func SeedCanonicalCheckoutPaymentSession(ctx context.Context, db *sql.DB, input CheckoutPaymentSession) (string, error) {
	if db == nil || strings.TrimSpace(input.OperatorContextID) == "" || strings.TrimSpace(input.CheckoutIntentID) == "" ||
		strings.TrimSpace(input.ClientID) == "" || strings.TrimSpace(input.StoreID) == "" ||
		strings.TrimSpace(input.PaymentMethod) == "" || strings.TrimSpace(input.Status) == "" ||
		strings.TrimSpace(input.Currency) == "" || strings.TrimSpace(input.FinancialPurpose) == "" || input.AmountMinorUnits <= 0 {
		return "", fmt.Errorf("invalid canonical checkout payment-session fixture")
	}

	fixtureID := UniqueID("checkout-fixture")
	cartSnapshotHash := "fixture-cart-" + fixtureID
	quoteHash := "fixture-quote-" + fixtureID
	quoteID := "fixture-wlpq-" + fixtureID
	expiresAt := time.Now().UTC().Add(time.Hour)
	walletAmount := input.WalletAmountMinorUnits
	cashOnDeliveryAmount := input.CashOnDeliveryAmountMinorUnits
	switch input.PaymentMethod {
	case "cod":
		walletAmount = 0
		cashOnDeliveryAmount = input.AmountMinorUnits
	case "wallet":
		walletAmount = input.AmountMinorUnits
		cashOnDeliveryAmount = 0
	case "mixed":
		if walletAmount < 0 || cashOnDeliveryAmount < 0 || walletAmount+cashOnDeliveryAmount != input.AmountMinorUnits {
			return "", fmt.Errorf("mixed checkout fixture tender allocation must conserve the session amount")
		}
	default:
		return "", fmt.Errorf("unsupported checkout fixture payment method %q", input.PaymentMethod)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_checkout_pricing_quotes (
			id, operator_context_id, checkout_intent_id, client_id, store_id,
			cart_snapshot_hash, quote_hash, quote_version, expires_at,
			subtotal_minor_units, delivery_fee_minor_units, service_fee_minor_units,
			tax_minor_units, discount_minor_units, rounding_minor_units,
			total_minor_units, currency, lines, allocation
		) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,0,0,0,0,0,$9,$10,'[]'::jsonb,'[]'::jsonb)`,
		quoteID, input.OperatorContextID, input.CheckoutIntentID, input.ClientID, input.StoreID,
		cartSnapshotHash, quoteHash, expiresAt, input.AmountMinorUnits, input.Currency,
	); err != nil {
		return "", fmt.Errorf("seed canonical checkout quote: %w", err)
	}

	var sessionID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions (
			operator_context_id, checkout_intent_id, client_id, store_id,
			cart_snapshot_hash, pricing_quote_id, pricing_quote_hash,
			pricing_quote_version, pricing_quote_expires_at, payment_method, status,
			provider_reference, amount_minor_units, currency,
			wallet_amount_minor_units, cash_on_delivery_amount_minor_units,
			captured_at, financial_purpose
		) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING id`,
		input.OperatorContextID, input.CheckoutIntentID, input.ClientID, input.StoreID,
		cartSnapshotHash, quoteID, quoteHash, expiresAt, input.PaymentMethod, input.Status,
		input.ProviderReference, input.AmountMinorUnits, input.Currency,
		walletAmount, cashOnDeliveryAmount, input.CapturedAt, input.FinancialPurpose,
	).Scan(&sessionID)
	if err != nil {
		return "", fmt.Errorf("seed canonical checkout payment session: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return sessionID, nil
}
