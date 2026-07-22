package refund

import (
	"context"
	"database/sql"
	"net/http"

	"wlt-api/internal/provider"
)

// CompleteRefundSovereign is retained as a provider-free compatibility seam;
// it delegates to the canonical JRN-035 completion transaction.
func CompleteRefundSovereign(ctx context.Context, db *sql.DB, refundID string) (*Refund, error) {
	item, err := finalizeGovernedRefundSuccess(
		ctx, db, refundID, "wlt", "service", "legacy-refund:"+refundID,
		"sovereign compatibility completion", "refund-"+refundID, []string{"approved"},
	)
	return legacyRefundView(item), err
}

func CompleteRefundWithProviderSovereign(ctx context.Context, db *sql.DB, client financialProvider, refundID string, meta provider.RequestMeta) (*Refund, error) {
	item, err := CompleteGovernedRefundWithProvider(ctx, db, client, refundID, "wlt-refund-executor", meta.CorrelationID)
	return legacyRefundView(item), err
}

func HandleCompleteRefundSovereign(db *sql.DB) http.HandlerFunc {
	return HandleCompleteGovernedRefund(db)
}
