package refund

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

var ErrSessionNotRefundable = errors.New("payment session is not in a refundable state")
var ErrRefundNotInExpectedState = errors.New("refund is not in the expected state for this transition")

type Refund struct {
	ID               string  `json:"id"`
	PaymentSessionID string  `json:"paymentSessionId"`
	OrderID          string  `json:"orderId"`
	ClientID         string  `json:"clientId"`
	AmountMinorUnits int64   `json:"amountMinorUnits"`
	Currency         string  `json:"currency"`
	Reason           string  `json:"reason"`
	Status           string  `json:"status"`
	ResolvedAt       *string `json:"resolvedAt"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type CreateRefundInput struct {
	PaymentSessionID string `json:"paymentSessionId"`
	OrderID          string `json:"orderId"`
	ClientID         string `json:"clientId"`
	Reason           string `json:"reason"`
}

type financialProvider interface {
	Post(ctx context.Context, path string, body any, meta provider.RequestMeta) (provider.ProviderResult, error)
}

func trustedRefundContext(db *sql.DB, refundID string) (context.Context, error) {
	refundID = strings.TrimSpace(refundID)
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	var tenantID string
	if err := db.QueryRow(`SELECT tenant_id FROM wlt_refunds WHERE id=$1`, refundID).Scan(&tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return nil, fmt.Errorf("refund tenant is missing")
	}
	return shared.WithTenantContext(context.Background(), tenantID), nil
}

func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {
	created, _, err := CreateRefundAtomic(db, input)
	return created, err
}

func GetRefund(db *sql.DB, refundID string) (*Refund, error) {
	item, err := GetGovernedRefund(db, refundID)
	return legacyRefundView(item), err
}

func ListRefunds(db *sql.DB, orderID, clientID string) ([]*Refund, error) {
	items, err := ListGovernedRefunds(db, orderID, clientID, "")
	if err != nil {
		return nil, err
	}
	out := make([]*Refund, 0, len(items))
	for _, item := range items {
		out = append(out, legacyRefundView(item))
	}
	return out, nil
}

// ApproveRefund is retained for internal tests and older callers. It derives
// tenant ownership only from WLT's persisted refund record before entering the
// governed maker-checker transition.
func ApproveRefund(db *sql.DB, refundID string) (*Refund, error) {
	ctx, err := trustedRefundContext(db, refundID)
	if err != nil || ctx == nil {
		return nil, err
	}
	item, err := ApproveGovernedRefund(ctx, db, refundID, RefundDecisionInput{
		OperatorID: "legacy-refund-checker", Reason: "legacy compatibility approval",
		CorrelationID: "legacy-approve:" + refundID,
	})
	return legacyRefundView(item), err
}

// CompleteRefund is a provider-free compatibility seam used only by database
// tests. It still executes the canonical ledger/reference/outbox transaction;
// production HTTP execution always calls CompleteGovernedRefundWithProvider.
func CompleteRefund(db *sql.DB, refundID string) (*Refund, error) {
	ctx, err := trustedRefundContext(db, refundID)
	if err != nil || ctx == nil {
		return nil, err
	}
	item, err := finalizeGovernedRefundSuccess(
		ctx, db, refundID, "legacy-refund-system", "system",
		"legacy-refund:"+refundID, "legacy compatibility completion",
		"legacy-complete:"+refundID, []string{"approved"},
	)
	return legacyRefundView(item), err
}

func CompleteRefundWithProvider(ctx context.Context, db *sql.DB, client financialProvider, refundID string, meta provider.RequestMeta) (*Refund, error) {
	item, err := CompleteGovernedRefundWithProvider(ctx, db, client, refundID, "legacy-refund-executor", meta.CorrelationID)
	return legacyRefundView(item), err
}

func RejectRefund(db *sql.DB, refundID string) (*Refund, error) {
	ctx, err := trustedRefundContext(db, refundID)
	if err != nil || ctx == nil {
		return nil, err
	}
	item, err := RejectGovernedRefund(ctx, db, refundID, RefundDecisionInput{
		OperatorID: "legacy-refund-checker", Reason: "legacy compatibility rejection",
		CorrelationID: "legacy-reject:" + refundID,
	})
	return legacyRefundView(item), err
}

func HandleCreateRefund(db *sql.DB) http.HandlerFunc { return HandleCreateGovernedRefund(db) }
func HandleGetRefund(db *sql.DB) http.HandlerFunc { return HandleGetGovernedRefund(db) }
func HandleListRefunds(db *sql.DB) http.HandlerFunc { return HandleListGovernedRefunds(db) }

func HandleApproveRefund(db *sql.DB) http.HandlerFunc { return HandleApproveGovernedRefund(db) }
func HandleRejectRefund(db *sql.DB) http.HandlerFunc { return HandleRejectGovernedRefund(db) }

// HandleCompleteRefund keeps the old symbol but requires operator identity,
// matching the governed route instead of silently completing a refund.
func HandleCompleteRefund(db *sql.DB) http.HandlerFunc { return HandleCompleteGovernedRefund(db) }

// decodeLegacyDecision exists only for downstream code that imported the old
// handler file directly; all router bindings use the governed handlers above.
func decodeLegacyDecision(w http.ResponseWriter, r *http.Request) (RefundDecisionInput, bool) {
	var input RefundDecisionInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return input, false
	}
	if input.OperatorID == "" || input.Reason == "" {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", fmt.Sprintf("operatorId and reason are required"))
		return input, false
	}
	return input, true
}
