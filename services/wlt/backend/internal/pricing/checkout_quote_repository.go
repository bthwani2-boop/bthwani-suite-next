package pricing

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrCheckoutQuoteNotFound = errors.New("canonical checkout pricing quote not found")
	ErrCheckoutQuoteConflict = errors.New("canonical checkout pricing quote conflicts with the checkout handoff")
	ErrCheckoutQuoteExpired  = errors.New("canonical checkout pricing quote has expired")
)

// CheckoutQuote is the private, WLT-owned record used to authorize a payment
// session. It deliberately carries the scope and cart binding that no DSH
// request may choose at payment-session creation time.
type CheckoutQuote struct {
	WltPricingQuote
	OperatorContextID string
	CheckoutIntentID  string
	ClientID          string
	StoreID           string
	CartSnapshotHash  string
}

func checkoutAllocation(quote *WltPricingQuote) ([]AllocationLine, error) {
	lines := make([]AllocationLine, 0, 6)
	appendPositive := func(component AllocationComponent, amount int64) {
		if amount > 0 {
			lines = append(lines, AllocationLine{Component: component, AmountMinorUnits: amount})
		}
	}
	appendPositive(AllocationGoodsSubtotal, quote.SubtotalMinorUnits)
	appendPositive(AllocationDeliveryFee, quote.DeliveryFeeMinorUnits)
	appendPositive(AllocationServiceFee, quote.ServiceFeeMinorUnits)
	appendPositive(AllocationTax, quote.TaxMinorUnits)
	if quote.DiscountMinorUnits > 0 {
		lines = append(lines, AllocationLine{Component: AllocationDiscount, AmountMinorUnits: -quote.DiscountMinorUnits})
	}
	if quote.RoundingMinorUnits != 0 {
		return nil, fmt.Errorf("quote rounding requires an explicit payment allocation component")
	}
	if err := ValidatePaymentAllocation(lines, quote.TotalMinorUnits); err != nil {
		return nil, fmt.Errorf("derive quote allocation: %w", err)
	}
	return lines, nil
}

func requireCheckoutQuoteRequest(operatorContextID string, req CalculateQuoteRequest) error {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(req.CheckoutIntentID) == "" || strings.TrimSpace(req.CartSnapshotHash) == "" {
		return fmt.Errorf("operator context, checkoutIntentId and cartSnapshotHash are required to issue a checkout quote")
	}
	if req.CartVersion < 1 {
		return fmt.Errorf("cartVersion must be positive for a checkout quote")
	}
	return nil
}

