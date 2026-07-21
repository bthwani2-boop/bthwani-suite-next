package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionReassignsBeforePickupAtomicallyDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-reassign-" + suffix
	storeID := "reassign-store-" + suffix
	oldCaptainID := "reassign-old-captain-" + suffix
	newCaptainID := "reassign-new-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Reassign Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash)
		VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('a',64)) RETURNING id::text`, tenantID, clientID, storeID, "reassign-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout: %v", err)
	}
	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'driver_arrived_store',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "reassign-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}
	var oldAssignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, oldCaptainID).Scan(&oldAssignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'driver_arrived_store')`, oldAssignmentID, orderID, oldCaptainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	item, err := ReportDeliveryException(db, oldAssignmentID, oldCaptainID, ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionVehicleBreakdown,
		Note:          "تعطلت المركبة قبل استلام الطلب",
		CorrelationID: "reassign-command-" + suffix,
	})
	if err != nil {
		t.Fatalf("report exception: %v", err)
	}
	resolved, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
	if err != nil {
		t.Fatalf("resolve reassign: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved || resolved.ReplacementAssignmentID == nil || resolved.ReplacementCaptainID == nil || *resolved.ReplacementCaptainID != newCaptainID {
		t.Fatalf("unexpected reassignment result: %+v", resolved)
	}

	var oldAssignmentStatus, oldDeliveryStatus, orderStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_assignments WHERE id=$1::uuid`, oldAssignmentID).Scan(&oldAssignmentStatus); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT status FROM dsh_deliveries WHERE assignment_id=$1::uuid`, oldAssignmentID).Scan(&oldDeliveryStatus); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id=$1::uuid`, orderID).Scan(&orderStatus); err != nil {
		t.Fatal(err)
	}
	if oldAssignmentStatus != "cancelled" || oldDeliveryStatus != "cancelled" || orderStatus != "driver_assigned" {
		t.Fatalf("atomic statuses mismatch: assignment=%s delivery=%s order=%s", oldAssignmentStatus, oldDeliveryStatus, orderStatus)
	}

	var replacementStatus, replacementDeliveryStatus, replacementCaptain string
	if err := db.QueryRow(`SELECT a.status,d.status,a.captain_id FROM dsh_assignments a JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, *resolved.ReplacementAssignmentID).Scan(&replacementStatus, &replacementDeliveryStatus, &replacementCaptain); err != nil {
		t.Fatal(err)
	}
	if replacementStatus != "offered" || replacementDeliveryStatus != "assigned" || replacementCaptain != newCaptainID {
		t.Fatalf("replacement assignment mismatch: %s %s %s", replacementStatus, replacementDeliveryStatus, replacementCaptain)
	}

	oldInbox, err := ListCaptainAssignments(db, oldCaptainID, 50)
	if err != nil {
		t.Fatal(err)
	}
	newInbox, err := ListCaptainAssignments(db, newCaptainID, 50)
	if err != nil {
		t.Fatal(err)
	}
	if len(oldInbox) != 0 || len(newInbox) != 1 || newInbox[0].ID != *resolved.ReplacementAssignmentID {
		t.Fatalf("captain inboxes not switched atomically: old=%+v new=%+v", oldInbox, newInbox)
	}

	replayed, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
	if err != nil || replayed.ReplacementAssignmentID == nil || *replayed.ReplacementAssignmentID != *resolved.ReplacementAssignmentID {
		t.Fatalf("expected idempotent resolved reassignment, got %+v err=%v", replayed, err)
	}
}

func TestDeliveryExceptionRejectsReassignmentAfterPickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-reassign-blocked-" + suffix
	storeID := "reassign-blocked-store-" + suffix
	captainID := "reassign-blocked-captain-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Blocked Reassign Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('b',64)) RETURNING id::text`, tenantID, clientID, storeID, "blocked-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "blocked-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	var assignmentID string
	if err := db.QueryRow(`INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at) VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'picked_up')`, assignmentID, orderID, captainID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})
	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{ReasonCode: ExceptionVehicleBreakdown, Note: "تعطل بعد استلام الطلب", CorrelationID: "blocked-reassign-" + suffix})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ResolveDeliveryExceptionReassignCaptain(db, item.ID, item.Version, "other-captain", "محاولة إعادة إسناد غير مسموحة", "operator-1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected reassignment conflict after pickup, got %v", err)
	}
}
