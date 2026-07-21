package partner

import (
	"database/sql"
	"errors"
	"net/http"
)

func HandleGovernedPartnerMeStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := storeIDFromContext(r)
		if storeID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no governed store context")
			return
		}
		var partnerID sql.NullString
		if err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&partnerID); errors.Is(err, sql.ErrNoRows) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		} else if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve partner store")
			return
		}
		if !partnerID.Valid || partnerID.String == "" {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "no partner linked to this store")
			return
		}
		p, err := GetPartner(db, partnerID.String)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner state")
			return
		}
		sendJSON(w, http.StatusOK, BuildPartnerStateView(p, "app-partner"))
	}
}
