package http

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"dsh-api/internal/store"
)

type financeSettlementOrderSource struct {
	OrderID                string    `json:"orderId"`
	GrossAmountMinorUnits  int64     `json:"grossAmountMinorUnits"`
	Currency               string    `json:"currency"`
	DeliveredAt            time.Time `json:"deliveredAt"`
	PricingSnapshotHash    string    `json:"pricingSnapshotHash"`
	CompletionEventID      string    `json:"completionEventId"`
	CompletionEvidenceHash string    `json:"completionEvidenceHash"`
	CancellationStatus     string    `json:"cancellationStatus"`
}

type createGovernedSettlementRequest struct {
	PartnerID   string `json:"partnerId"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
}

type upsertSettlementPolicyRequest struct {
	FeeBasisPoints       int    `json:"feeBasisPoints"`
	Currency             string `json:"currency"`
	Status               string `json:"status"`
	CycleDays            int    `json:"cycleDays"`
	MinimumNetMinorUnits int64  `json:"minimumNetMinorUnits"`
	ChangeReason         string `json:"changeReason"`
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

func settlementEvidenceHash(parts ...string) string {
	h := sha256.New()
	for _, part := range parts {
		_, _ = h.Write([]byte(strings.TrimSpace(part)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

// POST /dsh/control-panel/finance/settlements/from-delivered-orders
// DSH sends only immutable operational evidence. WLT owns refund truth,
// settlement policy, arithmetic, ledger effects, and duplicate prevention.
func (s *protectedStoreServer) handleCreateFinanceSettlementFromDeliveredOrders(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok { return }
	if !s.wlt.Configured() { store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured"); return }
	var input createGovernedSettlementRequest
	if !decodeStrictFinanceJSON(w, r, &input) { return }
	input.PartnerID = strings.TrimSpace(input.PartnerID); input.PeriodStart = strings.TrimSpace(input.PeriodStart); input.PeriodEnd = strings.TrimSpace(input.PeriodEnd)
	if input.PartnerID == "" || input.PeriodStart == "" || input.PeriodEnd == "" { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId, periodStart and periodEnd are required"); return }
	periodStart, err := time.Parse("2006-01-02", input.PeriodStart)
	if err != nil { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "periodStart must use YYYY-MM-DD"); return }
	periodEnd, err := time.Parse("2006-01-02", input.PeriodEnd)
	if err != nil || periodEnd.Before(periodStart) { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "periodEnd must use YYYY-MM-DD and be on or after periodStart"); return }

	rows, err := s.db.QueryContext(r.Context(), `
		SELECT o.id::text, o.subtotal_minor_units, o.currency,
		       delivered.delivered_at, o.pricing_snapshot_hash
		FROM dsh_orders o
		JOIN dsh_stores st ON st.id = o.store_id
		JOIN LATERAL (
			SELECT MAX(event.created_at) AS delivered_at
			FROM dsh_order_status_events event
			WHERE event.order_id = o.id AND event.to_status = 'delivered'
		) delivered ON delivered.delivered_at IS NOT NULL
		WHERE st.partner_id::text = $1 AND o.status = 'delivered'
		  AND delivered.delivered_at >= $2::date
		  AND delivered.delivered_at < ($3::date + INTERVAL '1 day')
		  AND o.subtotal_minor_units > 0 AND btrim(o.currency) <> ''
		  AND btrim(o.pricing_snapshot_hash) <> ''
		ORDER BY delivered.delivered_at, o.id`, input.PartnerID, input.PeriodStart, input.PeriodEnd)
	if err != nil { store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to derive delivered order sources"); return }
	defer rows.Close()
	orderSources := make([]financeSettlementOrderSource, 0)
	for rows.Next() {
		var source financeSettlementOrderSource
		if err := rows.Scan(&source.OrderID, &source.GrossAmountMinorUnits, &source.Currency, &source.DeliveredAt, &source.PricingSnapshotHash); err != nil { store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode delivered order source"); return }
		source.CancellationStatus = "not_cancelled"
		source.CompletionEventID = "delivered:" + source.OrderID + ":" + source.DeliveredAt.UTC().Format(time.RFC3339Nano)
		source.CompletionEvidenceHash = settlementEvidenceHash(source.OrderID, "delivered", source.DeliveredAt.UTC().Format(time.RFC3339Nano), source.PricingSnapshotHash, fmt.Sprint(source.GrossAmountMinorUnits), source.Currency, source.CancellationStatus)
		orderSources = append(orderSources, source)
	}
	if err := rows.Err(); err != nil { store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed while deriving delivered order sources"); return }
	if len(orderSources) == 0 { store.SendError(w, http.StatusConflict, "NO_ELIGIBLE_DELIVERED_ORDERS", "no delivered non-cancelled orders with an authoritative pricing snapshot are eligible for this partner and period"); return }
	payload, err := json.Marshal(map[string]any{"partnerId": input.PartnerID, "periodStart": input.PeriodStart, "periodEnd": input.PeriodEnd, "orderSources": orderSources, "operatorId": actor.ID})
	if err != nil { store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode governed settlement"); return }
	status, responseBody, err := s.wlt.FinanceWriteSettlement(r.Context(), http.MethodPost, "/wlt/settlements", payload, r.Header.Get("X-Correlation-ID"))
	if err != nil { store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT governed settlement call failed"); return }
	w.Header().Set("Content-Type", "application/json"); w.Header().Set("Cache-Control", "no-store"); w.WriteHeader(status); _, _ = w.Write(responseBody)
}

// PUT /dsh/control-panel/finance/settlement-policies/{partnerId}
func (s *protectedStoreServer) handleUpsertFinanceSettlementPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok { return }
	if !s.wlt.Configured() { store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured"); return }
	partnerID := strings.TrimSpace(r.PathValue("partnerId"))
	if partnerID == "" { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required"); return }
	var input upsertSettlementPolicyRequest
	if !decodeStrictFinanceJSON(w, r, &input) { return }
	if input.FeeBasisPoints < 0 || input.FeeBasisPoints > 10000 || input.MinimumNetMinorUnits < 0 { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "feeBasisPoints must be 0..10000 and minimumNetMinorUnits cannot be negative"); return }
	input.Currency = strings.TrimSpace(input.Currency); if input.Currency == "" { input.Currency = "YER" }
	input.Status = strings.ToLower(strings.TrimSpace(input.Status)); if input.Status == "" { input.Status = "active" }
	if input.CycleDays == 0 { input.CycleDays = 7 }
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	if input.CycleDays < 1 || input.CycleDays > 366 || input.ChangeReason == "" { store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cycleDays must be 1..366 and changeReason is required"); return }
	payload, err := json.Marshal(map[string]any{"feeBasisPoints": input.FeeBasisPoints, "currency": input.Currency, "status": input.Status, "cycleDays": input.CycleDays, "minimumNetMinorUnits": input.MinimumNetMinorUnits, "changeReason": input.ChangeReason, "operatorId": actor.ID})
	if err != nil { store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode settlement policy"); return }
	path := "/wlt/settlement-policies/" + url.PathEscape(partnerID)
	status, responseBody, err := s.wlt.FinanceWriteSettlement(r.Context(), http.MethodPut, path, bytes.Clone(payload), r.Header.Get("X-Correlation-ID"))
	if err != nil { store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", fmt.Sprintf("WLT settlement policy call failed: %v", err)); return }
	w.Header().Set("Content-Type", "application/json"); w.Header().Set("Cache-Control", "no-store"); w.WriteHeader(status); _, _ = w.Write(responseBody)
}
