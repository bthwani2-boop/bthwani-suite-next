package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDeliveryExceptionBlocksProgressButAllowsLocationDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-delivery-exception-" + suffix
	storeID := "delivery-exception-store-" + suffix
	captainID := "delivery-exception-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`
		INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible)
		VALUES($1,$1,'Delivery Exception Store','active','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(
			tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,
			subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash
		) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('e',64))
		RETURNING id::text`, tenantID, clientID, storeID, "delivery-exception-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout intent: %v", err)
	}

	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(tenant_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'arrived_customer',$5)
		RETURNING id::text`, tenantID, checkoutIntentID, storeID, clientID, "delivery-exception-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}

	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,'operator-test','accepted',NOW()+INTERVAL '90 seconds',NOW())
		RETURNING id::text`, orderID, captainID).Scan(&assignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status)
		VALUES($1::uuid,$2::uuid,$3,'arrived_customer')`, assignmentID, orderID, captainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_orders WHERE id=$1::uuid`, orderID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, checkoutIntentID)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	correlationID := "delivery-exception-command-" + suffix
	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionCustomerUnreachable,
		Note:          "اتصل الكابتن عدة مرات دون استجابة",
		CorrelationID: correlationID,
	})
	if err != nil {
		t.Fatalf("report delivery exception: %v", err)
	}
	if item.Status != DeliveryExceptionOpen || item.DeliveryStatusAtReport != DeliveryArrivedCustomer {
		t.Fatalf("unexpected exception state: %+v", item)
	}

	replayed, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionCustomerUnreachable,
		Note:          "اتصل الكابتن عدة مرات دون استجابة",
		CorrelationID: correlationID,
	})
	if err != nil || replayed.ID != item.ID {
		t.Fatalf("expected idempotent replay of %s, got %+v err=%v", item.ID, replayed, err)
	}

	if _, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "blocked-proof"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected proof to be blocked by active exception, got %v", err)
	}

	if _, err := PushLocation(db, assignmentID, captainID, PushLocationInput{Latitude: 15.3694, Longitude: 44.1910}); err != nil {
		t.Fatalf("location must remain available during exception response: %v", err)
	}

	queue, err := ListOperatorDeliveryExceptions(db, DeliveryExceptionOpen, 100)
	if err != nil {
		t.Fatalf("list operator exceptions: %v", err)
	}
	found := false
	for _, candidate := range queue {
		if candidate.ID == item.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("reported exception missing from operator queue")
	}

	acknowledged, err := AcknowledgeDeliveryException(db, item.ID, item.Version, "operator-1")
	if err != nil {
		t.Fatalf("acknowledge delivery exception: %v", err)
	}
	if acknowledged.Status != DeliveryExceptionAcknowledged || acknowledged.AcknowledgedByActorID == nil {
		t.Fatalf("unexpected acknowledged state: %+v", acknowledged)
	}

	resolved, err := ResolveDeliveryExceptionRetrySameCaptain(db, item.ID, acknowledged.Version, "تم التواصل مع العميل والسماح بإعادة المحاولة", "operator-1")
	if err != nil {
		t.Fatalf("resolve delivery exception: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved || resolved.ResolutionAction == nil || *resolved.ResolutionAction != "retry_same_captain" {
		t.Fatalf("unexpected resolved state: %+v", resolved)
	}

	if _, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "retry-proof"}); err != nil {
		t.Fatalf("proof must reopen after operations resolution: %v", err)
	}

	replayedAfterResolution, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		ReasonCode:    ExceptionCustomerUnreachable,
		Note:          "اتصل الكابتن عدة مرات دون استجابة",
		CorrelationID: correlationID,
	})
	if err != nil || replayedAfterResolution.ID != item.ID || replayedAfterResolution.Status != DeliveryExceptionResolved {
		t.Fatalf("expected state-independent idempotent replay, got %+v err=%v", replayedAfterResolution, err)
	}
}
