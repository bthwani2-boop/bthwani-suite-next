package payout

import (
	"encoding/json"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleFailPayoutRequestClosed serves POST /wlt/payout-requests/{payoutId}/fail.
//
// Marking a payout failed would assert, outside reconciliation, that money never
// left an official wallet -- and then release the payout hold on that assertion
// alone. The manual settlement model has no such authority: an executed or
// unknown external transfer is resolved by execution evidence and statement
// reconciliation, never by an operator declaring the payout failed. So the
// transition does not exist, and this route exists only to say so.
//
// It is registered rather than absent because an unregistered path answers 404,
// which reads as "unknown route" instead of "refused financial decision" and
// leaves a caller free to assume the capability is merely missing here. The
// boundary reads nothing and writes nothing: no payout state, no hold and no
// ledger effect can change through it.
func HandleFailPayoutRequestClosed() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.PathValue("payoutId")) == "" {
			shared.SendError(w, http.StatusForbidden, "MANUAL_PAYOUT_FAILURE_FORBIDDEN",
				"a payout identifier is required and manual payout failure is not an available transition")
			return
		}
		var body struct {
			OperatorID string `json:"operatorId"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&body); err != nil || strings.TrimSpace(body.OperatorID) == "" {
			shared.SendError(w, http.StatusForbidden, "MANUAL_PAYOUT_FAILURE_FORBIDDEN",
				"an authenticated operatorId is required and manual payout failure is not an available transition")
			return
		}
		shared.SendError(w, http.StatusConflict, "RECONCILIATION_REQUIRED",
			"a payout cannot be failed manually; resolve the external transfer through execution evidence and statement reconciliation. Held funds remain unchanged.")
	}
}
