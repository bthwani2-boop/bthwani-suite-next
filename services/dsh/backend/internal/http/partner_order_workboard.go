package http

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/store"
)

type partnerOrderWorkboardItem struct {
	ID          string  `json:"id"`
	OrderID     string  `json:"orderId"`
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
}

type partnerOrderWorkboardOrder struct {
	ID               string                      `json:"id"`
	CheckoutIntentID string                      `json:"checkoutIntentId"`
	StoreID          string                      `json:"storeId"`
	FulfillmentMode  string                      `json:"fulfillmentMode"`
	ClientID         string                      `json:"clientId"`
	Status           string                      `json:"status"`
	RejectionReason  string                      `json:"rejectionReason"`
	WltPaymentRefID  string                      `json:"wltPaymentRefId"`
	TotalPrice       float64                     `json:"totalPrice"`
	Items            []partnerOrderWorkboardItem `json:"items"`
	CreatedAt        time.Time                   `json:"createdAt"`
	UpdatedAt        time.Time                   `json:"updatedAt"`
}

// GET /dsh/partner/order-workboard?status=...
//
// The store scope is resolved from the authenticated partner actor. The
// workboard deliberately returns all lifecycle states when status is omitted;
// inbox tabs must not be backed by a hidden pending-only default.
func (s *protectedStoreServer) handlePartnerOrderWorkboard(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}

	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT
			o.id::text,
			o.checkout_intent_id::text,
			o.store_id,
			o.fulfillment_mode,
			o.client_id,
			o.status,
			COALESCE(o.rejection_reason, ''),
			o.wlt_payment_ref_id,
			COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float8 AS total_price,
			COALESCE(
				jsonb_agg(
					jsonb_build_object(
						'id', oi.id::text,
						'orderId', oi.order_id::text,
						'productId', oi.product_id,
						'productName', oi.product_name,
						'quantity', oi.quantity,
						'unitPrice', oi.unit_price
					)
					ORDER BY oi.created_at
				) FILTER (WHERE oi.id IS NOT NULL),
				'[]'::jsonb
			) AS items,
			o.created_at,
			o.updated_at
		FROM dsh_orders o
		LEFT JOIN dsh_order_items oi ON oi.order_id = o.id
		WHERE o.store_id = $1
		  AND ($2 = '' OR o.status = $2)
		GROUP BY
			o.id,
			o.checkout_intent_id,
			o.store_id,
			o.fulfillment_mode,
			o.client_id,
			o.status,
			o.rejection_reason,
			o.wlt_payment_ref_id,
			o.created_at,
			o.updated_at
		ORDER BY
			CASE o.status
				WHEN 'pending' THEN 1
				WHEN 'store_accepted' THEN 2
				WHEN 'preparing' THEN 3
				WHEN 'ready_for_pickup' THEN 4
				WHEN 'driver_assigned' THEN 5
				WHEN 'driver_arrived_store' THEN 6
				WHEN 'picked_up' THEN 7
				WHEN 'arrived_customer' THEN 8
				WHEN 'delivered' THEN 9
				WHEN 'cancelled' THEN 10
				ELSE 99
			END,
			o.created_at ASC
		LIMIT 100`, storeID, statusFilter)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner order workboard")
		return
	}
	defer rows.Close()

	orders := make([]partnerOrderWorkboardOrder, 0)
	for rows.Next() {
		var order partnerOrderWorkboardOrder
		var itemsJSON []byte
		if err := rows.Scan(
			&order.ID,
			&order.CheckoutIntentID,
			&order.StoreID,
			&order.FulfillmentMode,
			&order.ClientID,
			&order.Status,
			&order.RejectionReason,
			&order.WltPaymentRefID,
			&order.TotalPrice,
			&itemsJSON,
			&order.CreatedAt,
			&order.UpdatedAt,
		); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read partner order workboard")
			return
		}
		if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "invalid partner order item projection")
			return
		}
		if order.Items == nil {
			order.Items = []partnerOrderWorkboardItem{}
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to complete partner order workboard")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  len(orders),
	})
}
