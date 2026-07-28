package settlement

import (
	"context"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func TestListSettlementSummaryGoverned_AggregatesOnePartnerWithoutGroupBy(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	suffix := time.Now().UnixNano()
	tenantID := fmt.Sprintf("tenant-summary-%d", suffix)
	partnerID := fmt.Sprintf("partner-summary-%d", suffix)
	_, err := db.Exec(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES
			($1, $2, '2026-01-01', '2026-01-15', 1000, 100, 900, 'YER', 2, 'pending'),
			($1, $2, '2026-01-16', '2026-01-31', 2500, 250, 2250, 'YER', 3, 'settled')`,
		tenantID, partnerID,
	)
	if err != nil {
		t.Fatalf("failed to insert settlement summary fixtures: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_settlements WHERE tenant_id = $1 AND partner_id = $2`, tenantID, partnerID)
	})

	ctx := shared.WithTenantContext(context.Background(), tenantID)
	summary, err := ListSettlementSummaryGoverned(ctx, db, partnerID, "", "")
	if err != nil {
		t.Fatalf("summary query failed: %v", err)
	}
	if summary.PartnerID != partnerID {
		t.Fatalf("expected partner %s, got %s", partnerID, summary.PartnerID)
	}
	if summary.PeriodStart != "2026-01-01" || summary.PeriodEnd != "2026-01-31" {
		t.Fatalf("unexpected summary period: %s..%s", summary.PeriodStart, summary.PeriodEnd)
	}
	if summary.TotalGross != 3500 || summary.TotalFee != 350 || summary.TotalNet != 3150 {
		t.Fatalf("unexpected monetary totals: gross=%d fee=%d net=%d", summary.TotalGross, summary.TotalFee, summary.TotalNet)
	}
	if summary.TotalOrders != 5 || summary.SettlementCount != 2 || summary.Currency != "YER" {
		t.Fatalf("unexpected counts/currency: orders=%d count=%d currency=%s", summary.TotalOrders, summary.SettlementCount, summary.Currency)
	}
}

func TestListSettlementSummaryGoverned_ReturnsStableZeroSummary(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	suffix := time.Now().UnixNano()
	tenantID := fmt.Sprintf("tenant-summary-empty-%d", suffix)
	partnerID := fmt.Sprintf("partner-summary-empty-%d", suffix)
	ctx := shared.WithTenantContext(context.Background(), tenantID)
	summary, err := ListSettlementSummaryGoverned(ctx, db, partnerID, "", "")
	if err != nil {
		t.Fatalf("empty summary query failed: %v", err)
	}
	if summary.PartnerID != partnerID || summary.PeriodStart != "" || summary.PeriodEnd != "" {
		t.Fatalf("unexpected empty summary identity/period: %#v", summary)
	}
	if summary.TotalGross != 0 || summary.TotalFee != 0 || summary.TotalNet != 0 || summary.TotalOrders != 0 || summary.SettlementCount != 0 {
		t.Fatalf("expected zero-value empty summary, got %#v", summary)
	}
	if summary.Currency != "YER" {
		t.Fatalf("expected stable YER currency for empty summary, got %s", summary.Currency)
	}
}
