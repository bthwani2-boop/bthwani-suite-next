package settlement

// Note: these tests exercise the per-row operator_context_id scoping guards
// inside a single WLT deployment (WHERE operator_context_id=$1 filters and
// RequireOperatorContextScope checks). They do not exercise or assert
// network-level multi-tenant isolation -- the DSH service bridge binds every
// request to one fixed deployment-owned context (see
// internal/shared/serviceauth.go). See governance decision Q1/T4.

import (
	"context"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func insertOperatorContextSettlement(t *testing.T, operatorContextID, partnerID string, gross, fee, net int64) *Settlement {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return nil
	}
	defer db.Close()
	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(operator_context_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', $3::bigint, $4::bigint, $5::bigint, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		operatorContextID, partnerID, gross, fee, net,
	)
	settlement, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert OperatorContext settlement: %v", err)
	}
	return settlement
}

func TestSettlementSummaryDoesNotAggregateAnotherOperatorContext(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	suffix := fmt.Sprint(time.Now().UnixNano())
	partnerID := "shared-partner-" + suffix
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix

	for operatorContextID, gross := range map[string]int64{OperatorContextA: 1000, OperatorContextB: 9000} {
		if _, err := db.Exec(`
			INSERT INTO wlt_settlements
				(operator_context_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
			VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', $3::bigint, 100::bigint, $3::bigint - 100::bigint, 'YER', 1, 'pending')`,
			operatorContextID, partnerID, gross,
		); err != nil {
			t.Fatalf("insert %s settlement: %v", operatorContextID, err)
		}
	}

	ctxA := shared.WithOperatorContext(context.Background(), OperatorContextA)
	summary, err := ListSettlementSummaryGoverned(ctxA, db, partnerID, "2026-07-01", "2026-07-31")
	if err != nil {
		t.Fatalf("read OperatorContext A summary: %v", err)
	}
	if summary.SettlementCount != 1 || summary.TotalGross != 1000 {
		t.Fatalf("OperatorContext A summary leaked OperatorContext B: count=%d gross=%d", summary.SettlementCount, summary.TotalGross)
	}
}

func TestPostSettlementCannotMutateAnotherOperatorContext(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	suffix := fmt.Sprint(time.Now().UnixNano())
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix
	partnerID := "partner-" + suffix

	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(operator_context_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', 2000, 200, 1800, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		OperatorContextB, partnerID,
	)
	settlementB, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert OperatorContext B settlement: %v", err)
	}

	ctxA := shared.WithOperatorContext(context.Background(), OperatorContextA)
	posted, err := postSettlement(ctxA, db, settlementB.ID)
	if err != nil {
		t.Fatalf("cross-OperatorContext post should be indistinguishable from not found, got %v", err)
	}
	if posted != nil {
		t.Fatalf("OperatorContext A received OperatorContext B settlement: %+v", posted)
	}
}
