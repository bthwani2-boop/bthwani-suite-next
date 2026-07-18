package settlement

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/lib/pq"

	"wlt-api/internal/shared"
)

var ErrSettlementPolicyMissing = errors.New("active WLT settlement policy is required for this partner")
var ErrSettlementOrderAlreadyUsed = errors.New("one or more delivered orders were already included in another settlement")

type DeliveredOrderSource struct {
	OrderID               string    `json:"orderId"`
	GrossAmountMinorUnits int64     `json:"grossAmountMinorUnits"`
	Currency              string    `json:"currency"`
	DeliveredAt           time.Time `json:"deliveredAt"`
}

type CreateFromDeliveredOrdersInput struct {
	PartnerID   string                 `json:"partnerId"`
	PeriodStart string                 `json:"periodStart"`
	PeriodEnd   string                 `json:"periodEnd"`
	OrderSources []DeliveredOrderSource `json:"orderSources"`
	OperatorID  string                 `json:"operatorId"`
}

type UpsertSettlementPolicyInput struct {
	FeeBasisPoints int    `json:"feeBasisPoints"`
	Currency       string `json:"currency"`
	Status         string `json:"status"`
	OperatorID     string `json:"operatorId"`
}

type SettlementPolicy struct {
	PartnerID       string    `json:"partnerId"`
	FeeBasisPoints  int       `json:"feeBasisPoints"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"`
	UpdatedBy       string    `json:"updatedByOperatorId"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func UpsertSettlementPolicy(ctx context.Context, db *sql.DB, partnerID string, input UpsertSettlementPolicyInput) (*SettlementPolicy, error) {
	partnerID = strings.TrimSpace(partnerID)
	input.Currency = strings.TrimSpace(input.Currency)
	input.Status = strings.TrimSpace(input.Status)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	if partnerID == "" || input.OperatorID == "" || input.FeeBasisPoints < 0 || input.FeeBasisPoints > 10000 {
		return nil, fmt.Errorf("partnerId, operatorId and feeBasisPoints 0..10000 are required")
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.Status != "active" && input.Status != "inactive" {
		return nil, fmt.Errorf("unsupported settlement policy status")
	}
	var policy SettlementPolicy
	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_settlement_policies
			(partner_id, fee_basis_points, currency, status, updated_by_operator_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (partner_id) DO UPDATE SET
			fee_basis_points = EXCLUDED.fee_basis_points,
			currency = EXCLUDED.currency,
			status = EXCLUDED.status,
			updated_by_operator_id = EXCLUDED.updated_by_operator_id,
			updated_at = now()
		RETURNING partner_id, fee_basis_points, currency, status, updated_by_operator_id, updated_at`,
		partnerID, input.FeeBasisPoints, input.Currency, input.Status, input.OperatorID,
	).Scan(&policy.PartnerID, &policy.FeeBasisPoints, &policy.Currency, &policy.Status, &policy.UpdatedBy, &policy.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &policy, nil
}

func CreateSettlementFromDeliveredOrders(ctx context.Context, db *sql.DB, input CreateFromDeliveredOrdersInput) (*Settlement, error) {
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	if input.PartnerID == "" || input.OperatorID == "" || input.PeriodStart == "" || input.PeriodEnd == "" || len(input.OrderSources) == 0 {
		return nil, fmt.Errorf("partnerId, periodStart, periodEnd, operatorId and orderSources are required")
	}
	periodStart, err := time.Parse("2006-01-02", input.PeriodStart)
	if err != nil {
		return nil, fmt.Errorf("periodStart must use YYYY-MM-DD")
	}
	periodEnd, err := time.Parse("2006-01-02", input.PeriodEnd)
	if err != nil || periodEnd.Before(periodStart) {
		return nil, fmt.Errorf("periodEnd must use YYYY-MM-DD and be on or after periodStart")
	}

	var feeBasisPoints int
	var policyCurrency string
	err = db.QueryRowContext(ctx, `
		SELECT fee_basis_points, currency
		FROM wlt_settlement_policies
		WHERE partner_id = $1 AND status = 'active'`, input.PartnerID).Scan(&feeBasisPoints, &policyCurrency)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSettlementPolicyMissing
	}
	if err != nil {
		return nil, err
	}

	seen := make(map[string]struct{}, len(input.OrderSources))
	var grossAmount int64
	for index, source := range input.OrderSources {
		source.OrderID = strings.TrimSpace(source.OrderID)
		source.Currency = strings.TrimSpace(source.Currency)
		if source.OrderID == "" || source.GrossAmountMinorUnits <= 0 || source.DeliveredAt.IsZero() {
			return nil, fmt.Errorf("orderSources[%d] is invalid", index)
		}
		if source.Currency != policyCurrency {
			return nil, fmt.Errorf("orderSources[%d] currency %s does not match policy currency %s", index, source.Currency, policyCurrency)
		}
		if source.DeliveredAt.Before(periodStart) || !source.DeliveredAt.Before(periodEnd.Add(24*time.Hour)) {
			return nil, fmt.Errorf("orderSources[%d] deliveredAt is outside the settlement period", index)
		}
		if _, exists := seen[source.OrderID]; exists {
			return nil, fmt.Errorf("duplicate orderId %s in request", source.OrderID)
		}
		seen[source.OrderID] = struct{}{}
		grossAmount += source.GrossAmountMinorUnits
		input.OrderSources[index] = source
	}
	if grossAmount <= 0 {
		return nil, fmt.Errorf("settlement gross amount must be positive")
	}
	platformFee := (grossAmount*int64(feeBasisPoints) + 5000) / 10000
	netAmount := grossAmount - platformFee

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	const insertSettlement = `
		INSERT INTO wlt_settlements
			(partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + settlementCols
	settlement, err := scanSettlement(tx.QueryRowContext(ctx, insertSettlement,
		input.PartnerID, input.PeriodStart, input.PeriodEnd, grossAmount, platformFee, netAmount, policyCurrency, len(input.OrderSources)))
	if err != nil {
		return nil, err
	}

	for _, source := range input.OrderSources {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO wlt_settlement_source_orders
				(order_id, settlement_id, partner_id, gross_amount_minor_units, currency, delivered_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			source.OrderID, settlement.ID, input.PartnerID, source.GrossAmountMinorUnits, source.Currency, source.DeliveredAt)
		if err != nil {
			var pqErr *pq.Error
			if errors.As(err, &pqErr) && pqErr.Code == "23505" {
				return nil, ErrSettlementOrderAlreadyUsed
			}
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return settlement, nil
}

func HandleUpsertSettlementPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertSettlementPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertSettlementPolicy(r.Context(), db, r.PathValue("partnerId"), input)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlementPolicy": policy})
	}
}

func HandleCreateSettlementFromDeliveredOrders(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateFromDeliveredOrdersInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2*1024*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		settlement, err := CreateSettlementFromDeliveredOrders(r.Context(), db, input)
		switch {
		case errors.Is(err, ErrSettlementPolicyMissing):
			shared.SendError(w, http.StatusConflict, "SETTLEMENT_POLICY_MISSING", err.Error())
			return
		case errors.Is(err, ErrSettlementOrderAlreadyUsed):
			shared.SendError(w, http.StatusConflict, "ORDER_ALREADY_SETTLED", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"settlement": settlement})
	}
}
