package dispatch

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/specialrequests"

	"github.com/google/uuid"
)

func TestDeliveryExceptionReassignsBeforePickupAtomicallyDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "OperatorContext-reassign-" + suffix
	storeID := "reassign-store-" + suffix
	oldCaptainID := "reassign-old-captain-" + suffix
	newCaptainID := "reassign-new-captain-" + suffix
	clientID := uuid.NewString()

	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Reassign Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_checkout_intents(operator_context_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash)
		VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('a',64)) RETURNING id::text`, operatorContextID, clientID, storeID, "reassign-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("insert checkout: %v", err)
	}
	var orderID string
	if err := db.QueryRow(`
		INSERT INTO dsh_orders(operator_context_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id)
		VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'driver_arrived_store',$5) RETURNING id::text`, operatorContextID, checkoutIntentID, storeID, clientID, "reassign-payment-"+suffix).Scan(&orderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}
	var oldAssignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(operator_context_id,order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1,$2::uuid,$3,'operator-1','accepted',NOW()+INTERVAL '90 seconds',NOW()) RETURNING id::text`, operatorContextID, orderID, oldCaptainID).Scan(&oldAssignmentID); err != nil {
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
		OperatorContextID: operatorContextID,
		ReasonCode:        ExceptionVehicleBreakdown,
		Note:              "تعطلت المركبة قبل استلام الطلب",
		IdempotencyKey:    "reassign-command-key-" + suffix,
		CorrelationID:     "reassign-command-" + suffix,
		ProofMediaRef:     "media://vehicle-breakdown/" + suffix,
	})
	if err != nil {
		t.Fatalf("report exception: %v", err)
	}
	resolved, err := ResolveDeliveryExceptionReassignCaptain(db, operatorContextID, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
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

	replayed, err := ResolveDeliveryExceptionReassignCaptain(db, operatorContextID, item.ID, item.Version, newCaptainID, "تم التحقق من العطل وإعادة الإسناد", "operator-1")
	if err != nil || replayed.ReplacementAssignmentID == nil || *replayed.ReplacementAssignmentID != *resolved.ReplacementAssignmentID {
		t.Fatalf("expected idempotent resolved reassignment, got %+v err=%v", replayed, err)
	}
}

