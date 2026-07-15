package payout

import "time"

type PayoutRequest struct {
	ID                   string     `json:"id"`
	BeneficiaryActorID   string     `json:"beneficiaryActorId"`
	BeneficiaryActorType string     `json:"beneficiaryActorType"`
	AmountMinorUnits     int64      `json:"amountMinorUnits"`
	Currency             string     `json:"currency"`
	Status               string     `json:"status"`
	RequestedAt          time.Time  `json:"requestedAt"`
	ApprovedAt           *time.Time `json:"approvedAt"`
	RejectedAt           *time.Time `json:"rejectedAt"`
	ProcessedAt          *time.Time `json:"processedAt"`
	CompletedAt          *time.Time `json:"completedAt"`
	FailedAt             *time.Time `json:"failedAt"`
	FailureReason        string     `json:"failureReason"`
	OperatorID           string     `json:"operatorId"`
	IdempotencyKey       string     `json:"idempotencyKey"`
}

type CreatePayoutRequestInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Currency             string `json:"currency"`
	IdempotencyKey       string `json:"idempotencyKey"`
}

type PayoutRequestResponse struct {
	PayoutRequest *PayoutRequest `json:"payoutRequest"`
}

type PayoutRequestListResponse struct {
	PayoutRequests []*PayoutRequest `json:"payoutRequests"`
	Total          int              `json:"total"`
}
