package http

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/orders"
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
	AllowedActions   []string                    `json:"allowedActions"`
	Preparation      orders.PreparationTiming    `json:"preparation"`
	UpdatedAt        time.Time                   `json:"updatedAt"`
}

func partnerOrderAllowedActions(status, fulfillmentMode string) []string {
	switch strings.TrimSpace(status) {
	case "pending":
		return []string{"accept", "reject"}
	case "store_accepted":
		return []string{"prepare", "revise_estimate"}
	case "preparing":
		return []string{"ready", "revise_estimate"}
	case "ready_for_pickup":
		if fulfillmentMode == "partner_delivery" || fulfillmentMode == "pickup" {
			return []string{"handoff"}
		}
	}
	return []string{}
}

// GET /dsh/partner/order-workboard?status=...
//
// The store scope is resolved from the authenticated partner actor. The
// workboard deliberately returns all lifecycle states when status is omitted;
// inbox tabs must not be backed by a hidden pending-only default. Executable
// actions and preparation SLA are derived by DSH, never inferred by a screen.
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
			o.accepted_at,
			o.preparation_started_at,
			o.estimated_ready_at,
			o.ready_at,
			o.estimated_preparation_minutes,
			o.preparation_warning_minutes,
			COALESCE(o.preparation_delay_reason, ''),
			o.preparation_estimate_revision_count,
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
			o.accepted_at,
			o.preparation_started_at,
			o.estimated_ready_at,
			o.ready_at,
			o.estimated_preparation_minutes,
			o.preparation_warning_minutes,
			o.preparation_delay_reason,
			o.preparation_estimate_revision_count,
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
				WHEN 'returning_to_store' THEN 9
				WHEN 'return_arrived_store' THEN 10
				WHEN 'returned_to_store' THEN 11
				WHEN 'delivered' THEN 12
				ELSE 99
			END,
			o.created_at ASC
		LIMIT 100`, storeID, statusFilter)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner order workboard")
		return
	}
	defer rows.Close()

	now := time.Now()
	workboardOrders := make([]partnerOrderWorkboardOrder, 0)
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
			&order.Preparation.AcceptedAt,
			&order.Preparation.PreparationStartedAt,
			&order.Preparation.EstimatedReadyAt,
			&order.Preparation.ReadyAt,
			&order.Preparation.EstimatedMinutes,
			&order.Preparation.WarningMinutes,
			&order.Preparation.DelayReason,
			&order.Preparation.EstimateRevisionCount,
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
		order.AllowedActions = partnerOrderAllowedActions(order.Status, order.FulfillmentMode)
		order.Preparation.OrderID = order.ID
		order.Preparation = orders.EvaluatePreparationTiming(order.Preparation, now)
		workboardOrders = append(workboardOrders, order)
	}
	if err := rows.Err(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to complete partner order workboard")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"orders": workboardOrders,
		"total":  len(workboardOrders),
	})
}
