package wallet

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

var supportedRepresentativeActorTypes = map[string]struct{}{
	"client":  {},
	"partner": {},
	"captain": {},
	"field":   {},
}

func normalizeRepresentativeActorType(value string) (string, bool) {
	actorType := strings.ToLower(strings.TrimSpace(value))
	_, ok := supportedRepresentativeActorTypes[actorType]
	return actorType, ok
}

func HandleGetWallet(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorType, ok := normalizeRepresentativeActorType(r.PathValue("actorType"))
		actorID := strings.TrimSpace(r.PathValue("actorId"))

		if !ok {
			shared.SendError(w, http.StatusBadRequest, "UNSUPPORTED_ACTOR_TYPE", "actorType must be client, partner, captain, or field")
			return
		}
		if actorID == "" || len(actorID) > 200 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_ACTOR_ID", "actorId is required and must not exceed 200 characters")
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

		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		shared.SendJSON(w, http.StatusOK, WalletResponse{Wallet: wallet})
	}
}
