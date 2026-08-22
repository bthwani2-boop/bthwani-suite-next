package payout

import "time"

// PayoutRequest is the canonical stakeholder payout across partner, captain
// and field. Its lifecycle is the governed manual external settlement one:
// pending -> approved -> executed -> verified -> completed, with each
// transition owned by a different operator.
type PayoutRequest struct {
	ID                    string     `json:"id"`
	BeneficiaryActorID    string     `json:"beneficiaryActorId"`
	BeneficiaryActorType  string     `json:"beneficiaryActorType"`
	PayoutDestinationID   string     `json:"payoutDestinationId"`
	AmountMinorUnits      int64      `json:"amountMinorUnits"`
	Currency              string     `json:"currency"`
	Status                string     `json:"status"`
	ReconciliationStatus  string     `json:"reconciliationStatus"`
	RequestedAt           time.Time  `json:"requestedAt"`
	ApprovedAt            *time.Time `json:"approvedAt"`
	RejectedAt            *time.Time `json:"rejectedAt"`
	ExecutedAt            *time.Time `json:"executedAt"`
	VerifiedAt            *time.Time `json:"verifiedAt"`
	CompletedAt           *time.Time `json:"completedAt"`
	FailedAt              *time.Time `json:"failedAt"`
	FailureReason         string     `json:"failureReason"`
	OperatorID            string     `json:"operatorId"`
	ApprovedByOperatorID  string     `json:"approvedByOperatorId"`
	RejectedByOperatorID  string     `json:"rejectedByOperatorId"`
	ExecutedByOperatorID  string     `json:"executedByOperatorId"`
	VerifiedByOperatorID  string     `json:"verifiedByOperatorId"`
	CompletedByOperatorID string     `json:"completedByOperatorId"`
	FailedByOperatorID    string     `json:"failedByOperatorId"`
	IdempotencyKey        string     `json:"idempotencyKey"`
}

type PayoutRequestResponse struct {
	PayoutRequest *PayoutRequest `json:"payoutRequest"`
}

type PayoutRequestListResponse struct {
	PayoutRequests []*PayoutRequest `json:"payoutRequests"`
	Total          int              `json:"total"`
}
