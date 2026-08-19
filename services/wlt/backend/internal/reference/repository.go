package reference

import (
	"context"
	"database/sql"
	"fmt"

	"wlt-api/internal/shared"
)

func GetPaymentStatusRef(ctx context.Context, db *sql.DB, orderID string) (*PaymentStatusRef, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_payment_status_refs
		WHERE operator_context_id = $1 AND order_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRowContext(ctx, q, operatorContextID, orderID)
	var ref PaymentStatusRef
	err = row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get payment status ref: %w", err)
	}
	return &ref, nil
}

func GetSettlementStatusRef(ctx context.Context, db *sql.DB, orderID string) (*SettlementStatusRef, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_settlement_status_refs
		WHERE operator_context_id = $1 AND order_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRowContext(ctx, q, operatorContextID, orderID)
	var ref SettlementStatusRef
	err = row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get settlement status ref: %w", err)
	}
	return &ref, nil
}

func GetRefundStatusRef(ctx context.Context, db *sql.DB, orderID string) (*RefundStatusRef, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	const q = `
		SELECT id, order_id, status, updated_at
		FROM wlt_refund_status_refs
		WHERE operator_context_id = $1 AND order_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRowContext(ctx, q, operatorContextID, orderID)
	var ref RefundStatusRef
	err = row.Scan(&ref.ID, &ref.OrderID, &ref.Status, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get refund status ref: %w", err)
	}
	return &ref, nil
}

func GetWalletStatusRef(ctx context.Context, db *sql.DB, actorID, actorType string) (*WalletStatusRef, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	const q = `
		SELECT id, actor_id, actor_type, status, currency, updated_at
		FROM wlt_wallet_refs
		WHERE operator_context_id = $1 AND actor_id = $2 AND actor_type = $3
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRowContext(ctx, q, operatorContextID, actorID, actorType)
	var ref WalletStatusRef
	err = row.Scan(&ref.ID, &ref.ActorID, &ref.ActorType, &ref.Status, &ref.Currency, &ref.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet status ref: %w", err)
	}
	return &ref, nil
}

func GetFieldCommissionRef(ctx context.Context, db *sql.DB, partnerID string) (*FieldCommissionRef, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	const q = `
		SELECT id, partner_id, partner_name, amount_minor_units, currency, status, description, evidence_required, settled_at, created_at, updated_at
		FROM wlt_field_commission_refs
		WHERE operator_context_id = $1 AND partner_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRowContext(ctx, q, operatorContextID, partnerID)
	var ref FieldCommissionRef
	var settledAt sql.NullString
	err = row.Scan(
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