func TestDeliveryExceptionRejectsReassignmentAfterPickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "OperatorContext-reassign-blocked-" + suffix
	storeID := "reassign-blocked-store-" + suffix
	captainID := "reassign-blocked-captain-" + suffix
	clientID := uuid.NewString()
	if _, err := db.Exec(`INSERT INTO dsh_stores(id,slug,display_name,status,city_code,service_area_code,serviceability_status,is_visible) VALUES($1,$1,'Blocked Reassign Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatal(err)
	}
	var checkoutIntentID string
	if err := db.QueryRow(`INSERT INTO dsh_checkout_intents(operator_context_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,pricing_snapshot_hash) VALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,1000,0,0,1000,'YER',repeat('b',64)) RETURNING id::text`, operatorContextID, clientID, storeID, "blocked-payment-"+suffix).Scan(&checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	var orderID string
	if err := db.QueryRow(`INSERT INTO dsh_orders(operator_context_id,checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id) VALUES($1,$2::uuid,$3,'bthwani_delivery',$4,'picked_up',$5) RETURNING id::text`, operatorContextID, checkoutIntentID, storeID, clientID, "blocked-payment-"+suffix).Scan(&orderID); err != nil {
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
	item, err := ReportDeliveryException(db, assignmentID, captainID, ReportDeliveryExceptionInput{
		OperatorContextID: operatorContextID,
		ReasonCode:        ExceptionVehicleBreakdown,
		Note:              "تعطل بعد استلام الطلب",
		IdempotencyKey:    "blocked-reassign-key-" + suffix,
		CorrelationID:     "blocked-reassign-" + suffix,
		ProofMediaRef:     "media://vehicle-breakdown/" + suffix,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ResolveDeliveryExceptionReassignCaptain(db, operatorContextID, item.ID, item.Version, "other-captain", "محاولة إعادة إسناد غير مسموحة", "operator-1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected reassignment conflict after pickup, got %v", err)
	}
}

func TestValidateReassignmentStateRejectsUnsafeStates(t *testing.T) {
	cancelOrder := "cancel_order"
	tests := []struct {
		name                string
		current             *DeliveryException
		expectedVersion     int
		newCaptainID        string
		note                string
		requireAcknowledged bool
		wantErr             error
	}{
		{
			name:                "open exception requires acknowledgement",
			current:             &DeliveryException{Status: DeliveryExceptionOpen, CaptainID: "captain-old", Version: 1},
			expectedVersion:     1,
			newCaptainID:        "captain-new",
			note:                "acknowledge before reassignment",
			requireAcknowledged: true,
			wantErr:             ErrConflict,
		},
		{
			name:            "resolved exception cannot change action",
			current:         &DeliveryException{Status: DeliveryExceptionResolved, CaptainID: "captain-old", Version: 2, ResolutionAction: &cancelOrder},
			expectedVersion: 2,
			newCaptainID:    "captain-new",
			note:            "reassign after resolution",
			wantErr:         ErrConflict,
		},
		{
			name:            "stale exception version is rejected",
			current:         &DeliveryException{Status: DeliveryExceptionAcknowledged, CaptainID: "captain-old", Version: 2},
			expectedVersion: 1,
			newCaptainID:    "captain-new",
			note:            "stale reassignment",
			wantErr:         ErrConflict,
		},
		{
			name:            "same captain is rejected",
			current:         &DeliveryException{Status: DeliveryExceptionAcknowledged, CaptainID: "captain-old", Version: 1},
			expectedVersion: 1,
			newCaptainID:    "captain-old",
			note:            "same captain reassignment",
			wantErr:         ErrInvalid,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := validateReassignmentState(tt.current, tt.expectedVersion, tt.newCaptainID, tt.note, tt.requireAcknowledged)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected %v, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestSpecialRequestDeliveryExceptionReassignsBeforePickupDBIntegration(t *testing.T) {
	db := openDispatchRequiredDB(t)
	specialRequestID, _ := newApprovedSpecialRequestFixture(t, db)
	oldCaptainID, actorID := newCaptainAndActor()
	assignment, err := CreateAssignmentForSpecialRequest(db, CreateAssignmentInput{
		SpecialRequestID:   specialRequestID,
		CaptainID:          oldCaptainID,
		ActorID:            actorID,
		OperatorContextID:  testSpecialRequestOperatorContextID,
	})
	if err != nil {
		t.Fatalf("create special-request assignment: %v", err)
	}
	if _, err := AcceptAssignment(db, testSpecialRequestOperatorContextID, assignment.ID, oldCaptainID); err != nil {
		t.Fatalf("accept special-request assignment: %v", err)
	}
	if _, err := testDeliveryStatusCommandCurrent(db, testSpecialRequestOperatorContextID, assignment.ID, oldCaptainID, DeliveryArrivedStore, "special-request-reassignment-arrival"); err != nil {
		t.Fatalf("advance special-request delivery to store: %v", err)
	}

	exception, err := ReportDeliveryException(db, assignment.ID, oldCaptainID, ReportDeliveryExceptionInput{
		OperatorContextID: testSpecialRequestOperatorContextID,
		ReasonCode:        ExceptionCustomerUnreachable,
		Note:              "تعذر الوصول إلى العميل قبل استلام الطلب",
		IdempotencyKey:    "special-request-reassign-exception-" + assignment.ID,
		CorrelationID:     "special-request-reassign-correlation-" + assignment.ID,
	})
	if err != nil {
		t.Fatalf("report special-request exception: %v", err)
	}

	replacementCaptainID := oldCaptainID + "-replacement"
	note := "إعادة إسناد الطلب الخاص قبل الاستلام"
	resolved, err := ResolveDeliveryExceptionReassignCaptain(db, testSpecialRequestOperatorContextID, exception.ID, exception.Version, replacementCaptainID, note, actorID)
	if err != nil {
		t.Fatalf("resolve special-request reassignment: %v", err)
	}
	if resolved.Status != DeliveryExceptionResolved || resolved.ReplacementAssignmentID == nil || resolved.ReplacementCaptainID == nil || *resolved.ReplacementCaptainID != replacementCaptainID {
		t.Fatalf("unexpected special-request reassignment result: %+v", resolved)
	}

	request := getSpecialRequest(t, db, specialRequestID)
	if request.Status != specialrequests.StatusAssigned || request.DispatchAssignmentID == nil || *request.DispatchAssignmentID != *resolved.ReplacementAssignmentID {
		t.Fatalf("special-request readback mismatch: status=%s assignment=%v resolved=%v", request.Status, request.DispatchAssignmentID, resolved.ReplacementAssignmentID)
	}
}
