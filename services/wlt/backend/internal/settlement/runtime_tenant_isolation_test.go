package settlement

import (
	"context"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func insertTenantSettlement(t *testing.T, operatorContextID, partnerID string, gross, fee, net int64) *Settlement {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return nil
	}
	defer db.Close()
	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', $3::bigint, $4::bigint, $5::bigint, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		operatorContextID, partnerID, gross, fee, net,
	)
	settlement, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert tenant settlement: %v", err)
	}
	return settlement
}

func TestSettlementSummaryDoesNotAggregateAnotherTenant(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	partnerID := "shared-partner-" + suffix
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix

	for operatorContextID, gross := range map[string]int64{tenantA: 1000, tenantB: 9000} {
		if _, err := db.Exec(`
			INSERT INTO wlt_settlements
				(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
			VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', $3::bigint, 100::bigint, $3::bigint - 100::bigint, 'YER', 1, 'pending')`,
			operatorContextID, partnerID, gross,
		); err != nil {
			t.Fatalf("insert %s settlement: %v", operatorContextID, err)
		}
	}

	ctxA := shared.WithOperatorContext(context.Background(), tenantA)
	summary, err := ListSettlementSummaryGoverned(ctxA, db, partnerID, "2026-07-01", "2026-07-31")
	if err != nil {
		t.Fatalf("read tenant A summary: %v", err)
	}
	if summary.SettlementCount != 1 || summary.TotalGross != 1000 {
		t.Fatalf("tenant A summary leaked tenant B: count=%d gross=%d", summary.SettlementCount, summary.TotalGross)
	}
}

func TestPostSettlementCannotMutateAnotherTenant(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix
	partnerID := "partner-" + suffix

	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, DATE '2026-07-01', DATE '2026-07-31', 2000, 200, 1800, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		tenantB, partnerID,
	)
	settlementB, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert tenant B settlement: %v", err)
	}

	ctxA := shared.WithOperatorContext(context.Background(), tenantA)
	posted, err := postSettlement(ctxA, db, settlementB.ID)
	if err != nil {
		t.Fatalf("cross-tenant post should be indistinguishable from not found, got %v", err)
	}
	if posted != nil {
		t.Fatalf("tenant A received tenant B settlement: %+v", posted)
	}
}