// IssueCheckoutQuote writes the exact calculated quote once per scoped checkout
// intent. A retry gets the original immutable financial fact; a changed cart or
// price never silently replaces it.
func IssueCheckoutQuote(ctx context.Context, db *sql.DB, operatorContextID string, req CalculateQuoteRequest) (*CheckoutQuote, error) {
	if db == nil {
		return nil, fmt.Errorf("pricing quote database is required")
	}
	operatorContextID = strings.TrimSpace(operatorContextID)
	if err := requireCheckoutQuoteRequest(operatorContextID, req); err != nil {
		return nil, err
	}
	quote, err := CalculateQuote(req)
	if err != nil {
		return nil, err
	}
	allocation, err := checkoutAllocation(quote)
	if err != nil {
		return nil, err
	}
	linesJSON, err := json.Marshal(quote.Lines)
	if err != nil {
		return nil, fmt.Errorf("encode quote lines: %w", err)
	}
	allocationJSON, err := json.Marshal(allocation)
	if err != nil {
		return nil, fmt.Errorf("encode quote allocation: %w", err)
	}

	created, err := scanCheckoutQuote(db.QueryRowContext(ctx, `
		INSERT INTO wlt_checkout_pricing_quotes (
			operator_context_id, checkout_intent_id, client_id, store_id, cart_snapshot_hash,
			quote_hash, quote_version, expires_at, subtotal_minor_units, delivery_fee_minor_units,
			service_fee_minor_units, tax_minor_units, discount_minor_units, rounding_minor_units,
			total_minor_units, currency, lines, allocation)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb)
		ON CONFLICT (operator_context_id, checkout_intent_id) DO NOTHING
		RETURNING id, operator_context_id, checkout_intent_id, client_id, store_id, cart_snapshot_hash,
			quote_hash, quote_version, expires_at, subtotal_minor_units, delivery_fee_minor_units,
			service_fee_minor_units, tax_minor_units, discount_minor_units, rounding_minor_units,
			total_minor_units, currency, lines, allocation`,
		operatorContextID, strings.TrimSpace(req.CheckoutIntentID), strings.TrimSpace(req.ClientID), strings.TrimSpace(req.StoreID), strings.TrimSpace(req.CartSnapshotHash),
		quote.Hash, quote.Version, quote.ExpiresAt, quote.SubtotalMinorUnits, quote.DeliveryFeeMinorUnits,
		quote.ServiceFeeMinorUnits, quote.TaxMinorUnits, quote.DiscountMinorUnits, quote.RoundingMinorUnits,
		quote.TotalMinorUnits, quote.Currency, linesJSON, allocationJSON))
	if err == nil {
		return created, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	existing, err := loadCheckoutQuote(ctx, db, operatorContextID, strings.TrimSpace(req.CheckoutIntentID), "")
	if err != nil {
		return nil, err
	}
	if existing.ClientID != strings.TrimSpace(req.ClientID) || existing.StoreID != strings.TrimSpace(req.StoreID) ||
		existing.CartSnapshotHash != strings.TrimSpace(req.CartSnapshotHash) || existing.Hash != quote.Hash ||
		existing.Version != quote.Version || existing.TotalMinorUnits != quote.TotalMinorUnits || existing.Currency != quote.Currency {
		return nil, ErrCheckoutQuoteConflict
	}
	return existing, nil
}

func LoadCheckoutQuoteForSession(ctx context.Context, tx *sql.Tx, operatorContextID, quoteID string) (*CheckoutQuote, error) {
	if tx == nil || strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(quoteID) == "" {
		return nil, ErrCheckoutQuoteNotFound
	}
	quote, err := scanCheckoutQuote(tx.QueryRowContext(ctx, checkoutQuoteSelect+` WHERE operator_context_id=$1 AND id=$2 FOR SHARE`, strings.TrimSpace(operatorContextID), strings.TrimSpace(quoteID)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCheckoutQuoteNotFound
	}
	if err != nil {
		return nil, err
	}
	if quote.ExpiresAt == nil || !quote.ExpiresAt.After(time.Now().UTC()) {
		return nil, ErrCheckoutQuoteExpired
	}
	return quote, nil
}

// LoadCheckoutQuote is the readback used before comparing an idempotent
// request. The session creation transaction repeats this read under a lock.
func LoadCheckoutQuote(ctx context.Context, db *sql.DB, operatorContextID, quoteID string) (*CheckoutQuote, error) {
	if db == nil || strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(quoteID) == "" {
		return nil, ErrCheckoutQuoteNotFound
	}
	quote, err := loadCheckoutQuote(ctx, db, strings.TrimSpace(operatorContextID), "", strings.TrimSpace(quoteID))
	if err != nil {
		return nil, err
	}
	if quote.ExpiresAt == nil || !quote.ExpiresAt.After(time.Now().UTC()) {
		return nil, ErrCheckoutQuoteExpired
	}
	return quote, nil
}

func LoadCheckoutQuoteByIntent(ctx context.Context, db *sql.DB, operatorContextID, checkoutIntentID string) (*CheckoutQuote, error) {
	if db == nil || strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(checkoutIntentID) == "" {
		return nil, ErrCheckoutQuoteNotFound
	}
	quote, err := loadCheckoutQuote(ctx, db, strings.TrimSpace(operatorContextID), strings.TrimSpace(checkoutIntentID), "")
	if err != nil {
		return nil, err
	}
	if quote.ExpiresAt == nil || !quote.ExpiresAt.After(time.Now().UTC()) {
		return nil, ErrCheckoutQuoteExpired
	}
	return quote, nil
}

const checkoutQuoteSelect = `
	SELECT id, operator_context_id, checkout_intent_id, client_id, store_id, cart_snapshot_hash,
		quote_hash, quote_version, expires_at, subtotal_minor_units, delivery_fee_minor_units,
		service_fee_minor_units, tax_minor_units, discount_minor_units, rounding_minor_units,
		total_minor_units, currency, lines, allocation
	FROM wlt_checkout_pricing_quotes`

func loadCheckoutQuote(ctx context.Context, db *sql.DB, operatorContextID, checkoutIntentID, quoteID string) (*CheckoutQuote, error) {
	where := ` WHERE operator_context_id=$1 AND checkout_intent_id=$2`
	args := []any{operatorContextID, checkoutIntentID}
	if quoteID != "" {
		where = ` WHERE operator_context_id=$1 AND id=$2`
		args = []any{operatorContextID, quoteID}
	}
	quote, err := scanCheckoutQuote(db.QueryRowContext(ctx, checkoutQuoteSelect+where, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCheckoutQuoteNotFound
	}
	return quote, err
}

func scanCheckoutQuote(row interface{ Scan(...any) error }) (*CheckoutQuote, error) {
	var quote CheckoutQuote
	var linesJSON, allocationJSON []byte
	err := row.Scan(
		&quote.ID, &quote.OperatorContextID, &quote.CheckoutIntentID, &quote.ClientID, &quote.StoreID, &quote.CartSnapshotHash,
		&quote.Hash, &quote.Version, &quote.ExpiresAt, &quote.SubtotalMinorUnits, &quote.DeliveryFeeMinorUnits,
		&quote.ServiceFeeMinorUnits, &quote.TaxMinorUnits, &quote.DiscountMinorUnits, &quote.RoundingMinorUnits,
		&quote.TotalMinorUnits, &quote.Currency, &linesJSON, &allocationJSON,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(linesJSON, &quote.Lines); err != nil {
		return nil, fmt.Errorf("decode quote lines: %w", err)
	}
	if err := json.Unmarshal(allocationJSON, &quote.Allocation); err != nil {
		return nil, fmt.Errorf("decode quote allocation: %w", err)
	}
	quote.WltPricingQuote.CartSnapshotHash = quote.CartSnapshotHash
	return &quote, nil
}
