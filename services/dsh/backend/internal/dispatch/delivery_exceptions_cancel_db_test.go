package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionCancelsOrderBeforePickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-cancel-" + suffix
	storeID := "cancel-store-" + suffix
	captainID := "cancel-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Cancel Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash)
		VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('c',64)) RETURNING id::text`, tenantID, clientID, storeID, "cancel-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout: %v", err)
	}
	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'driver_arrived_store',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "cancel-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}
	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'driver_arrived_store')`, assignmentID, orderID, captainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionVehicleBreakdown,
		Note:          "تعطلت المركبة قبل استلام الطلب من المتجر",
		CorrelationID: "cancel-command-" + suffix,
	})
	if err != nil {
		t.Fatalf("report exception: %v", err)
	}

	resolved, err := ResolveDeliveryExceptionCancelOrder(db, item.ID, item.Version, "تم تأكيد تعطل المركبة ولا يوجد كابتن بديل متاح", "operator-1")
	if err != nil {
		t.Fatalf("resolve cancel: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved || resolved.ResolutionAction == nil || *resolved.ResolutionAction != "cancel_order" {
		t.Fatalf("unexpected cancel resolution result: %+v", resolved)
	}

	var orderStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id=$1::uuid`, orderID).Scan(&orderStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != "cancelled_by_operator" {
		t.Fatalf("expected order cancelled_by_operator, got %s", orderStatus)
	}

	var cancellationCount int
	if err := db.QueryRow(`SELECT count(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 1 {
		t.Fatalf("expected exactly one governed cancellation record, got %d", cancellationCount)
	}

	replayed, err := ResolveDeliveryExceptionCancelOrder(db, item.ID, item.Version, "تم تأكيد تعطل المركبة ولا يوجد كابتن بديل متاح", "operator-1")
	if err != nil {
		t.Fatalf("expected idempotent replay to succeed, got %v", err)
	}
	if replayed.ID != resolved.ID || replayed.ResolutionAction == nil || *replayed.ResolutionAction != "cancel_order" {
		t.Fatalf("idempotent replay mismatch: %+v", replayed)
	}

	if err := db.QueryRow(`SELECT count(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 1 {
		t.Fatalf("replay must not create a second cancellation record, got %d", cancellationCount)
	}
}

func TestDeliveryExceptionRejectsDirectCancelAfterPickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-cancel-blocked-" + suffix
	storeID := "cancel-blocked-store-" + suffix
	captainID := "cancel-blocked-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Blocked Cancel Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('d',64)) RETURNING id::text`, tenantID, clientID, storeID, "cancel-blocked-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "cancel-blocked-payment-"+suffix).Scan(&orderID); err != nil {
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

	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{ReasonCode: ExceptionDamagedOrder, Note: "تضرر الطلب بعد الاستلام", CorrelationID: "cancel-blocked-" + suffix})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ResolveDeliveryExceptionCancelOrder(db, item.ID, item.Version, "محاولة إلغاء مباشر غير مسموحة بعد الاستلام", "operator-1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected conflict rejecting direct cancel after pickup, got %v", err)
	}
}

func TestDeliveryExceptionCancelRejectsStaleVersionDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-cancel-stale-" + suffix
	storeID := "cancel-stale-store-" + suffix
	captainID := "cancel-stale-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Stale Cancel Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('e',64)) RETURNING id::text`, tenantID, clientID, storeID, "cancel-stale-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'driver_assigned',$5) RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "cancel-stale-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	var assignmentID string
	if err := db.QueryRow(`INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at) VALUES($1::uuid,$2,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status) VALUES($1::uuid,$2::uuid,$3,'driver_assigned')`, assignmentID, orderID, captainID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_order_cancellations WHERE order_id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{ReasonCode: ExceptionOther, Note: "سبب آخر يستدعي المراجعة", CorrelationID: "cancel-stale-" + suffix})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ResolveDeliveryExceptionCancelOrder(db, item.ID, item.Version+1, "قرار إلغاء برقم إصدار غير صحيح", "operator-1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected version conflict, got %v", err)
	}
}
