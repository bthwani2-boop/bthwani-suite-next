package reconciliation

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

func reconciliationTestDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := strings.TrimSpace(os.Getenv("WLT_TEST_DATABASE_URL"))
	if databaseURL == "" {
		databaseURL = strings.TrimSpace(os.Getenv("DATABASE_URL"))
	}
	if databaseURL == "" {
		t.Skip("WLT test database is not configured")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open WLT test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		t.Fatalf("ping WLT test database: %v", err)
	}
	return db
}

func seedTenantReconciliationCase(t *testing.T, db *sql.DB, tenantID, suffix string) string {
	t.Helper()
	checkoutIntentID := "reconciliation-checkout-" + suffix
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		TenantID:         tenantID,
		ClientID:         "client-" + suffix,
		StoreID:          "store-" + suffix,
		PaymentMethod:    "wallet",
		AmountMinorUnits: 1000,
		Currency:         "YER",
		CartSnapshotHash: "snapshot-" + suffix,
		IdempotencyKey:   "session-idempotency-" + suffix,
		CorrelationID:    "session-correlation-" + suffix,
	})
	if err != nil {
		t.Fatalf("create payment session for %s: %v", tenantID, err)
	}
	var caseID string
	if err := db.QueryRow(`INSERT INTO wlt_reconciliation_cases
		(tenant_id,payment_session_id,operation,trigger_reason,status)
		VALUES ($1,$2,'capture','provider_result_unknown','open')
		RETURNING id`, tenantID, session.ID).Scan(&caseID); err != nil {
		t.Fatalf("create reconciliation case for %s: %v", tenantID, err)
	}
	return caseID
}

func TestPaymentReconciliationIsTenantLocal(t *testing.T) {
	db := reconciliationTestDB(t)
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	tenantA := "tenant-reconciliation-a-" + suffix
	tenantB := "tenant-reconciliation-b-" + suffix
	caseA := seedTenantReconciliationCase(t, db, tenantA, "a-"+suffix)
	caseB := seedTenantReconciliationCase(t, db, tenantB, "b-"+suffix)

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_reconciliation_cases WHERE tenant_id IN ($1,$2)`, tenantA, tenantB)
		_, _ = db.Exec(`DELETE FROM wlt_payment_sessions WHERE tenant_id IN ($1,$2)`, tenantA, tenantB)
	})

	ctxA := shared.WithTenantContext(context.Background(), tenantA)
	cases, err := ListCasesForTenant(ctxA, db, "open")
	if err != nil {
		t.Fatalf("list tenant A cases: %v", err)
	}
	seenA := false
	for _, item := range cases {
		if item.ID == caseB {
			t.Fatalf("tenant A list leaked tenant B reconciliation case")
		}
		if item.ID == caseA {
			seenA = true
		}
	}
	if !seenA {
		t.Fatalf("tenant A case was not returned")
	}

	foreign, err := GetCaseForTenant(ctxA, db, caseB)
	if err != nil {
		t.Fatalf("cross-tenant get should be indistinguishable from not found: %v", err)
	}
	if foreign != nil {
		t.Fatalf("tenant A read tenant B reconciliation case: %+v", foreign)
	}

	assigned, err := AssignCaseForTenant(ctxA, db, caseB, "operator-a")
	if err != nil {
		t.Fatalf("cross-tenant assign should be indistinguishable from not found: %v", err)
	}
	if assigned != nil {
		t.Fatalf("tenant A assigned tenant B reconciliation case: %+v", assigned)
	}

	assigned, err = AssignCaseForTenant(ctxA, db, caseA, "operator-a")
	if err != nil {
		t.Fatalf("assign tenant A case: %v", err)
	}
	if assigned == nil || assigned.AssignedToOperatorID != "operator-a" {
		t.Fatalf("tenant A assignment was not persisted: %+v", assigned)
	}
}
