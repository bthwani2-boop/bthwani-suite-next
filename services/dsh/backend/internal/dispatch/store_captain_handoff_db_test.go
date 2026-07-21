package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"testing"
	"time"
)

type outboundHandoffFixture struct {
	AssignmentID    string
	CaptainID       string
	OrderID         string
	StoreID         string
	PartnerID       string
	CheckoutIntentID string
	CartID          string
}

func seedOutboundHandoffFixture(t *testing.T, db *sql.DB) outboundHandoffFixture {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	fixture := outboundHandoffFixture{
		CaptainID: "handoff-captain-" + suffix,
		StoreID:   "handoff-store-" + suffix,
		PartnerID: "handoff-partner-" + suffix,
	}
	clientID := "handoff-client-" + suffix
	tenantID := "handoff-tenant-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (id, legal_name_ar, display_name, legal_identity_number, primary_phone)
		VALUES ($1, 'شريك اختبار العهدة', 'Outbound Handoff Test Partner', $1, '700000001')`,
		fixture.PartnerID); err != nil {
		t.Fatalf("insert partner: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'Outbound Handoff Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		fixture.StoreID, fixture.PartnerID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active')
		RETURNING id::text`, clientID, fixture.StoreID).Scan(&fixture.CartID); err != nil {
		t.Fatalf("insert cart: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (
			tenant_id, client_id, cart_id, store_id, state, fulfillment_mode,
			payment_method, wlt_payment_session_id,
			subtotal_minor_units, delivery_fee_minor_units, discount_minor_units,
			total_minor_units, currency, pricing_snapshot_hash
		) VALUES (
			$1, $2, $3::uuid, $4, 'payment_pending', 'bthwani_delivery',
			'wallet', $5, 1000, 0, 0, 1000, 'YER', repeat('a', 64)
		) RETURNING id::text`,
		tenantID, clientID, fixture.CartID, fixture.StoreID, "wlt-handoff-"+suffix,
	).Scan(&fixture.CheckoutIntentID); err != nil {
		t.Fatalf("insert checkout intent: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (tenant_id, checkout_intent_id, store_id, fulfillment_mode, client_id, status)
		VALUES ($1, $2::uuid, $3, 'bthwani_delivery', $4, 'driver_assigned')
		RETURNING id::text`, tenantID, fixture.CheckoutIntentID, fixture.StoreID, clientID,
	).Scan(&fixture.OrderID); err != nil {
		t.Fatalf("insert order: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_assignments (order_id, captain_id, assigned_by, status, response_deadline_at, accepted_at)
		VALUES ($1::uuid, $2, 'operator-test', 'accepted', NOW() + interval '1 hour', NOW())
		RETURNING id::text`, fixture.OrderID, fixture.CaptainID,
	).Scan(&fixture.AssignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_deliveries (assignment_id, order_id, captain_id, status)
		VALUES ($1::uuid, $2::uuid, $3, 'driver_assigned')`,
		fixture.AssignmentID, fixture.OrderID, fixture.CaptainID); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_orders WHERE id = $1::uuid`, fixture.OrderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, fixture.CheckoutIntentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id = $1::uuid`, fixture.CartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, fixture.StoreID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, fixture.PartnerID)
	})
	return fixture
}

func TestOutboundStoreCaptainHandoffDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	arrived, err := UpdateDeliveryStatusGoverned(db, fixture.AssignmentID, fixture.CaptainID, DeliveryArrivedStore)
	if err != nil {
		t.Fatalf("captain arrival failed: %v", err)
	}
	if arrived.Delivery.Status != DeliveryArrivedStore {
		t.Fatalf("arrival status=%s want=%s", arrived.Delivery.Status, DeliveryArrivedStore)
	}

	var handoffStatus, orderStatus string
	if err := db.QueryRow(`
		SELECT h.status, o.status
		FROM dsh_store_captain_handoffs h
		JOIN dsh_orders o ON o.id = h.order_id
		WHERE h.assignment_id = $1::uuid`, fixture.AssignmentID,
	).Scan(&handoffStatus, &orderStatus); err != nil {
		t.Fatalf("read awaiting handoff: %v", err)
	}
	if handoffStatus != "awaiting_partner" || orderStatus != string(DeliveryArrivedStore) {
		t.Fatalf("after arrival handoff=%q order=%q", handoffStatus, orderStatus)
	}

	if _, err = UpdateDeliveryStatusGoverned(db, fixture.AssignmentID, fixture.CaptainID, DeliveryPickedUp); !errors.Is(err, ErrStoreHandoffRequired) {
		t.Fatalf("pickup before store confirmation error=%v want ErrStoreHandoffRequired", err)
	}

	if _, err = ConfirmStoreCaptainHandoff(db, fixture.OrderID, "wrong-store", "partner-actor"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("wrong-store confirmation error=%v want ErrNotFound", err)
	}

	confirmed, err := ConfirmStoreCaptainHandoff(db, fixture.OrderID, fixture.StoreID, "partner-actor")
	if err != nil {
		t.Fatalf("partner confirmation failed: %v", err)
	}
	if confirmed.Status != "partner_confirmed" || confirmed.PartnerConfirmedAt == nil {
		t.Fatalf("confirmed handoff=%+v", confirmed)
	}

	replayed, err := ConfirmStoreCaptainHandoff(db, fixture.OrderID, fixture.StoreID, "partner-actor")
	if err != nil {
		t.Fatalf("idempotent partner confirmation failed: %v", err)
	}
	if replayed.ID != confirmed.ID || replayed.Version != confirmed.Version {
		t.Fatalf("idempotent confirmation changed handoff: first=%+v replay=%+v", confirmed, replayed)
	}

	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id = $1::uuid`, fixture.OrderID).Scan(&orderStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != "store_handoff_confirmed" {
		t.Fatalf("order status after partner confirmation=%q", orderStatus)
	}

	pickedUp, err := UpdateDeliveryStatusGoverned(db, fixture.AssignmentID, fixture.CaptainID, DeliveryPickedUp)
	if err != nil {
		t.Fatalf("captain pickup failed: %v", err)
	}
	if pickedUp.Delivery.Status != DeliveryPickedUp {
		t.Fatalf("pickup status=%s want=%s", pickedUp.Delivery.Status, DeliveryPickedUp)
	}

	var captainConfirmedAt sql.NullTime
	if err := db.QueryRow(`
		SELECT status, captain_confirmed_at
		FROM dsh_store_captain_handoffs
		WHERE assignment_id = $1::uuid`, fixture.AssignmentID,
	).Scan(&handoffStatus, &captainConfirmedAt); err != nil {
		t.Fatal(err)
	}
	if handoffStatus != "completed" || !captainConfirmedAt.Valid {
		t.Fatalf("completed handoff status=%q captainConfirmed=%v", handoffStatus, captainConfirmedAt.Valid)
	}
}

func TestOutboundHandoffReassignmentSupersedesPriorAttemptDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)
	if _, err := UpdateDeliveryStatusGoverned(db, fixture.AssignmentID, fixture.CaptainID, DeliveryArrivedStore); err != nil {
		t.Fatalf("first captain arrival failed: %v", err)
	}

	newCaptainID := fixture.CaptainID + "-replacement"
	var newAssignmentID string
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE dsh_assignments SET status='cancelled', updated_at=NOW() WHERE id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`UPDATE dsh_deliveries SET status='cancelled', updated_at=NOW() WHERE assignment_id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`UPDATE dsh_orders SET status='driver_assigned', updated_at=NOW() WHERE id=$1::uuid`, fixture.OrderID); err != nil {
		t.Fatal(err)
	}
	if err = tx.QueryRow(`
		INSERT INTO dsh_assignments (order_id, captain_id, assigned_by, status, response_deadline_at, accepted_at)
		VALUES ($1::uuid, $2, 'operator-reassign-test', 'accepted', NOW() + interval '1 hour', NOW())
		RETURNING id::text`, fixture.OrderID, newCaptainID).Scan(&newAssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`
		INSERT INTO dsh_deliveries (assignment_id, order_id, captain_id, status)
		VALUES ($1::uuid, $2::uuid, $3, 'driver_assigned')`, newAssignmentID, fixture.OrderID, newCaptainID); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}

	if _, err = UpdateDeliveryStatusGoverned(db, newAssignmentID, newCaptainID, DeliveryArrivedStore); err != nil {
		t.Fatalf("replacement captain arrival failed: %v", err)
	}
	rows, err := db.Query(`
		SELECT assignment_id::text, status
		FROM dsh_store_captain_handoffs
		WHERE order_id=$1::uuid
		ORDER BY created_at`, fixture.OrderID)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	statuses := map[string]string{}
	for rows.Next() {
		var id, status string
		if err := rows.Scan(&id, &status); err != nil {
			t.Fatal(err)
		}
		statuses[id] = status
	}
	if statuses[fixture.AssignmentID] != "superseded" || statuses[newAssignmentID] != "awaiting_partner" {
		t.Fatalf("reassignment handoff states=%v", statuses)
	}
}
