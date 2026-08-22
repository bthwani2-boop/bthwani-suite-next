package payout

import (
	"database/sql"
)

// requestCols and scanPayoutRequest are the single row mapping for
// wlt_payout_requests. Every governed handler reads through them so the
// projection cannot drift between the create, approve, reject, execute,
// verify and complete paths.
const requestCols = `id, beneficiary_actor_id, beneficiary_actor_type, payout_destination_id, amount_minor_units, currency, status,
	requested_at, approved_at, rejected_at, executed_at, verified_at, completed_at, failed_at, failure_reason, operator_id,
	approved_by_operator_id, rejected_by_operator_id, executed_by_operator_id, verified_by_operator_id,
	completed_by_operator_id, failed_by_operator_id,
	idempotency_key`

func scanPayoutRequest(rows *sql.Rows) (*PayoutRequest, error) {
	var p PayoutRequest
	var approvedAt, rejectedAt, executedAt, verifiedAt, completedAt, failedAt sql.NullTime
	var failureReason, operatorID, idempotencyKey sql.NullString
	var approvedBy, rejectedBy, executedBy, verifiedBy, completedBy, failedBy sql.NullString

	err := rows.Scan(
		&p.ID, &p.BeneficiaryActorID, &p.BeneficiaryActorType, &p.PayoutDestinationID, &p.AmountMinorUnits, &p.Currency, &p.Status,
		&p.RequestedAt, &approvedAt, &rejectedAt, &executedAt, &verifiedAt, &completedAt, &failedAt,
		&failureReason, &operatorID,
		&approvedBy, &rejectedBy, &executedBy, &verifiedBy, &completedBy, &failedBy,
		&idempotencyKey,
	)
	if err != nil {
		return nil, err
	}

	if approvedAt.Valid {
		p.ApprovedAt = &approvedAt.Time
	}
	if rejectedAt.Valid {
		p.RejectedAt = &rejectedAt.Time
	}
	if executedAt.Valid {
		p.ExecutedAt = &executedAt.Time
	}
	if verifiedAt.Valid {
		p.VerifiedAt = &verifiedAt.Time
	}
	if completedAt.Valid {
		p.CompletedAt = &completedAt.Time
	}
	if failedAt.Valid {
		p.FailedAt = &failedAt.Time
	}
	p.FailureReason = failureReason.String
	p.OperatorID = operatorID.String
	p.ApprovedByOperatorID = approvedBy.String
	p.RejectedByOperatorID = rejectedBy.String
	p.ExecutedByOperatorID = executedBy.String
	p.VerifiedByOperatorID = verifiedBy.String
	p.CompletedByOperatorID = completedBy.String
	p.FailedByOperatorID = failedBy.String
	p.IdempotencyKey = idempotencyKey.String

	return &p, nil
}
