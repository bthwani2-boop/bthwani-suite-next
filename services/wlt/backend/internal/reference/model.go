package reference

type PaymentStatusRef struct {
	ID        string `json:"id"`
	OrderID   string `json:"orderId"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}

type SettlementStatusRef struct {
	ID        string `json:"id"`
	OrderID   string `json:"orderId"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}

type RefundStatusRef struct {
	ID        string `json:"id"`
	OrderID   string `json:"orderId"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}

type WalletStatusRef struct {
	ID        string `json:"id"`
	ActorID   string `json:"actorId"`
	ActorType string `json:"actorType"`
	Status    string `json:"status"`
	Currency  string `json:"currency"`
	UpdatedAt string `json:"updatedAt"`
}

type FieldCommissionRef struct {
	ID               string  `json:"id"`
	PartnerID        string  `json:"partnerId"`
	PartnerName      string  `json:"partnerName"`
	AmountMinorUnits int     `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	Description      string  `json:"description"`
	EvidenceRequired bool    `json:"evidenceRequired"`
	SettledAt        *string `json:"settledAt"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

