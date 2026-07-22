package partnerdelivery

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredDB(t *testing.T) *sql.DB {
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

// fixture bundles the ids of a freshly seeded partner_delivery order plus
// an eligible active courier belonging to its store, ready for
// AssignCourier's happy path.
type fixture struct {
	tenantID  string
	partnerID string
	storeID   string
	clientID  string
	orderID   string
	courierID string
}

func seedFixture(t *testing.T, db *sql.DB, orderStatus string) fixture {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	f := fixture{
		tenantID:  "pd-test-tenant-" + suffix,
		partnerID: "pd-test-partner-" + suffix,
		storeID:   "pd-test-store-" + suffix,
		clientID:  "pd-test-client-" + suffix,
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (id, legal_name_ar, display_name, legal_identity_number, primary_phone)
		VALUES ($1, 'شريك اختبار', 'PD Test Partner', $1, '700000001')`,
		f.partnerID); err != nil {
		t.Fatalf("failed to insert test partner: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'PD Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		f.storeID, f.partnerID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'partner_delivery', 'active')
		RETURNING id::text`,
		f.clientID, f.storeID,
	).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	var checkoutIntentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (
			tenant_id, client_id, cart_id, store_id, state, fulfillment_mode, payment_method,
			subtotal_minor_units, delivery_fee_minor_units, discount_minor_units,
			total_minor_units, currency, pricing_snapshot_hash
		)
		VALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'partner_delivery', 'wallet',
		        1000, 0, 0, 1000, 'YER', repeat('d', 64))
		RETURNING id::text`,
		f.tenantID, f.clientID, cartID, f.storeID,
	).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (tenant_id, checkout_intent_id, store_id, fulfillment_mode, client_id, status)
		VALUES ($1, $2::uuid, $3, 'partner_delivery', $4, $5)
		RETURNING id::text`,
		f.tenantID, checkoutIntentID, f.storeID, f.clientID, orderStatus,
	).Scan(&f.orderID); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_store_team_members (store_id, name, role, status)
		VALUES ($1, 'Test Courier', 'courier', 'active')
		RETURNING id`,
		f.storeID,
	).Scan(&f.courierID); err != nil {
		t.Fatalf("failed to insert test courier: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partner_delivery_audit_events WHERE entity_id IN (SELECT id FROM dsh_partner_delivery_tasks WHERE order_id = $1::uuid)`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_operational_outbox_events WHERE entity_type = 'partner_delivery_task' AND entity_id IN (SELECT id FROM dsh_partner_delivery_tasks WHERE order_id = $1::uuid)`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partner_delivery_tasks WHERE order_id = $1::uuid`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_team_members WHERE store_id = $1`, f.storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_orders WHERE id = $1::uuid`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, checkoutIntentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id = $1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, f.storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, f.partnerID)
	})

	return f
}

func readOrderStatus(t *testing.T, db *sql.DB, orderID string) string {
	t.Helper()
	var status string
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id = $1::uuid`, orderID).Scan(&status); err != nil {
		t.Fatalf("failed to read order status: %v", err)
	}
	return status
}

func TestAssignCourierBeforeReadyRejectedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "preparing")

	svc := NewService(db)
	_, err := svc.AssignCourier(context.Background(), f.orderID, f.courierID, "operator-1", "operator", "")
	if !errors.Is(err, ErrNotReadyForAssignment) {
		t.Fatalf("expected ErrNotReadyForAssignment, got %v", err)
	}
}

func TestAssignCourierIneligibleCourierRejectedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()

	// Wrong role.
	var staffID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_store_team_members (store_id, name, role, status)
		VALUES ($1, 'Test Staff', 'staff', 'active') RETURNING id`, f.storeID).Scan(&staffID); err != nil {
		t.Fatalf("failed to insert staff member: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_team_members WHERE id = $1`, staffID) })

	svc := NewService(db)
	if _, err := svc.AssignCourier(ctx, f.orderID, staffID, "operator-1", "operator", ""); !errors.Is(err, ErrCourierIneligible) {
		t.Fatalf("expected ErrCourierIneligible for wrong role, got %v", err)
	}

	// Wrong status (paused).
	var pausedCourierID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_store_team_members (store_id, name, role, status)
		VALUES ($1, 'Paused Courier', 'courier', 'paused') RETURNING id`, f.storeID).Scan(&pausedCourierID); err != nil {
		t.Fatalf("failed to insert paused courier: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_team_members WHERE id = $1`, pausedCourierID)
	})

	if _, err := svc.AssignCourier(ctx, f.orderID, pausedCourierID, "operator-1", "operator", ""); !errors.Is(err, ErrCourierIneligible) {
		t.Fatalf("expected ErrCourierIneligible for paused status, got %v", err)
	}

	// Wrong store: courier belongs to a different store entirely.
	other := seedFixture(t, db, "ready_for_pickup")
	if _, err := svc.AssignCourier(ctx, f.orderID, other.courierID, "operator-1", "operator", ""); !errors.Is(err, ErrCourierIneligible) {
		t.Fatalf("expected ErrCourierIneligible for cross-store courier, got %v", err)
	}
}

func TestAssignCourierDoubleAssignRejectedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)

	task, err := svc.AssignCourier(context.Background(), f.orderID, f.courierID, "operator-1", "operator", "")
	if err != nil {
		t.Fatalf("first AssignCourier failed: %v", err)
	}
	if task.Status != StatusAssigned {
		t.Fatalf("expected status assigned, got %s", task.Status)
	}

	if _, err := svc.AssignCourier(context.Background(), f.orderID, f.courierID, "operator-1", "operator", ""); !errors.Is(err, ErrAlreadyAssigned) {
		t.Fatalf("expected ErrAlreadyAssigned on double-assign, got %v", err)
	}
}

func TestAssignCourierVersionConflictOnConcurrentUpdateDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	task, err := svc.AssignCourier(ctx, f.orderID, f.courierID, "operator-1", "operator", "")
	if err != nil {
		t.Fatalf("AssignCourier failed: %v", err)
	}

	// Simulate a concurrent writer bumping the version out from under us.
	if _, err := db.ExecContext(ctx, `UPDATE dsh_partner_delivery_tasks SET version = version + 1, updated_at = NOW() WHERE id = $1`, task.ID); err != nil {
		t.Fatalf("failed to simulate concurrent update: %v", err)
	}

	if _, err := svc.MarkDeparted(ctx, task.ID, task.Version, "courier-1", "partner", ""); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected ErrVersionConflict, got %v", err)
	}
}

func TestPartnerDeliveryDepartureRequiresPickupDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	task, err := svc.AssignCourier(ctx, f.orderID, f.courierID, "operator-1", "operator", "corr-departure")
	if err != nil {
		t.Fatalf("AssignCourier failed: %v", err)
	}
	if _, err := svc.MarkDeparted(ctx, task.ID, task.Version, f.courierID, "partner", "corr-departure"); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict when departing before pickup, got %v", err)
	}
	if got := readOrderStatus(t, db, f.orderID); got != "ready_for_pickup" {
		t.Fatalf("order status changed despite rejected departure: %s", got)
	}
}

func TestPartnerDeliveryCompletesTaskAndOrderAtomicallyDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	task, err := svc.AssignCourier(ctx, f.orderID, f.courierID, "operator-1", "operator", "corr-complete")
	if err != nil {
		t.Fatalf("AssignCourier failed: %v", err)
	}
	pickedUp, err := svc.MarkPickedUp(ctx, task.ID, task.Version, f.courierID, "partner", "corr-complete")
	if err != nil {
		t.Fatalf("MarkPickedUp failed: %v", err)
	}
	if pickedUp.PickedUpAt == nil {
		t.Fatal("expected picked_up_at to be recorded")
	}
	if got := readOrderStatus(t, db, f.orderID); got != "picked_up" {
		t.Fatalf("expected order status picked_up, got %s", got)
	}

	departed, err := svc.MarkDeparted(ctx, pickedUp.ID, pickedUp.Version, f.courierID, "partner", "corr-complete")
	if err != nil {
		t.Fatalf("MarkDeparted failed: %v", err)
	}
	arrived, err := svc.MarkArrived(ctx, departed.ID, departed.Version, f.courierID, "partner", "corr-complete")
	if err != nil {
		t.Fatalf("MarkArrived failed: %v", err)
	}
	if got := readOrderStatus(t, db, f.orderID); got != "arrived_customer" {
		t.Fatalf("expected order status arrived_customer, got %s", got)
	}

	completed, err := svc.SubmitProof(ctx, arrived.ID, arrived.Version, "photo", "proof://partner-delivery", f.courierID, "partner", "corr-complete")
	if err != nil {
		t.Fatalf("SubmitProof failed: %v", err)
	}
	if completed.Status != StatusCompleted || completed.CompletedAt == nil {
		t.Fatalf("expected completed task with timestamp, got status=%s completedAt=%v", completed.Status, completed.CompletedAt)
	}
	if got := readOrderStatus(t, db, f.orderID); got != "delivered" {
		t.Fatalf("expected order status delivered, got %s", got)
	}
}
