package http

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// handlePublicStorefront is the unified aggregate read for J045.
// It combines the store header, category/item lists, and computes a unified ETag.
func handlePublicStorefront(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := r.PathValue("storeId")
		if storeID == "" {
			store.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "storeId is required")
			return
		}

		// 1. Fetch Store Detail
		storeRow, err := store.GetStoreByID(db, storeID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "store unavailable")
			return
		}
		if storeRow == nil {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		}

		storeDetail := store.RowToDetail(*storeRow)

		// 2. Fetch Catalog (returns only published items)
		domains, nodes, products, media, policySnapshot, err := centralcatalog.GetPurchasableClientCatalog(r.Context(), db, storeID)
		if errors.Is(err, centralcatalog.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "approved catalog not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "catalog unavailable")
			return
		}

		catalog := map[string]any{
			"domains":        domains,
			"nodes":          nodes,
			"products":       products,
			"media":          media,
			"policySnapshot": policySnapshot,
		}

		// 3. Generate versionToken (ETag)
		hashInput := fmt.Sprintf("%s|%d|%d", storeID, storeRow.Version, len(products))
		h := sha256.New()
		h.Write([]byte(hashInput))
		etag := `"` + hex.EncodeToString(h.Sum(nil)) + `"`

		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=120")

		// If client sent If-None-Match
		if match := r.Header.Get("If-None-Match"); match == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}

		store.SendJSON(w, http.StatusOK, map[string]any{
			"versionToken": etag,
			"store":        storeDetail,
			"catalog":      catalog,
		})
	}
}
