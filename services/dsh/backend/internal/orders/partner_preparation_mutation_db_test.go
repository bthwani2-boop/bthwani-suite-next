package orders

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

func TestPartnerPreparationTransitionIsReplaySafeAndStoreScoped(t *testing.T) {
	db := openRequiredDB(t)
	order, _ := seedOrderFixture(t, db, string(StatusStoreAccepted))
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders
		SET accepted_at=NOW(), estimated_ready_at=NOW()+INTERVAL '25 minutes',
		    estimated_preparation_minutes=25, preparation_warning_minutes=5
		WHERE id=$1::uuid`, order.ID); err != nil {
		t.Fatalf("seed accepted preparation timing: %v", err)
	}
	var version int
	if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_orders WHERE id=$1::uuid`, order.ID).Scan(&version); err != nil {
		t.Fatalf("read initial order version: %v", err)
	}
	input := PartnerPreparationTransitionInput{
		OperatorContextID: order.OperatorContextID,
		OrderID:           order.ID, StoreID: order.StoreID, ActorID: "partner-transition-actor",
		Operation: "prepare", ExpectedVersion: version, IdempotencyKey: "prepare-replay-" + order.ID[:8],
	}
	first, err := TransitionPartnerPreparation(db, input)
	if err != nil {
		t.Fatalf("first preparation transition: %v", err)
	}
	if first.Status != StatusPreparing || first.Version != version+1 {
		t.Fatalf("first transition = status %s version %d, want preparing/%d", first.Status, first.Version, version+1)
	}
	replay, err := TransitionPartnerPreparation(db, input)
	if err != nil {
		t.Fatalf("idempotent preparation replay: %v", err)
	}
	if replay.Status != first.Status || replay.Version != first.Version {
		t.Fatalf("replay = status %s version %d, want original status/version", replay.Status, replay.Version)
	}
	var eventCount, receiptCount int
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM dsh_order_status_events
		WHERE order_id=$1::uuid AND from_status='store_accepted' AND to_status='preparing'`, order.ID).Scan(&eventCount); err != nil {
		t.Fatalf("count preparation events: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM dsh_partner_order_transition_receipts
		WHERE order_id=$1::uuid AND idempotency_key=$2`, order.ID, input.IdempotencyKey).Scan(&receiptCount); err != nil {
		t.Fatalf("count preparation receipts: %v", err)
	}
	if eventCount != 1 || receiptCount != 1 {
		t.Fatalf("side effects after replay = events %d receipts %d, want 1/1", eventCount, receiptCount)
	}

	if _, err := TransitionPartnerPreparation(db, PartnerPreparationTransitionInput{
		OperatorContextID: order.OperatorContextID,
		OrderID:           order.ID, StoreID: order.StoreID, ActorID: input.ActorID,
		Operation: "ready", ExpectedVersion: version, IdempotencyKey: "stale-ready-" + order.ID[:8],
	}); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale transition error = %v, want ErrConflict", err)
	}
	if _, err := TransitionPartnerPreparation(db, PartnerPreparationTransitionInput{
		OperatorContextID: order.OperatorContextID,
		OrderID:           order.ID, StoreID: "different-store", ActorID: input.ActorID,
		Operation: "ready", ExpectedVersion: first.Version, IdempotencyKey: "cross-store-" + order.ID[:8],
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-store transition error = %v, want ErrNotFound", err)
	}
}

func TestPartnerReadyTransitionRejectsOpenPreparationIssue(t *testing.T) {
	db := openRequiredDB(t)
	order, _ := seedOrderFixture(t, db, string(StatusPreparing))
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders
		SET accepted_at=NOW()-INTERVAL '5 minutes', preparation_started_at=NOW()-INTERVAL '2 minutes',
		    estimated_ready_at=NOW()+INTERVAL '23 minutes', estimated_preparation_minutes=25,
		    preparation_warning_minutes=5
		WHERE id=$1::uuid`, order.ID); err != nil {
		t.Fatalf("seed preparing timing: %v", err)
	}
	var version int
	if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_orders WHERE id=$1::uuid`, order.ID).Scan(&version); err != nil {
		t.Fatalf("read preparing order version: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_order_preparation_issues
		(order_id, store_id, issue_kind, affected_quantity, note, opened_by_actor_id, correlation_id)
		VALUES ($1::uuid, $2, 'other', 1, 'missing governed item', 'partner-ready-actor', $3)`,
		order.ID, order.StoreID, fmt.Sprintf("open-ready-%s", order.ID)); err != nil {
		t.Fatalf("insert open preparation issue: %v", err)
	}
	_, err := TransitionPartnerPreparation(db, PartnerPreparationTransitionInput{
		OperatorContextID: order.OperatorContextID,
		OrderID:           order.ID, StoreID: order.StoreID, ActorID: "partner-ready-actor",
		Operation: "ready", ExpectedVersion: version, IdempotencyKey: "ready-issue-" + order.ID[:8],
	})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("ready with open issue error = %v, want ErrConflict", err)
	}
	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM dsh_orders WHERE id=$1::uuid`, order.ID).Scan(&status); err != nil {
		t.Fatalf("read order after blocked ready: %v", err)
	}
	if status != string(StatusPreparing) {
		t.Fatalf("order status after blocked ready = %s, want preparing", status)
	}
}
