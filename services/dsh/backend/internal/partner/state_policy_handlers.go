package partner

import (
	"database/sql"
	"errors"
	"net/http"
)

func HandleGovernedGetPartnerState(db *sql.DB, surface string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, err := GetPartner(db, partnerIDFromPath(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner state")
			return
		}
		sendJSON(w, http.StatusOK, BuildPartnerStateView(p, surface))
	}
}

func HandleGovernedFieldGetPartnerState(db *sql.DB) http.HandlerFunc {
	inner := HandleGovernedGetPartnerState(db, "app-field")
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		if !requireFieldOwnsPartner(w, db, r, partnerIDFromPath(r), actorID) {
			return
		}
		inner(w, r)
	}
}

func HandleGovernedPartnerMeStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := partnerIDFromContext(r)
		if partnerID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no governed partner context")
			return
		}
		p, err := GetPartner(db, partnerID)
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
