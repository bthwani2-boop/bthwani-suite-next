package cod

import (
	"database/sql"
	"errors"
)

type Commission struct {
	ID                   string  `json:"id"`
	BeneficiaryActorID   string  `json:"beneficiaryActorId"`
	BeneficiaryActorType string  `json:"beneficiaryActorType"`
	SourceType           string  `json:"sourceType"`
	SourceID             string  `json:"sourceId"`
	VisitID              *string `json:"visitId"`
	StoreID              *string `json:"storeId"`
	CommissionPolicyID   *string `json:"commissionPolicyId"`
	CommissionType       string  `json:"commissionType"`
	AmountMinorUnits     int64   `json:"amountMinorUnits"`
	Currency             string  `json:"currency"`
	Status               string  `json:"status"`
	SettledAt            *string `json:"settledAt"`
	ConfirmedAt          *string `json:"confirmedAt"`
	RejectedAt           *string `json:"rejectedAt"`
	ReversedAt           *string `json:"reversedAt"`
	ResolutionNote       string  `json:"resolutionNote"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
}

const commissionCols = `id, beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, visit_id, store_id, commission_policy_id, commission_type,
	amount_minor_units, currency, status, settled_at, confirmed_at, rejected_at, reversed_at, resolution_note, created_at, updated_at`

func scanCommission(row *sql.Row) (*Commission, error) {
	var c Commission
	var resolutionNote sql.NullString
	err := row.Scan(
		&c.ID, &c.BeneficiaryActorID, &c.BeneficiaryActorType,
		&c.SourceType, &c.SourceID, &c.VisitID, &c.StoreID, &c.CommissionPolicyID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.ConfirmedAt, &c.RejectedAt, &c.ReversedAt, &resolutionNote,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.ResolutionNote = resolutionNote.String
	return &c, nil
}

func scanCommissionRow(rows *sql.Rows) (*Commission, error) {
	var c Commission
	var resolutionNote sql.NullString
	err := rows.Scan(
		&c.ID, &c.BeneficiaryActorID, &c.BeneficiaryActorType,
		&c.SourceType, &c.SourceID, &c.VisitID, &c.StoreID, &c.CommissionPolicyID,
		&c.CommissionType, &c.AmountMinorUnits, &c.Currency,
		&c.Status, &c.SettledAt, &c.ConfirmedAt, &c.RejectedAt, &c.ReversedAt, &resolutionNote,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.ResolutionNote = resolutionNote.String
	return &c, nil
}

// ErrUnsupportedCommissionCalculation is returned when an active policy is
// found but its calculation_type isn't one we know how to apply yet (only
// 'fixed' is implemented). Guessing a percentage/tiered formula here would
// silently mis-pay a real person, so we reject instead.
var ErrUnsupportedCommissionCalculation = errors.New("commission policy calculation_type is not supported")

// ErrCommissionNotInExpectedState is returned by the commission lifecycle
// transitions when the commission's current status is not one of the
// caller's allowed source statuses.
var ErrCommissionNotInExpectedState = errors.New("commission is not in the expected state for this transition")
