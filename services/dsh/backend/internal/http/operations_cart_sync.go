package http

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"dsh-api/internal/store"
)

type CartIdempotencyRecord struct {
	IdempotencyKey string    `json:"idempotencyKey"`
	Version        int       `json:"version"`
	DeviceID       *string   `json:"deviceId"`
	SessionID      *string   `json:"sessionId"`
	CreatedAt      time.Time `json:"createdAt"`
}

type CartDiagnosticsView struct {
	ID        string    `json:"id"`
	ClientID  string    `json:"clientId"`
	StoreID   string    `json:"storeId"`
	State     string    `json:"state"`
	Version   int       `json:"version"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CartSyncDiagnosticsResponse struct {
	Cart    CartDiagnosticsView     `json:"cart"`
	History []CartIdempotencyRecord `json:"history"`
}

func (s *protectedStoreServer) handleOperatorCartSyncDiagnostics(w http.ResponseWriter, r *http.Request) {
	cartID := r.PathValue("cartId")
	if cartID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId is required")
		return
	}

	var resp CartSyncDiagnosticsResponse

	err := s.db.QueryRowContext(r.Context(), `
		SELECT id, client_id, store_id, state, version, updated_at
		FROM dsh_carts
		WHERE id = $1
	`, cartID).Scan(&resp.Cart.ID, &resp.Cart.ClientID, &resp.Cart.StoreID, &resp.Cart.State, &resp.Cart.Version, &resp.Cart.UpdatedAt)

	if err == sql.ErrNoRows {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart not found")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to query cart")
		return
	}

	rows, err := s.db.QueryContext(r.Context(), `
		SELECT idempotency_key, version, device_id, session_id, created_at
		FROM dsh_cart_idempotency
		WHERE cart_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, cartID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to query idempotency history")
		return
	}
	defer rows.Close()

	resp.History = []CartIdempotencyRecord{}
	for rows.Next() {
		var rec CartIdempotencyRecord
		if err := rows.Scan(&rec.IdempotencyKey, &rec.Version, &rec.DeviceID, &rec.SessionID, &rec.CreatedAt); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to scan history")
			return
		}
		resp.History = append(resp.History, rec)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
