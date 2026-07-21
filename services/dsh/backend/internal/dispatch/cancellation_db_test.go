package dispatch

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

func openDispatchRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestCancelledOrderRemovesCaptainTaskAndRejectsStaleAcceptDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-dispatch-cancel-" + suffix
	storeID := "dispatch-cancel-store-" + suffix
	captainID := "dispatch-cancel-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`
		INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible)
		VALUES($1,$1,'Dispatch Cancellation Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units, delivery_fee_minor_units, discount_minor_units, total_minor_units, currency, pricing_snapshot_hash)
		VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,
		       1000,0,0,1000,'YER',repeat('c',64))
		RETURNING id::text`, tenantID, clientID, storeID, "dispatch-cancel-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout intent: %v", err)
	}

	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'ready_for_pickup',$5)
		RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "dispatch-cancel-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}

	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at)
		VALUES($1::uuid,$2,'operator-test','offered',NOW()+INTERVAL '90 seconds')
		RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status)
		VALUES($1::uuid,$2::uuid,$3,'assigned')`, assignmentID, orderID, captainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	if _, err := db.Exec(`
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='cancelled while offered',
		    cancelled_at=NOW()
		WHERE id=$1::uuid`, orderID); err != nil {
		t.Fatalf("cancel order: %v", err)
	}

	if _, err := AcceptAssignment(db, assignmentID, captainID); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected stale captain accept to return ErrConflict, got %v", err)
	}

	active, err := ListCaptainAssignments(db, captainID, 50)
	if err != nil {
		t.Fatalf("list captain assignments: %v", err)
	}
	if len(active) != 0 {
		t.Fatalf("cancelled assignment remained in captain inbox: %+v", active)
	}

	var assignmentStatus, deliveryStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&assignmentStatus); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT status FROM dsh_deliveries WHERE assignment_id=$1::uuid`, assignmentID).Scan(&deliveryStatus); err != nil {
		t.Fatal(err)
	}
	if assignmentStatus != "cancelled" || deliveryStatus != "cancelled" {
		t.Fatalf("dependent dispatch not cancelled: assignment=%s delivery=%s", assignmentStatus, deliveryStatus)
	}
}
