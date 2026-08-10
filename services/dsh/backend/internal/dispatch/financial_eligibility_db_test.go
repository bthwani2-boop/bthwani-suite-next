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
		SELECT operator_context_id
		FROM dsh_assignments
		WHERE id=$1::uuid`, assignmentID).Scan(&operatorContextID); err != nil {
		t.Fatalf("read assignment OperatorContext: %v", err)
	}

	idempotencyKey := fmt.Sprintf("financial-eligibility-test:%s", assignmentID)
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET idempotency_key=$2
		WHERE id=$1::uuid`, assignmentID, idempotencyKey); err == nil {
		t.Fatal("expected governed assignment to fail without a WLT eligibility decision")
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `
			DELETE FROM dsh_captain_financial_eligibility
			WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID)
	})

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			operator_context_id,captain_id,wlt_decision_id,wlt_reason_code,wlt_policy_version,
			eligible,ineligibility_reason,snapshot_reference,checked_at,evaluated_at,expires_at
		) VALUES($1,$2,$3,'WLT_WALLET_ACTIVE','wallet-status@1',true,'',$3,now(),now(),now()+interval '5 minutes')`,
		operatorContextID, captainID, "test-wlt-decision"); err != nil {
		t.Fatalf("insert eligible WLT decision: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET idempotency_key=$2
		WHERE id=$1::uuid`, assignmentID, idempotencyKey); err != nil {
		t.Fatalf("expected governed assignment to accept fresh eligible decision: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='offered',accepted_at=NULL
		WHERE id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("prepare governed offer: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET eligible=false,
			wlt_reason_code='WLT_WALLET_NOT_ACTIVE',
			ineligibility_reason='WLT_WALLET_NOT_ACTIVE',
			checked_at=now(),evaluated_at=now(),expires_at=now()+interval '5 minutes'
		WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID); err != nil {
		t.Fatalf("mark WLT decision ineligible: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err == nil {
		t.Fatal("expected governed acceptance to fail after WLT eligibility becomes false")
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET eligible=true,
			wlt_decision_id='test-wlt-decision-restored',
			wlt_reason_code='WLT_WALLET_ACTIVE',
			wlt_policy_version='wallet-status@1',
			ineligibility_reason='',
			snapshot_reference='test-wlt-decision-restored',
			checked_at=now(),evaluated_at=now(),expires_at=$3
		WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID, time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("restore eligible WLT decision: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("expected governed acceptance with fresh eligible decision: %v", err)
	}
}
