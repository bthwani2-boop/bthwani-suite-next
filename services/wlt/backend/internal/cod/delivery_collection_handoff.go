package cod

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

// HandleCreateDeliveryCollectionHandoff accepts every completed delivery event.
// For prepaid orders the event is acknowledged as not applicable; for COD the
// monetary record is derived and created atomically inside WLT.
func HandleCreateDeliveryCollectionHandoff(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreateDeliveryCollectionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		normalized, err := normalizeCollector(input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		session, err := reference.GetPaymentSessionByCheckoutIntent(db, normalized.CheckoutIntentID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "PAYMENT_SESSION_NOT_FOUND", "payment session not found for delivery")
			return
		}
		if session.PaymentMethod != "cod" {
			shared.SendJSON(w, http.StatusOK, map[string]any{
				"codRecord":  nil,
				"applicable": false,
				"replayed":   false,
			})
			return
		}

		record, created, err := CreateDeliveryCollection(db, normalized)
		if errors.Is(err, ErrCodReferenceConflict) {
			shared.SendError(w, http.StatusConflict, "COD_REFERENCE_CONFLICT", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		status := http.StatusOK
		if created {
			status = http.StatusCreated
		}
		shared.SendJSON(w, status, map[string]any{
			"codRecord":  record,
			"applicable": true,
			"replayed":   !created,
		})
	}
}
