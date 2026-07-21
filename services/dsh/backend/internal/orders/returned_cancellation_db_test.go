package orders

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestReturnedOrderCancellationCreatesOneGovernedFinancialHandoffDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusReturnedStore))
	correlationID := fmt.Sprintf("returned-order-cancel-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	input := CancellationInput{
		OrderID:       order.ID,
		ActorID:       "operator-return-closure-test",
		ActorRole:     "operator",
		ReasonCode:    "operational_failure",
		ReasonNote:    "returned order inspected and cannot be redelivered",
		CorrelationID: correlationID,
	}
	first, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("returned-order CancelOrder failed: %v", err)
	}
	second, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("returned-order idempotent replay failed: %v", err)
	}
	if first.Status != StatusCancelledByOperator || second.Status != StatusCancelledByOperator {
		t.Fatalf("expected operator cancellation, got first=%s second=%s", first.Status, second.Status)
	}

	var cancellationCount, outboxCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_checkout_financial_closure_outbox WHERE order_id=$1::uuid AND event_type='cancel_for_order'`, order.ID).Scan(&outboxCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 1 || outboxCount != 1 {
		t.Fatalf("expected one cancellation and one financial handoff, got cancellations=%d outbox=%d", cancellationCount, outboxCount)
	}

	projection, err := GetCancellation(db, order.ID)
	if err != nil {
		t.Fatalf("GetCancellation failed: %v", err)
	}
	if projection.ActorRole != "operator" || projection.ReasonCode != "operational_failure" {
		t.Fatalf("unexpected returned-order cancellation projection: %+v", projection)
	}
	if projection.FinancialClosureStatus != "pending" || projection.FinancialReference != "" {
		t.Fatalf("expected pending WLT handoff without fabricated reference, got status=%q ref=%q", projection.FinancialClosureStatus, projection.FinancialReference)
	}
}

func TestReturnedOrderCancellationRemainsForbiddenForClientAndPartnerDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	cases := []struct {
		role       string
		reasonCode string
	}{
		{role: "client", reasonCode: "other"},
		{role: "partner", reasonCode: "other"},
	}
	for _, tc := range cases {
		t.Run(tc.role, func(t *testing.T) {
			order, _ := seedOrderFixture(t, db, string(StatusReturnedStore))
			_, err := CancelOrder(db, CancellationInput{
				OrderID:       order.ID,
				ActorID:       tc.role + "-returned-order-test",
				ActorRole:     tc.role,
				ReasonCode:    tc.reasonCode,
				ReasonNote:    "returned orders require an operator financial decision",
				CorrelationID: fmt.Sprintf("returned-order-forbidden-%s-%d", tc.role, time.Now().UnixNano()),
			})
			if !errors.Is(err, ErrConflict) {
				t.Fatalf("expected returned order cancellation to remain forbidden for %s, got %v", tc.role, err)
			}
			var cancellationCount int
			if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
				t.Fatal(err)
			}
			if cancellationCount != 0 {
				t.Fatalf("forbidden %s cancellation created %d records", tc.role, cancellationCount)
			}
		})
	}
}
