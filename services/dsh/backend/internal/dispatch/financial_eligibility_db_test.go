package dispatch

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestGovernedDispatchRequiresUsableWltDecisionDBIntegration(t *testing.T) {
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
		t.Fatal("expected governed assignment to fail without a WLT decision")
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `
			DELETE FROM dsh_captain_financial_eligibility
			WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID)
	})

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			operator_context_id,captain_id,wlt_decision_id,eligible,reason_code,
			policy_version,evaluated_at,expires_at,last_financial_sync_at
		) VALUES($1,$2,$3,true,'WLT_DISPATCH_FINANCIALLY_ELIGIBLE','dispatch-balance@8',
			now()-interval '1 second',now()+interval '5 minutes',now())`,
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
			reason_code='WLT_WALLET_NOT_ACTIVE',
			evaluated_at=now()-interval '1 second',
			expires_at=now()+interval '5 minutes',
			last_financial_sync_at=now()
		WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID); err != nil {
		t.Fatalf("mark WLT decision ineligible: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err == nil {
		t.Fatal("expected governed acceptance to fail after WLT decision becomes ineligible")
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET eligible=true,
			wlt_decision_id='test-wlt-decision-restored',
			reason_code='WLT_DISPATCH_FINANCIALLY_ELIGIBLE',
			policy_version='unconfigured',
			evaluated_at=now()-interval '1 second',
			expires_at=$3,
			last_financial_sync_at=now()
		WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID, time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("set unconfigured decision: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err == nil {
		t.Fatal("expected unknown WLT policy version to fail closed")
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_captain_financial_eligibility
		SET policy_version='dispatch-balance@9',
			evaluated_at=now()-interval '2 seconds',
			expires_at=now()+interval '5 minutes',
			last_financial_sync_at=now()
		WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID); err != nil {
		t.Fatalf("restore usable WLT decision: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='accepted',accepted_at=now()
		WHERE id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("expected governed acceptance with usable WLT decision: %v", err)
	}
}
