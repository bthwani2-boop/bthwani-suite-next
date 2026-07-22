package payout

import "time"

type PayoutRequest struct {
	ID                       string     `json:"id"`
	BeneficiaryActorID       string     `json:"beneficiaryActorId"`
	BeneficiaryActorType     string     `json:"beneficiaryActorType"`
	PayoutDestinationID      string     `json:"payoutDestinationId"`
	AmountMinorUnits         int64      `json:"amountMinorUnits"`
	Currency                 string     `json:"currency"`
	Status                   string     `json:"status"`
	ReconciliationStatus     string     `json:"reconciliationStatus"`
	RequestedAt              time.Time  `json:"requestedAt"`
	ApprovedAt               *time.Time `json:"approvedAt"`
	RejectedAt               *time.Time `json:"rejectedAt"`
	ProcessedAt              *time.Time `json:"processedAt"`
	CompletedAt              *time.Time `json:"completedAt"`
	FailedAt                 *time.Time `json:"failedAt"`
	ReconciledAt             *time.Time `json:"reconciledAt"`
	FailureReason            string     `json:"failureReason"`
	OperatorID               string     `json:"operatorId"`
	ApprovedByOperatorID     string     `json:"approvedByOperatorId"`
	RejectedByOperatorID     string     `json:"rejectedByOperatorId"`
	ProcessedByOperatorID    string     `json:"processedByOperatorId"`
	CompletedByOperatorID    string     `json:"completedByOperatorId"`
	FailedByOperatorID       string     `json:"failedByOperatorId"`
	ReconciledByOperatorID   string     `json:"reconciledByOperatorId"`
	ProviderReference        string     `json:"providerReference"`
	ProviderStatus           string     `json:"providerStatus"`
	ProviderProcessedAt      *time.Time `json:"providerProcessedAt"`
	IdempotencyKey           string     `json:"idempotencyKey"`
}

type CreatePayoutRequestInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	PayoutDestinationID string `json:"payoutDestinationId"`
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
