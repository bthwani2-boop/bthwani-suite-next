package http

import (
	"database/sql"
	"net/http"
)

// Temporary compile-safe alias while the order-preparation router slice is
// consolidated. It delegates to the canonical public reels handler.
func protectedHandlePublicReels(db *sql.DB) http.HandlerFunc {
	return handlePublicReels(db)
}
