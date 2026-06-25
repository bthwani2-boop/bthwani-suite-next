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
