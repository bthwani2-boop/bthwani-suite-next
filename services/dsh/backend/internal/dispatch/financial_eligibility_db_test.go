package dispatch

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestGovernedDispatchRequiresFreshWltEligibilityDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	assignmentID, captainID, _, _, _ := seedArrivedCustomerFixture(t, db, "wallet")
	ctx := context.Background()

	var operatorContextID string
	if err := db.QueryRowContext(ctx, `
		SELECT tenant_id
		FROM dsh_assignments
		WHERE id=$1::uuid`, assignmentID).Scan(&operatorContextID); err != nil {
		t.Fatalf("read assignment tenant: %v", err)
	}

	idempotencyKey := fmt.Sprintf("financial-eligibility-test:%s", assignmentID)
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET idempotency_key=$2
		WHERE id=$1::uuid`, assignmentID, idempotencyKey); err == nil {
		t.Fatal("expected governed assignment to fail without a WLT eligibility snapshot")
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `
			DELETE FROM dsh_captain_financial_eligibility
			WHERE tenant_id=$1 AND captain_id=$2`, operatorContextID, captainID)
	})

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			tenant_id,captain_id,wallet_id,wallet_status,available_balance_minor_units,
			minimum_dispatch_balance_minor_units,currency,eligible,ineligibility_reason,
			snapshot_reference,checked_at,expires_at
		) VALUES($1,$2,$3,'active',75000,50000,'YER',true,'',$4,now(),now()+interval '5 minutes')`,
		operatorContextID, captainID, "wallet-"+captainID, "test-wlt-readback"); err != nil {
		t.Fatalf("insert eligible WLT snapshot: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET idempotency_key=$2
		WHERE id=$1::uuid`, assignmentID, idempotencyKey); err != nil {
		t.Fatalf("expected governed assignment to accept fresh eligible snapshot: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='offered',accepted_at=NULL
		WHERE id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("prepare governed offer: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET eligible=false,ineligibility_reason='CAPTAIN_FINANCIAL_GUARANTEE_BELOW_MINIMUM',
			checked_at=now(),expires_at=now()+interval '5 minutes'
		WHERE tenant_id=$1 AND captain_id=$2`, operatorContextID, captainID); err != nil {
		t.Fatalf("mark WLT snapshot ineligible: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err == nil {
		t.Fatal("expected governed acceptance to fail after WLT eligibility becomes false")
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET eligible=true,ineligibility_reason='',available_balance_minor_units=75000,
			checked_at=now(),expires_at=$3
		WHERE tenant_id=$1 AND captain_id=$2`, operatorContextID, captainID, time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("restore eligible WLT snapshot: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("expected governed acceptance with fresh eligible snapshot: %v", err)
	}
}
