package refund

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/lib/pq"

	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

// CompleteRefundSovereign finalizes an approved refund and reverses the
// platform payable created by the original collection. Provider result,
// refund state and journal posting must all succeed before commit.
func CompleteRefundSovereign(ctx context.Context, db *sql.DB, refundID string) (*Refund, error) {
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_refunds
		SET status = 'completed', resolved_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = ANY($2)
		RETURNING `+refundCols, refundID, pq.Array([]string{"approved"}))
	ref, err := scanRefund(row)
	if err == sql.ErrNoRows {
		existing, getErr := GetRefund(db, refundID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrRefundNotInExpectedState
	}
	if err != nil {
		return nil, err
	}

	if ref.AmountMinorUnits > 0 {
		lines := []ledger.LedgerLine{
			{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: ref.AmountMinorUnits, Currency: ref.Currency},
			{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: ref.AmountMinorUnits, Currency: ref.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(ctx, tx, "refund_completed", "refund", ref.ID, lines, ledger.Actor{ID: "wlt", Type: "service"}); err != nil {
			return nil, fmt.Errorf("post refund journal: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return ref, nil
}

func CompleteRefundWithProviderSovereign(ctx context.Context, db *sql.DB, client financialProvider, refundID string, meta provider.RequestMeta) (*Refund, error) {
	ref, err := GetRefund(db, refundID)
	if err != nil || ref == nil {
		return ref, err
	}
	if ref.Status != "approved" {
		return nil, ErrRefundNotInExpectedState
	}
	result, err := client.Post(ctx, "/financial/card/refund", map[string]any{
		"refundId":         ref.ID,
		"paymentSessionId": ref.PaymentSessionID,
		"orderId":          ref.OrderID,
		"clientId":         ref.ClientID,
		"amountMinorUnits": ref.AmountMinorUnits,
		"currency":         ref.Currency,
		"reason":           ref.Reason,
	}, meta)
	if err != nil {
		return nil, err
	}
	if result.Status != "refunded" || result.ProviderReference == "" {
		return nil, fmt.Errorf("provider refund returned invalid status or reference")
	}
	return CompleteRefundSovereign(ctx, db, refundID)
}

func HandleCompleteRefundSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		ref, err := CompleteRefundWithProviderSovereign(r.Context(), db, client, r.PathValue("refundId"), provider.RequestMetaFromHTTP(r, "wlt-refund"))
		if errors.Is(err, ErrRefundNotInExpectedState) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "refund must be approved before it can be completed")
			return
		}
		if err != nil {
			shared.SendProviderError(w, err)
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": ref})
	}
}
