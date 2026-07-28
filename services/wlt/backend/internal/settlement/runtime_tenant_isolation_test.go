package settlement

import (
	"context"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func insertTenantSettlement(t *testing.T, tenantID, partnerID string, gross, fee, net int64) *Settlement {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return nil
	}
	defer db.Close()
	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, '2026-07-01', '2026-07-31', $3, $4, $5, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		tenantID, partnerID, gross, fee, net,
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

	for tenantID, gross := range map[string]int64{tenantA: 1000, tenantB: 9000} {
		if _, err := db.Exec(`
			INSERT INTO wlt_settlements
				(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
			VALUES ($1, $2, '2026-07-01', '2026-07-31', $3, 100, $3 - 100, 'YER', 1, 'pending')`,
			tenantID, partnerID, gross,
		); err != nil {
			t.Fatalf("insert %s settlement: %v", tenantID, err)
		}
	}

	ctxA := shared.WithTenantContext(context.Background(), tenantA)
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
		VALUES ($1, $2, '2026-07-01', '2026-07-31', 2000, 200, 1800, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		tenantB, partnerID,
	)
	settlementB, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert tenant B settlement: %v", err)
	}

	ctxA := shared.WithTenantContext(context.Background(), tenantA)
	posted, err := postSettlement(ctxA, db, settlementB.ID)
	if err != nil {
		t.Fatalf("cross-tenant post should be indistinguishable from not found, got %v", err)
	}
	if posted != nil {
		t.Fatalf("tenant A received tenant B settlement: %+v", posted)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_settlements WHERE tenant_id=$1 AND id=$2`, tenantB, settlementB.ID).Scan(&status); err != nil {
		t.Fatalf("read tenant B settlement: %v", err)
	}
	if status != "pending" {
		t.Fatalf("tenant A mutated tenant B settlement status to %s", status)
	}
}

func TestPostSettlementLedgerCarriesSettlementTenant(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	tenantID := "tenant-ledger-" + suffix
	partnerID := "partner-ledger-" + suffix
	row := db.QueryRow(`
		INSERT INTO wlt_settlements
			(tenant_id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status)
		VALUES ($1, $2, '2026-07-01', '2026-07-31', 3000, 300, 2700, 'YER', 1, 'pending')
		RETURNING `+settlementCols,
		tenantID, partnerID,
	)
	settlement, err := scanSettlement(row)
	if err != nil {
		t.Fatalf("insert settlement: %v", err)
	}

	ctx := shared.WithTenantContext(context.Background(), tenantID)
	if _, err := postSettlement(ctx, db, settlement.ID); err != nil {
		t.Fatalf("post tenant settlement: %v", err)
	}
	var ledgerTenant string
	if err := db.QueryRow(`
		SELECT tenant_id FROM wlt_ledger_transactions
		WHERE tenant_id=$1 AND transaction_type='settlement_posted'
		  AND reference_type='settlement' AND reference_id=$2`, tenantID, settlement.ID).Scan(&ledgerTenant); err != nil {
		t.Fatalf("read settlement ledger tenant: %v", err)
	}
	if ledgerTenant != tenantID {
		t.Fatalf("ledger tenant=%q want %q", ledgerTenant, tenantID)
	}
}
