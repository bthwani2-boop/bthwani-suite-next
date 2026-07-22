package orders

import (
	"fmt"
	"testing"
	"time"
)

func TestCancellationOutboxPersistsCommandCorrelationDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPending))
	correlationID := fmt.Sprintf("jrn019-correlation-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	if _, err := CancelOrder(db, CancellationInput{
		OrderID:       order.ID,
		ActorID:       order.ClientID,
		ActorRole:     "client",
		ReasonCode:    "changed_mind",
		CorrelationID: correlationID,
	}); err != nil {
		t.Fatalf("CancelOrder failed: %v", err)
	}

	var storedCorrelation string
	if err := db.QueryRow(`
		SELECT correlation_id
		FROM dsh_checkout_financial_closure_outbox
		WHERE order_id=$1::uuid AND event_type='cancel_for_order'`, order.ID).Scan(&storedCorrelation); err != nil {
		t.Fatalf("failed to read cancellation outbox correlation: %v", err)
	}
	if storedCorrelation != correlationID {
		t.Fatalf("stored correlation=%q want %q", storedCorrelation, correlationID)
	}
}
