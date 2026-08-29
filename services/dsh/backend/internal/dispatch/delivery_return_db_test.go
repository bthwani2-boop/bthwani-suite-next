package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionReturnToStoreLifecycleDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "OperatorContext-return-" + suffix
	storeID := "return-store-" + suffix
	captainID := "return-captain-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Return Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(operator_context_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('c',64)) RETURNING id::text`, operatorContextID, clientID, storeID, "return-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(operator_context_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, operatorContextID, checkoutIntentID, storeID, clientID, "return-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	var assignmentID string
	if err := db.QueryRow(`INSERT INTO dsh_assignments(operator_context_id,order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at) VALUES($1,$2::uuid,$3,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, operatorContextID, orderID, captainID).Scan(&assignmentID); err != nil {
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

	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{OperatorContextID: operatorContextID, ReasonCode: ExceptionRecipientRefused, Note: "رفض العميل استلام الطلب بعد الوصول", IdempotencyKey: "return-command-key-" + suffix, CorrelationID: "return-command-" + suffix})
	if err != nil {
		t.Fatal(err)
	}
	returning, err := ResolveDeliveryExceptionReturnToStore(db, operatorContextID, item.ID, item.Version, "إعادة الطلب إلى المتجر بعد رفض المستلم", "operator-1")
	if err != nil {
		t.Fatalf("start return: %v", err)
	}
	if returning.ResolutionAction == nil || *returning.ResolutionAction != "return_to_store" || returning.ReturnStartedAt == nil || returning.ReturnedAt != nil {
		t.Fatalf("unexpected return start: %+v", returning)
	}
	var orderStatus, deliveryStatus, assignmentStatus string
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != "returning_to_store" || deliveryStatus != "returning_to_store" || assignmentStatus != "accepted" {
		t.Fatalf("return start mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus)
	}
	if _, err := PushLocationForOperatorContext(db, operatorContextID, assignmentID, captainID, PushLocationInput{Latitude: 15.37, Longitude: 44.19}); err != nil {
		t.Fatalf("GPS must remain active during return: %v", err)
	}
	visible, err := GetCaptainOpenDeliveryExceptionForOperatorContext(db, operatorContextID, assignmentID, captainID)
	if err != nil || visible.ID != item.ID {
		t.Fatalf("return decision must remain visible to captain: %+v err=%v", visible, err)
	}
	arrivalKey := "captain-return-arrive-key-" + suffix
	arrivalCorrelation := "captain-return-arrive-correlation-" + suffix
	arrived, err := CaptainArriveReturnToStoreForOperatorContext(db, operatorContextID, assignmentID, captainID, arrivalKey, arrivalCorrelation)
	if err != nil {
		t.Fatalf("captain arrive return: %v", err)
	}
	if arrived.ReturnArrivedAt == nil || arrived.ReturnedAt != nil {
		t.Fatalf("captain arrival must not complete store receipt: %+v", arrived)
	}
	arrivedReplay, err := CaptainArriveReturnToStoreForOperatorContext(db, operatorContextID, assignmentID, captainID, arrivalKey, arrivalCorrelation)
	if err != nil {
		t.Fatalf("captain arrival replay: %v", err)
	}
	if arrivedReplay.ID != arrived.ID || arrivedReplay.ReturnArrivedAt == nil || !arrivedReplay.ReturnArrivedAt.Equal(*arrived.ReturnArrivedAt) {
		t.Fatalf("captain arrival replay did not preserve canonical receipt: original=%+v replay=%+v", arrived, arrivedReplay)
	}
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != "return_arrived_store" || deliveryStatus != "return_arrived_store" || assignmentStatus != "accepted" {
		t.Fatalf("arrival handshake mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus)
	}
	partnerReturnKey := "partner-return-accept-key-" + suffix
	partnerReturnCorrelation := "partner-return-accept-correlation-" + suffix
	returned, err := AcceptReturnToStoreByPartner(db, operatorContextID, orderID, "partner-return-receipt-test", partnerReturnKey, partnerReturnCorrelation)
	if err != nil {
		t.Fatalf("partner accept return: %v", err)
	}
	if returned.ReturnedAt == nil || returned.ReturnAcceptedByActorID == nil {
		t.Fatalf("partner receipt was not recorded: %+v", returned)
	}
	returnedReplay, err := AcceptReturnToStoreByPartner(db, operatorContextID, orderID, "partner-return-receipt-test", partnerReturnKey, partnerReturnCorrelation)
	if err != nil {
		t.Fatalf("partner receipt replay: %v", err)
	}
	if returnedReplay.ID != returned.ID || returnedReplay.ReturnedAt == nil || !returnedReplay.ReturnedAt.Equal(*returned.ReturnedAt) || returnedReplay.ReturnAcceptedByActorID == nil || *returnedReplay.ReturnAcceptedByActorID != "partner-return-receipt-test" {
		t.Fatalf("partner receipt replay did not preserve the original canonical receipt: original=%+v replay=%+v", returned, returnedReplay)
	}
	if _, err := CaptainArriveReturnToStoreForOperatorContext(db, operatorContextID, assignmentID, captainID, partnerReturnKey, partnerReturnCorrelation); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing partner return key for captain arrival returned %v, want ErrIdempotencyConflict", err)
	}
	var arrivalEvents, receiptEvents int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_status_events WHERE order_id=$1::uuid AND from_status='returning_to_store' AND to_status='return_arrived_store'`, orderID).Scan(&arrivalEvents); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_status_events WHERE order_id=$1::uuid AND from_status='return_arrived_store' AND to_status='returned_to_store'`, orderID).Scan(&receiptEvents); err != nil {
		t.Fatal(err)
	}
	if arrivalEvents != 1 || receiptEvents != 1 {
		t.Fatalf("return replays duplicated lifecycle events: arrival=%d receipt=%d", arrivalEvents, receiptEvents)
	}
	if err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != "returned_to_store" || deliveryStatus != "returned_to_store" || assignmentStatus != "completed" {
		t.Fatalf("partner receipt completion mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus)
	}
	if _, err := GetCaptainOpenDeliveryExceptionForOperatorContext(db, operatorContextID, assignmentID, captainID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("accepted return must leave captain exception view, got %v", err)
	}
	inbox, err := ListCaptainAssignments(db, captainID, 50)
	if err != nil || len(inbox) != 0 {
		t.Fatalf("partner-accepted return remained active: %+v err=%v", inbox, err)
	}
}
