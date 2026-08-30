package incident

import (
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func openIncidentRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestOperationalIncidentCommandReplayIsExactAndCollisionSafeDBIntegration(t *testing.T) {
	db := openIncidentRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "incident-context-" + suffix
	storeID := "incident-store-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,operator_context_id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$2,$1,'Incident Store','published','SAN','SAN-1','serviceable',true)`, storeID, operatorContextID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(operator_context_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('i',64)) RETURNING id::text`, operatorContextID, clientID, storeID, "incident-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(operator_context_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'pending',$5) RETURNING id::text`, operatorContextID, checkoutIntentID, storeID, clientID, "incident-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE order_id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	input := ReportInput{
		OrderID: orderID, OperatorContextID: operatorContextID,
		TargetEntityType: TargetOrder, TargetEntityID: orderID, IncidentType: TypeCancel,
		Reason: "governed incident cancellation", TicketReference: "ticket-" + suffix,
		ActorID: "operator-incident-1", ActorRole: "operator", CorrelationID: "incident-command-" + suffix,
		ReasonCode: "operational_failure", ReasonNote: "governed incident cancellation",
	}
	service := NewService(db)
	first, err := service.Report(t.Context(), input)
	if err != nil {
		t.Fatalf("first report: %v", err)
	}
	replay, err := service.Report(t.Context(), input)
	if err != nil || replay.ID != first.ID || replay.Status != StatusApplied {
		t.Fatalf("incident replay mismatch: first=%+v replay=%+v err=%v", first, replay, err)
	}
	collision := input
	collision.Reason = "different cancellation reason"
	if _, err := service.Report(t.Context(), collision); !errors.Is(err, ErrConflict) {
		t.Fatalf("incident command collision was not rejected: %v", err)
	}
	var incidents, cancellations int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_operational_incidents WHERE order_id=$1::uuid`, orderID).Scan(&incidents); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderID).Scan(&cancellations); err != nil {
		t.Fatal(err)
	}
	if incidents != 1 || cancellations != 1 {
		t.Fatalf("incident replay duplicated canonical records: incidents=%d cancellations=%d", incidents, cancellations)
	}
}
