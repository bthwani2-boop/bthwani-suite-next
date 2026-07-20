package pickup

import (
	"context"
	"testing"
	"time"
)

func TestResolvePartnerStageResumesAndCancelsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	ctx := context.Background()

	_, session := issuedSession(t, service, fixture)
	stage, err := ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageReady {
		t.Fatalf("expected ready after issue, got stage=%q err=%v", stage, err)
	}

	if err := service.NotifyCustomer(ctx, fixture.orderID, "partner-1", "partner", "stage-notify"); err != nil {
		t.Fatalf("notify customer: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageNotified {
		t.Fatalf("expected notified, got stage=%q err=%v", stage, err)
	}

	if err := service.CustomerArrived(ctx, fixture.orderID, "partner-1", "partner", "stage-arrived"); err != nil {
		t.Fatalf("customer arrived: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageCustomerArrived {
		t.Fatalf("expected customer_arrived, got stage=%q err=%v", stage, err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='pickup cancelled by operations',
		    cancelled_at=NOW()
		WHERE id=$1::uuid`, fixture.orderID); err != nil {
		t.Fatalf("cancel pickup order: %v", err)
	}
	cancelled, err := Get(db, session.ID)
	if err != nil {
		t.Fatalf("reload cancelled session: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "cancelled_by_operator", cancelled)
	if err != nil || stage != PartnerStageCancelled {
		t.Fatalf("expected cancelled, got stage=%q err=%v", stage, err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_pickup_sessions
		SET status='active', cancelled_at=NULL, cancellation_reason=NULL,
		    expires_at=$2, updated_at=NOW()
		WHERE id=$1`, session.ID, time.Now().UTC().Add(-time.Minute)); err != nil {
		t.Fatalf("force expiry: %v", err)
	}
	expired, err := Get(db, session.ID)
	if err != nil {
		t.Fatalf("reload expired session: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", expired)
	if err != nil || stage != PartnerStageReady {
		t.Fatalf("expected ready for expired code reissue, got stage=%q err=%v", stage, err)
	}
}
