package orders

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

// TestOrderLifecycleOperatorContextNegativeSpaceDBIntegration proves the
// order write authority is fail-closed: every protected order writer must
// deny cross-context and context-less commands with zero persisted side
// effects, and replay identity must never cross operator contexts.
func TestOrderLifecycleOperatorContextNegativeSpaceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	// Context A and context B with structurally identical orders.
	orderA, _ := seedOrderFixture(t, db, string(StatusPreparing))
	orderB, _ := seedOrderFixture(t, db, string(StatusPreparing))

	if orderA.OperatorContextID == "" || orderB.OperatorContextID == "" || orderA.OperatorContextID == orderB.OperatorContextID {
		t.Fatalf("fixture must produce two distinct non-empty operator contexts, got %q and %q", orderA.OperatorContextID, orderB.OperatorContextID)
	}

	countEvents := func(orderID string) int {
		t.Helper()
		var n int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_order_status_events WHERE order_id=$1::uuid`, orderID).Scan(&n); err != nil {
			t.Fatalf("count status events: %v", err)
		}
		return n
	}
	statusOf := func(orderID string) string {
		t.Helper()
		var s string
		if err := db.QueryRowContext(ctx, `SELECT status FROM dsh_orders WHERE id=$1::uuid`, orderID).Scan(&s); err != nil {
			t.Fatalf("read order status: %v", err)
		}
		return s
	}

	t.Run("dispatch transition is denied across contexts", func(t *testing.T) {
		eventsBefore := countEvents(orderB.ID)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback() //nolint:errcheck
		if _, err := TransitionDispatchOrder(tx, orderA.OperatorContextID, orderB.ID, "captain-1", "captain",
			[]OrderStatus{StatusPreparing}, StatusReadyForPickup, "cross-context attempt"); !errors.Is(err, ErrNotFound) {
			t.Fatalf("cross-context transition error = %v, want ErrNotFound", err)
		}
		if err := tx.Rollback(); err != nil {
			t.Fatal(err)
		}
		if got := statusOf(orderB.ID); got != string(StatusPreparing) {
			t.Fatalf("cross-context denial must not mutate order, status=%s", got)
		}
		if got := countEvents(orderB.ID); got != eventsBefore {
			t.Fatalf("cross-context denial must not write status events, events=%d want=%d", got, eventsBefore)
		}
	})

	t.Run("dispatch transition fails closed without context", func(t *testing.T) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback() //nolint:errcheck
		if _, err := TransitionDispatchOrder(tx, "", orderA.ID, "captain-1", "captain",
			[]OrderStatus{StatusPreparing}, StatusReadyForPickup, "contextless attempt"); !errors.Is(err, ErrInvalid) {
			t.Fatalf("contextless transition error = %v, want ErrInvalid", err)
		}
	})

	t.Run("cancellation case is denied across contexts", func(t *testing.T) {
		cancellationsBefore := countRows(t, db, `SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderB.ID)
		if _, err := CreateCancellationCase(db, CreateCancellationCaseInput{
			OrderID:           orderB.ID,
			OperatorContextID: orderA.OperatorContextID,
			ActorID:           "operator-cross",
			ActorRole:         "operator",
			ReasonCode:        "other",
			ReasonNote:        "cross-context cancellation attempt",
			CorrelationID:     "negative-cross-context-cancel",
		}); !errors.Is(err, ErrNotFound) {
			t.Fatalf("cross-context cancellation error = %v, want ErrNotFound", err)
		}
		assertCount(t, db, "cancellation rows after cross-context denial", cancellationsBefore,
			`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderB.ID)
	})

	t.Run("cancellation case fails closed without context", func(t *testing.T) {
		if _, err := CreateCancellationCase(db, CreateCancellationCaseInput{
			OrderID:       orderB.ID,
			ActorID:       "operator-ctxless",
			ActorRole:     "operator",
			ReasonCode:    "other",
			CorrelationID: "negative-contextless-cancel",
		}); !errors.Is(err, ErrInvalid) {
			t.Fatalf("contextless cancellation error = %v, want ErrInvalid", err)
		}
	})

	t.Run("same cancellation correlation is isolated per context", func(t *testing.T) {
		const sharedCorrelation = "negative-shared-correlation"
		first, err := CreateCancellationCase(db, CreateCancellationCaseInput{
			OrderID:           orderA.ID,
			OperatorContextID: orderA.OperatorContextID,
			ActorID:           "operator-a",
			ActorRole:         "operator",
			ReasonCode:        "other",
			CorrelationID:     sharedCorrelation,
		})
		if err != nil {
			t.Fatalf("context A cancellation failed: %v", err)
		}
		second, err := CreateCancellationCase(db, CreateCancellationCaseInput{
			OrderID:           orderB.ID,
			OperatorContextID: orderB.OperatorContextID,
			ActorID:           "operator-b",
			ActorRole:         "operator",
			ReasonCode:        "other",
			CorrelationID:     sharedCorrelation,
		})
		if err != nil {
			t.Fatalf("context B cancellation with the same correlation must not collide: %v", err)
		}
		if first.ID == second.ID {
			t.Fatal("same correlation in different contexts must produce distinct cases")
		}
	})

	t.Run("return case is denied across contexts", func(t *testing.T) {
		if _, err := db.ExecContext(ctx, `UPDATE dsh_orders SET status=$2 WHERE id=$1::uuid`, orderB.ID, string(StatusDelivered)); err != nil {
			t.Fatal(err)
		}
		returnsBefore := countRows(t, db, `SELECT COUNT(*) FROM dsh_order_returns WHERE order_id=$1::uuid`, orderB.ID)
		if _, err := CreateReturnCase(db, CreateReturnCaseInput{
			OrderID:           orderB.ID,
			OperatorContextID: orderA.OperatorContextID,
			ActorID:           "operator-cross-return",
			ActorRole:         "operator",
			ReasonCode:        "damaged",
			CorrelationID:     "negative-cross-return",
			Items:             []ReturnItemInput{{OrderItemID: "item-1", Quantity: 1}},
		}); !errors.Is(err, ErrNotFound) {
			t.Fatalf("cross-context return error = %v, want ErrNotFound", err)
		}
		assertCount(t, db, "return rows after cross-context denial", returnsBefore,
			`SELECT COUNT(*) FROM dsh_order_returns WHERE order_id=$1::uuid`, orderB.ID)
	})

	t.Run("partner decision is denied across contexts", func(t *testing.T) {
		decisionsBefore := countRows(t, db, `SELECT COUNT(*) FROM dsh_partner_order_decisions WHERE order_id=$1::uuid`, orderB.ID)
		if _, err := DecidePartnerOrder(db, DecidePartnerOrderInput{
			OperatorContextID: orderA.OperatorContextID,
			OrderID:           orderB.ID,
			StoreID:           orderB.StoreID,
			ActorID:           "partner-cross",
			Decision:          "accept",
			ExpectedVersion:   orderB.Version,
			IdempotencyKey:    "negative-cross-decision",
		}); !errors.Is(err, ErrNotFound) {
			t.Fatalf("cross-context decision error = %v, want ErrNotFound", err)
		}
		assertCount(t, db, "decision rows after cross-context denial", decisionsBefore,
			`SELECT COUNT(*) FROM dsh_partner_order_decisions WHERE order_id=$1::uuid`, orderB.ID)
	})

	t.Run("partner preparation transition is denied across contexts", func(t *testing.T) {
		eventsBefore := countEvents(orderB.ID)
		var orderBVersion int
		if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_orders WHERE id=$1::uuid`, orderB.ID).Scan(&orderBVersion); err != nil {
			t.Fatal(err)
		}
		if _, err := TransitionPartnerPreparation(db, PartnerPreparationTransitionInput{
			OperatorContextID: orderA.OperatorContextID,
			OrderID:           orderB.ID,
			StoreID:           orderB.StoreID,
			ActorID:           "partner-cross-prep",
			Operation:         "ready",
			ExpectedVersion:   orderBVersion,
			IdempotencyKey:    "negative-cross-preparation",
		}); !errors.Is(err, ErrNotFound) {
			t.Fatalf("cross-context preparation error = %v, want ErrNotFound", err)
		}
		if got := countEvents(orderB.ID); got != eventsBefore {
			t.Fatalf("cross-context preparation denial wrote %d events, want %d", got, eventsBefore)
		}
	})
}

func countRows(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRowContext(context.Background(), query, args...).Scan(&n); err != nil {
		t.Fatalf("count query failed: %v", err)
	}
	return n
}

func assertCount(t *testing.T, db *sql.DB, label string, expected int, query string, args ...any) {
	t.Helper()
	if got := countRows(t, db, query, args...); got != expected {
		t.Fatalf("%s: %d, want %d", label, got, expected)
	}
}
