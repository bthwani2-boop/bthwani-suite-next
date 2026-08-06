package payout

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

// makerCheckerEnforced reports whether the same operator is blocked from
// both approving and completing the same payout request. It defaults to
// disabled so single-operator dev/test environments (and any deployment
// where DSH does not yet plumb an authenticated operator id through) are not
// hard-blocked; production deployments should set
// WLT_MAKER_CHECKER_ENFORCED=true once operator identity is reliably passed.
func makerCheckerEnforced() bool {
	return os.Getenv("WLT_MAKER_CHECKER_ENFORCED") == "true"
}

// operatorIDFromRequest reads an optional operatorId from the JSON request
// body. An empty/missing value is tolerated (falls back to "unrecorded")
// rather than rejected, since not every caller has been updated to send one
// yet; maker/checker enforcement only actually blocks a transition when both
// the earlier and current operator ids are non-empty and equal.
func operatorIDFromRequest(r *http.Request) string {
	var body struct {
		OperatorID string `json:"operatorId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	return strings.TrimSpace(body.OperatorID)
}

// payloadHash computes a stable hash over the fields that define a payout
// request's financial intent, so a reused Idempotency-Key with a different
// payload can be detected instead of silently returning the earlier request.
func payloadHash(beneficiaryActorID, beneficiaryActorType string, amountMinorUnits int64, currency string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%d|%s", beneficiaryActorID, beneficiaryActorType, amountMinorUnits, currency)))
	return hex.EncodeToString(sum[:])
}

const requestCols = `id, beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status,
	requested_at, approved_at, rejected_at, processed_at, completed_at, failed_at, failure_reason, operator_id,
	approved_by_operator_id, rejected_by_operator_id, processed_by_operator_id, completed_by_operator_id, failed_by_operator_id,
	idempotency_key`

func scanPayoutRequest(rows *sql.Rows) (*PayoutRequest, error) {
	var p PayoutRequest
	var approvedAt, rejectedAt, processedAt, completedAt, failedAt sql.NullTime
	var failureReason, operatorID, idempotencyKey sql.NullString
	var approvedBy, rejectedBy, processedBy, completedBy, failedBy sql.NullString

	err := rows.Scan(
		&p.ID, &p.BeneficiaryActorID, &p.BeneficiaryActorType, &p.AmountMinorUnits, &p.Currency, &p.Status,
		&p.RequestedAt, &approvedAt, &rejectedAt, &processedAt, &completedAt, &failedAt,
		&failureReason, &operatorID,
		&approvedBy, &rejectedBy, &processedBy, &completedBy, &failedBy,
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
	if processedAt.Valid {
		p.ProcessedAt = &processedAt.Time
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
	p.ProcessedByOperatorID = processedBy.String
	p.CompletedByOperatorID = completedBy.String
	p.FailedByOperatorID = failedBy.String
	p.IdempotencyKey = idempotencyKey.String

	return &p, nil
}


