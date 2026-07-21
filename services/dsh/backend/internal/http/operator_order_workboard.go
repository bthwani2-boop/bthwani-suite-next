package http

import (
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

type operatorOrderWorkboardRow struct {
	ID                        string                   `json:"id"`
	StoreID                   string                   `json:"storeId"`
	FulfillmentMode           string                   `json:"fulfillmentMode"`
	ClientID                  string                   `json:"clientId"`
	Status                    string                   `json:"status"`
	CaptainID                 *string                  `json:"captainId"`
	CaptainLifecycleStatus    *string                  `json:"captainLifecycleStatus"`
	PodMediaKey               *string                  `json:"podMediaKey"`
	DeliveryFailureReason     *string                  `json:"deliveryFailureReason"`
	CancellationReasonCode    *string                  `json:"cancellationReasonCode"`
	CancellationNote          *string                  `json:"cancellationNote"`
	CancelledByRole           *string                  `json:"cancelledByRole"`
	CancelledAt               *time.Time               `json:"cancelledAt"`
	FinancialClosureStatus    string                   `json:"financialClosureStatus"`
	FinancialClosureReference *string                  `json:"financialClosureReference"`
	FinancialClosureFailure   *string                  `json:"financialClosureFailure"`
	Preparation               orders.PreparationTiming `json:"preparation"`
	TotalPrice                float64                  `json:"totalPrice"`
	CreatedAt                 time.Time                `json:"createdAt"`
	UpdatedAt                 time.Time                `json:"updatedAt"`
}

// GET /dsh/operator/order-workboard?status=...&limit=...
// Returns one joined row per order. Assignment, preparation, cancellation and
// financial closure values come from owning records; the UI never infers them.
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
			NULLIF(o.cancellation_reason_code,''),
			NULLIF(o.cancellation_note,''),
			NULLIF(o.cancelled_by_role,''),
			o.cancelled_at,
			o.financial_closure_status,
			NULLIF(o.financial_closure_reference,''),
			finance.last_error,
			o.accepted_at,
			o.preparation_started_at,
			o.estimated_ready_at,
			o.ready_at,
			o.estimated_preparation_minutes,
			o.preparation_warning_minutes,
			COALESCE(o.preparation_delay_reason,''),
			o.preparation_estimate_revision_count,
			COALESCE(items.total_price, 0)::float8,
			o.created_at,
			GREATEST(o.updated_at, COALESCE(latest.updated_at, o.updated_at), COALESCE(finance.updated_at, o.updated_at))
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
			SELECT NULLIF(last_error,'') AS last_error, updated_at
			FROM dsh_checkout_financial_closure_outbox
			WHERE order_id=o.id
			ORDER BY created_at DESC
			LIMIT 1
		) finance ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(oi.quantity * oi.unit_price) AS total_price
			FROM dsh_order_items oi
			WHERE oi.order_id = o.id
		) items ON TRUE
		WHERE ($1 = '' OR o.status = $1)
		ORDER BY
			CASE
				WHEN o.status IN ('store_accepted','preparing') AND o.estimated_ready_at < NOW() THEN 0
				ELSE 1
			END,
			o.updated_at DESC
		LIMIT 100`, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load operator order workboard")
		return
	}
	defer rows.Close()

	now := time.Now()
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
			&row.CancellationReasonCode,
			&row.CancellationNote,
			&row.CancelledByRole,
			&row.CancelledAt,
			&row.FinancialClosureStatus,
			&row.FinancialClosureReference,
			&row.FinancialClosureFailure,
			&row.Preparation.AcceptedAt,
			&row.Preparation.PreparationStartedAt,
			&row.Preparation.EstimatedReadyAt,
			&row.Preparation.ReadyAt,
			&row.Preparation.EstimatedMinutes,
			&row.Preparation.WarningMinutes,
			&row.Preparation.DelayReason,
			&row.Preparation.EstimateRevisionCount,
			&row.TotalPrice,
			&row.CreatedAt,
			&row.UpdatedAt,
		); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to scan operator order workboard")
			return
		}
		row.Preparation.OrderID = row.ID
		row.Preparation = orders.EvaluatePreparationTiming(row.Preparation, now)
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
