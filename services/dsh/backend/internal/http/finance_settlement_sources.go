package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"dsh-api/internal/store"
)

type financeSettlementOrderSource struct {
	OrderID               string    `json:"orderId"`
	GrossAmountMinorUnits int64     `json:"grossAmountMinorUnits"`
	Currency              string    `json:"currency"`
	DeliveredAt           time.Time `json:"deliveredAt"`
}

type createGovernedSettlementRequest struct {
	PartnerID   string `json:"partnerId"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	Currency    string `json:"currency"`
}

type upsertSettlementPolicyRequest struct {
	FeeBasisPoints int    `json:"feeBasisPoints"`
	Currency       string `json:"currency"`
	Status         string `json:"status"`
}

func decodeStrictFinanceJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

// POST /dsh/control-panel/finance/settlements/from-delivered-orders
//
// DSH derives immutable order sources from its own delivered-order truth. It
// never accepts gross, fee, net or orderCount from the control-panel request.
// WLT owns the active fee policy, arithmetic and duplicate-order prevention.
func (s *protectedStoreServer) handleCreateFinanceSettlementFromDeliveredOrders(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}

	var input createGovernedSettlementRequest
	if !decodeStrictFinanceJSON(w, r, &input) {
		return
	}
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.PeriodStart = strings.TrimSpace(input.PeriodStart)
	input.PeriodEnd = strings.TrimSpace(input.PeriodEnd)
	input.Currency = strings.TrimSpace(input.Currency)
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.PartnerID == "" || input.PeriodStart == "" || input.PeriodEnd == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId, periodStart and periodEnd are required")
		return
	}
	periodStart, err := time.Parse("2006-01-02", input.PeriodStart)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "periodStart must use YYYY-MM-DD")
		return
	}
	periodEnd, err := time.Parse("2006-01-02", input.PeriodEnd)
	if err != nil || periodEnd.Before(periodStart) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "periodEnd must use YYYY-MM-DD and be on or after periodStart")
		return
	}

	rows, err := s.db.QueryContext(r.Context(), `
		SELECT o.id::text,
		       ROUND(SUM(oi.unit_price * oi.quantity) * 100)::bigint AS gross_minor_units,
		       o.updated_at
		FROM dsh_orders o
		JOIN dsh_order_items oi ON oi.order_id = o.id
		JOIN dsh_stores st ON st.id::text = o.store_id
		WHERE st.partner_id::text = $1
		  AND o.status = 'delivered'
		  AND o.updated_at >= $2::date
		  AND o.updated_at < ($3::date + INTERVAL '1 day')
		GROUP BY o.id, o.updated_at
		HAVING ROUND(SUM(oi.unit_price * oi.quantity) * 100)::bigint > 0
		ORDER BY o.updated_at, o.id`, input.PartnerID, input.PeriodStart, input.PeriodEnd)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to derive delivered order sources")
		return
	}
	defer rows.Close()

	orderSources := make([]financeSettlementOrderSource, 0)
	for rows.Next() {
		var source financeSettlementOrderSource
		if err := rows.Scan(&source.OrderID, &source.GrossAmountMinorUnits, &source.DeliveredAt); err != nil {
			store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode delivered order source")
			return
		}
		source.Currency = input.Currency
		orderSources = append(orderSources, source)
	}
	if err := rows.Err(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed while deriving delivered order sources")
		return
	}
	if len(orderSources) == 0 {
		store.SendError(w, http.StatusConflict, "NO_ELIGIBLE_DELIVERED_ORDERS", "no delivered orders are eligible for this partner and period")
		return
	}

	payload, err := json.Marshal(map[string]any{
		"partnerId":    input.PartnerID,
		"periodStart":  input.PeriodStart,
		"periodEnd":    input.PeriodEnd,
		"orderSources": orderSources,
		"operatorId":   actor.ID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode governed settlement")
		return
	}
	status, responseBody, err := s.wlt.FinanceWriteSettlement(r.Context(), http.MethodPost, "/wlt/settlements", payload, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT governed settlement call failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(responseBody)
}

// PUT /dsh/control-panel/finance/settlement-policies/{partnerId}
func (s *protectedStoreServer) handleUpsertFinanceSettlementPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	partnerID := strings.TrimSpace(r.PathValue("partnerId"))
	if partnerID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
		return
	}
	var input upsertSettlementPolicyRequest
	if !decodeStrictFinanceJSON(w, r, &input) {
		return
	}
	if input.FeeBasisPoints < 0 || input.FeeBasisPoints > 10000 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "feeBasisPoints must be between 0 and 10000")
		return
	}
	input.Currency = strings.TrimSpace(input.Currency)
	if input.Currency == "" {
		input.Currency = "YER"
	}
	input.Status = strings.TrimSpace(input.Status)
	if input.Status == "" {
		input.Status = "active"
	}
	payload, err := json.Marshal(map[string]any{
		"feeBasisPoints": input.FeeBasisPoints,
		"currency":       input.Currency,
		"status":         input.Status,
		"operatorId":     actor.ID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode settlement policy")
		return
	}
	path := "/wlt/settlement-policies/" + url.PathEscape(partnerID)
	status, responseBody, err := s.wlt.FinanceWriteSettlement(r.Context(), http.MethodPut, path, bytes.Clone(payload), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", fmt.Sprintf("WLT settlement policy call failed: %v", err))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(responseBody)
}
