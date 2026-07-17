package reference

import (
	"database/sql"
	"fmt"
)

func GetPaymentStatusRef(db *sql.DB, orderID string) (*PaymentStatusRef, error) {
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_payment_status_refs
		WHERE order_id = $1
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, orderID)
	var ref PaymentStatusRef
	err := row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get payment status ref: %w", err)
	}
	return &ref, nil
}

func GetSettlementStatusRef(db *sql.DB, orderID string) (*SettlementStatusRef, error) {
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_settlement_status_refs
		WHERE order_id = $1
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, orderID)
	var ref SettlementStatusRef
	err := row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get settlement status ref: %w", err)
	}
	return &ref, nil
}

func GetRefundStatusRef(db *sql.DB, orderID string) (*RefundStatusRef, error) {
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_refund_status_refs
		WHERE order_id = $1
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, orderID)
	var ref RefundStatusRef
	err := row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get refund status ref: %w", err)
	}
	return &ref, nil
}

func GetWalletStatusRef(db *sql.DB, actorID, actorType string) (*WalletStatusRef, error) {
	const q = `
		SELECT id, actor_id, actor_type, status, currency, updated_at
		FROM wlt_wallet_refs
		WHERE actor_id = $1 AND actor_type = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, actorID, actorType)
	var ref WalletStatusRef
	err := row.Scan(&ref.ID, &ref.ActorID, &ref.ActorType, &ref.Status, &ref.Currency, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet status ref: %w", err)
	}
	return &ref, nil
}

func GetFieldCommissionRef(db *sql.DB, partnerID string) (*FieldCommissionRef, error) {
	const q = `
		SELECT id, partner_id, partner_name, amount_minor_units, currency, status, description, evidence_required, settled_at, created_at, updated_at
		FROM wlt_field_commission_refs
		WHERE partner_id = $1
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, partnerID)
	var ref FieldCommissionRef
	var settledAt sql.NullString
	err := row.Scan(
		&ref.ID,
		&ref.PartnerID,
		&ref.PartnerName,
		&ref.AmountMinorUnits,
		&ref.Currency,
		&ref.Status,
		&ref.Description,
		&ref.EvidenceRequired,
		&settledAt,
		&ref.CreatedAt,
		&ref.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get field commission ref: %w", err)
	}
	if settledAt.Valid {
		ref.SettledAt = &settledAt.String
	}
	return &ref, nil
}
