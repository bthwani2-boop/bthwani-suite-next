package payout

import (
	"database/sql"
	"net/http"
)

func adaptLegacyPartnerDestinationPath(r *http.Request) {
	r.SetPathValue("actorType", "partner")
	r.SetPathValue("actorId", r.PathValue("partnerId"))
}

// HandleUpsertPartnerPayoutDestinationJRN037 preserves the historical partner
// URL while enforcing the exact typed owner, encryption, audit and active-row
// invariants used by current partner, captain and field routes.
func HandleUpsertPartnerPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	handler := HandleUpsertPayoutDestinationJRN037(db)
	return func(w http.ResponseWriter, r *http.Request) {
		adaptLegacyPartnerDestinationPath(r)
		handler(w, r)
	}
}

func HandleGetPartnerPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	handler := HandleGetPayoutDestinationJRN037(db)
	return func(w http.ResponseWriter, r *http.Request) {
		adaptLegacyPartnerDestinationPath(r)
		handler(w, r)
	}
}

func HandleDeactivatePartnerPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	handler := HandleDeactivatePayoutDestinationJRN037(db)
	return func(w http.ResponseWriter, r *http.Request) {
		adaptLegacyPartnerDestinationPath(r)
		handler(w, r)
	}
}
