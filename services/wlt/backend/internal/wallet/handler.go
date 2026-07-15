package wallet

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

func HandleGetWallet(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorType := r.PathValue("actorType")
		actorID := r.PathValue("actorId")

		if actorType == "" || actorID == "" {
			shared.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "actorType and actorId are required")
			return
		}

		wallet, err := GetWallet(db, actorType, actorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to fetch wallet")
			return
		}
		if wallet == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "wallet not found")
			return
		}

		shared.SendJSON(w, http.StatusOK, WalletResponse{Wallet: wallet})
	}
}
