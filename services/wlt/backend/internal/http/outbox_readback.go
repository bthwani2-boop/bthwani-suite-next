package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/commercial"
	"wlt-api/internal/shared"
)

// HandleLoyaltyOutboxReadback is an internal, read-only idempotency probe for
// DSH UNKNOWN-result reconciliation. It exposes only the canonical entry
// reference and reuses the same authenticated WLT read boundary as every
// other DSH-to-WLT financial read.
func HandleLoyaltyOutboxReadback(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimSpace(r.URL.Query().Get("idempotencyKey"))
		if key == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "idempotencyKey is required")
			return
		}
		entry, err := commercial.GetLoyaltyEntryByIdempotency(r.Context(), db, key)
		if errors.Is(err, commercial.ErrNotFound) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "loyalty entry not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read canonical loyalty entry")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"loyaltyEntry": entry})
	}
}
