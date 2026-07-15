package wallet

import "time"

type Wallet struct {
	ID                         string    `json:"id"`
	ActorID                    string    `json:"actorId"`
	ActorType                  string    `json:"actorType"`
	Status                     string    `json:"status"`
	Currency                   string    `json:"currency"`
	AvailableBalanceMinorUnits int64     `json:"availableBalanceMinorUnits"`
	PendingBalanceMinorUnits   int64     `json:"pendingBalanceMinorUnits"`
	HeldBalanceMinorUnits      int64     `json:"heldBalanceMinorUnits"`
	EarnedTotalMinorUnits      int64     `json:"earnedTotalMinorUnits"`
	SettledTotalMinorUnits     int64     `json:"settledTotalMinorUnits"`
	PaidTotalMinorUnits        int64     `json:"paidTotalMinorUnits"`
	LastLedgerEntryAt          *string   `json:"lastLedgerEntryAt"`
	UpdatedAt                  time.Time `json:"updatedAt"`
}

type WalletResponse struct {
	Wallet *Wallet `json:"wallet"`
}
