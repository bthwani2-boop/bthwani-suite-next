package cod

import (
	"database/sql"
	"errors"
	"fmt"

	"wlt-api/internal/reference"
)

var ErrCodReferenceConflict = errors.New("existing COD record does not match delivery references")

// CreateCodRecordAtomic derives money only from WLT's payment session and uses
// the order_id uniqueness boundary as the idempotency authority. Concurrent
// delivery notifications either create one row or return that same row.
func CreateCodRecordAtomic(db *sql.DB, input CreateCodRecordInput) (*CodRecord, bool, error) {
	if input.OrderID == "" || input.CaptainID == "" || input.PartnerID == "" {
		return nil, false, fmt.Errorf("orderId, captainId, and partnerId are required")
	}
	if input.CheckoutIntentID == "" {
		return nil, false, fmt.Errorf("checkoutIntentId is required")
	}

	session, err := reference.GetPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
	if err != nil {
		return nil, false, err
	}
	if session == nil {
		return nil, false, fmt.Errorf("no WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
	}
	if session.PaymentMethod != "cod" {
		return nil, false, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
	}
	currency := session.Currency
	if currency == "" {
		currency = "YER"
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(`
		INSERT INTO wlt_cod_records
			(order_id, captain_id, partner_id, amount_minor_units, currency)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (order_id) DO NOTHING
		RETURNING `+codCols,
		input.OrderID,
		input.CaptainID,
		input.PartnerID,
		session.AmountMinorUnits,
		currency,
	)
	created, scanErr := scanCodRecord(row)
	if scanErr == nil {
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return created, true, nil
	}
	if !errors.Is(scanErr, sql.ErrNoRows) {
		return nil, false, scanErr
	}

	existing, err := scanCodRecord(tx.QueryRow(`
		SELECT `+codCols+`
		FROM wlt_cod_records
		WHERE order_id = $1
		FOR UPDATE`, input.OrderID))
	if err != nil {
		return nil, false, err
	}
	if existing.CaptainID != input.CaptainID ||
		existing.PartnerID != input.PartnerID ||
		existing.AmountMinorUnits != session.AmountMinorUnits ||
		existing.Currency != currency {
		return nil, false, ErrCodReferenceConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return existing, false, nil
}
