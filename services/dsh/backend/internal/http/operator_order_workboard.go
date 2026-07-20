package http

import (
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/store"
)

type operatorOrderWorkboardRow struct {
	ID                     string    `json:"id"`
	StoreID                string    `json:"storeId"`
	FulfillmentMode        string    `json:"fulfillmentMode"`
	ClientID               string    `json:"clientId"`
	Status                 string    `json:"status"`
	CaptainID              *string   `json:"captainId"`
	CaptainLifecycleStatus *string   `json:"captainLifecycleStatus"`
	PodMediaKey            *string   `json:"podMediaKey"`
	DeliveryFailureReason  *string   `json:"deliveryFailureReason"`
	TotalPrice             float64   `json:"totalPrice"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

// GET /dsh/operator/order-workboard?status=...&limit=...
// Returns one joined row per order. Assignment and delivery values come from
// the latest dispatch assignment; the UI never infers them from order status.
func (s *protectedStoreServer) handleOperatorOrderWorkboard(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT
			o.id::text,
			o.store_id,
			o.fulfillment_mode,
			o.client_id,
			o.status,
			latest.captain_id,
			latest.delivery_status,
			latest.pod_reference,
			latest.delivery_note,
			COALESCE(items.total_price, 0)::float8,
			o.created_at,
			GREATEST(o.updated_at, COALESCE(latest.updated_at, o.updated_at))
		FROM dsh_orders o
		LEFT JOIN LATERAL (
			SELECT
				a.captain_id,
				d.status::text AS delivery_status,
				NULLIF(d.pod_reference, '') AS pod_reference,
				NULLIF(d.note, '') AS delivery_note,
				GREATEST(a.updated_at, d.updated_at) AS updated_at
			FROM dsh_assignments a
			JOIN dsh_deliveries d ON d.assignment_id = a.id
			WHERE a.order_id = o.id
			ORDER BY a.created_at DESC
			LIMIT 1
		) latest ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(oi.quantity * oi.unit_price) AS total_price
			FROM dsh_order_items oi
			WHERE oi.order_id = o.id
		) items ON TRUE
		WHERE ($1 = '' OR o.status = $1)
		ORDER BY o.updated_at DESC
		LIMIT 100`, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load operator order workboard")
		return
	}
	defer rows.Close()

	result := make([]operatorOrderWorkboardRow, 0)
	for rows.Next() {
		var row operatorOrderWorkboardRow
		if err := rows.Scan(
			&row.ID,
			&row.StoreID,
			&row.FulfillmentMode,
			&row.ClientID,
			&row.Status,
			&row.CaptainID,
			&row.CaptainLifecycleStatus,
			&row.PodMediaKey,
			&row.DeliveryFailureReason,
			&row.TotalPrice,
			&row.CreatedAt,
			&row.UpdatedAt,
		); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to scan operator order workboard")
			return
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to complete operator order workboard")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"orders": result,
		"total":  len(result),
	})
}
