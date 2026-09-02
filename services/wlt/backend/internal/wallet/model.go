package wallet

import "time"

type Wallet struct {
	ID                                   string    `json:"id"`
	ActorID                              string    `json:"actorId"`
	ActorType                            string    `json:"actorType"`
	Status                               string    `json:"status"`
	Currency                             string    `json:"currency"`
	AvailableBalanceMinorUnits           int64     `json:"availableBalanceMinorUnits"`
	PendingBalanceMinorUnits             int64     `json:"pendingBalanceMinorUnits"`
	HeldBalanceMinorUnits                int64     `json:"heldBalanceMinorUnits"`
	WalletReservedBalanceMinorUnits      int64     `json:"walletReservedBalanceMinorUnits"`
	CollateralReservedBalanceMinorUnits  int64     `json:"collateralReservedBalanceMinorUnits"`
	ProtectedMinimumCollateralMinorUnits int64     `json:"protectedMinimumCollateralMinorUnits"`
	ReleasableCollateralExcessMinorUnits int64     `json:"releasableCollateralExcessMinorUnits"`
	OutstandingDebtMinorUnits            int64     `json:"outstandingDebtMinorUnits"`
	ActiveCollateralPositionCount        int64     `json:"activeCollateralPositionCount"`
	EarnedTotalMinorUnits                int64     `json:"earnedTotalMinorUnits"`
	SettledTotalMinorUnits               int64     `json:"settledTotalMinorUnits"`
	PaidTotalMinorUnits                  int64     `json:"paidTotalMinorUnits"`
	LastLedgerEntryAt                    *string   `json:"lastLedgerEntryAt"`
	UpdatedAt                            time.Time `json:"updatedAt"`
}

type WalletResponse struct {
	Wallet *Wallet `json:"wallet"`
}
