package orders

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"testing"
	"time"
)

type orderTruthDBFixture struct {
	TenantID        string
	ClientID        string
	OtherClientID   string
	StoreID         string
	CheckoutID      string
	OtherCheckoutID string
}

func seedOrderTruthCheckout(t *testing.T, db *sql.DB, tenantID, clientID, storeID, cartState, suffix string) string {
	t.Helper()
	ctx := context.Background()

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', $3)
		RETURNING id::text`,
		clientID, storeID, cartState,
	).Scan(&cartID); err != nil {
		t.Fatalf("seed cart: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items
			(cart_id, product_id, product_name, price_reference, unit_price, quantity)
		VALUES
			($1::uuid, $2, 'JRN-011 governed item', '1250.00 YER', 1250.00, 2)`,
		cartID, "jrn011-product-"+suffix,
	); err != nil {
		t.Fatalf("seed cart item: %v", err)
	}

	var checkoutID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (
			tenant_id, client_id, cart_id, store_id, state, fulfillment_mode,
			payment_method, wlt_payment_session_id, delivery_address,
			subtotal_minor_units, delivery_fee_minor_units, discount_minor_units,
			total_minor_units, currency, pricing_snapshot_hash
		)
		VALUES (
			$1, $2, $3::uuid, $4, 'payment_pending', 'bthwani_delivery',
			'cod', $5, 'صنعاء - عنوان اختبار محكوم',
			250000, 5000, 0, 255000, 'YER', repeat('c', 64)
		)
		RETURNING id::text`,
		tenantID,
		clientID,
		cartID,
		storeID,
		"wlt-jrn011-"+suffix,
	).Scan(&checkoutID); err != nil {
		t.Fatalf("seed checkout intent: %v", err)
	}
	return checkoutID
}

func seedOrderTruthDBFixture(t *testing.T, db *sql.DB) orderTruthDBFixture {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	fixture := orderTruthDBFixture{
		TenantID:      "tenant-jrn011-" + suffix,
		ClientID:      "client-jrn011-" + suffix,
		OtherClientID: "client-jrn011-other-" + suffix,
		StoreID:       "store-jrn011-" + suffix,
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores
			(id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES
			($1, $1, 'JRN-011 Truth Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		fixture.StoreID,
	); err != nil {
		t.Fatalf("seed store: %v", err)
	}

	fixture.CheckoutID = seedOrderTruthCheckout(
		t,
		db,
		fixture.TenantID,
		fixture.ClientID,
		fixture.StoreID,
		"active",
		suffix+"-primary",
	)
	// The second Checkout exists only to prove that reusing an idempotency key
	// with another request conflicts before any second order can be created.
	// Its cart is intentionally non-active so the fixture respects the database
	// invariant that one client may have only one active cart at a time.
	fixture.OtherCheckoutID = seedOrderTruthCheckout(
		t,
		db,
		fixture.TenantID,
		fixture.ClientID,
		fixture.StoreID,
		"checked_out",
		suffix+"-other",
	)
	return fixture
}

func TestCreateOrderTruthLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOrderTruthDBFixture(t, db)
	idempotencyKey := "jrn011-create-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	correlationID := "jrn011-correlation-" + strconv.FormatInt(time.Now().UnixNano(), 10)

	created, replay, err := CreateOrderTruth(db, CreateOrderTruthInput{
		CheckoutIntentID: fixture.CheckoutID,
		ClientID:         fixture.ClientID,
		TenantID:         fixture.TenantID,
		IdempotencyKey:   idempotencyKey,
		CorrelationID:    correlationID,
	})
	if err != nil {
		t.Fatalf("first CreateOrderTruth: %v", err)
	}
	if replay {
		t.Fatal("first create must not be reported as replay")
	}
	if created.ID == "" || created.OrderNumber == "" || created.CorrelationID != correlationID {
		t.Fatalf("missing governed identifiers: %+v", created)
	}
	if created.Version < 1 || created.Status != StatusPending || created.CurrentOwner != "partner" {
		t.Fatalf("invalid initial operational truth: %+v", created)
	}
	if len(created.Items) != 1 || created.Items[0].Quantity != 2 || created.Items[0].LineTotalMinorUnits != 250000 {
		t.Fatalf("immutable item snapshot not created correctly: %+v", created.Items)
	}
	if created.TotalMinorUnits != 255000 || created.Currency != "YER" || created.PaymentStatusProjection != "cash_due" {
		t.Fatalf("pricing/payment projection mismatch: %+v", created)
	}
	if len(created.StatusTimeline) == 0 || created.StatusTimeline[0].Type != "order.created" {
		t.Fatalf("missing order.created timeline event: %+v", created.StatusTimeline)
	}

	replayed, replay, err := CreateOrderTruth(db, CreateOrderTruthInput{
		CheckoutIntentID: fixture.CheckoutID,
		ClientID:         fixture.ClientID,
		TenantID:         fixture.TenantID,
		IdempotencyKey:   idempotencyKey,
		CorrelationID:    correlationID,
	})
	if err != nil || !replay || replayed.ID != created.ID {
		t.Fatalf("identical retry must replay same order: order=%+v replay=%v err=%v", replayed, replay, err)
	}

	_, _, err = CreateOrderTruth(db, CreateOrderTruthInput{
		CheckoutIntentID: fixture.OtherCheckoutID,
		ClientID:         fixture.ClientID,
		TenantID:         fixture.TenantID,
		IdempotencyKey:   idempotencyKey,
		CorrelationID:    correlationID + "-other",
	})
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("same key with different checkout must conflict, got %v", err)
	}

	var orderCount int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_orders
		WHERE tenant_id=$1 AND checkout_intent_id=$2::uuid`,
		fixture.TenantID, fixture.CheckoutID,
	).Scan(&orderCount); err != nil {
		t.Fatalf("count created orders: %v", err)
	}
	if orderCount != 1 {
		t.Fatalf("one checkout must create exactly one order, got %d", orderCount)
	}

	var eventCount, outboxCount, completedAttemptCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_order_status_events
		WHERE tenant_id=$1 AND order_id=$2::uuid AND event_type='order.created'`,
		fixture.TenantID, created.ID,
	).Scan(&eventCount); err != nil {
		t.Fatalf("count order.created events: %v", err)
	}
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_order_event_outbox
		WHERE tenant_id=$1 AND order_id=$2::uuid AND event_type='order.created'`,
		fixture.TenantID, created.ID,
	).Scan(&outboxCount); err != nil {
		t.Fatalf("count transactional outbox rows: %v", err)
	}
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_order_create_idempotency
		WHERE tenant_id=$1 AND client_id=$2 AND idempotency_key=$3
		  AND order_id=$4::uuid AND completed_at IS NOT NULL`,
		fixture.TenantID, fixture.ClientID, idempotencyKey, created.ID,
	).Scan(&completedAttemptCount); err != nil {
		t.Fatalf("count completed idempotency attempts: %v", err)
	}
	if eventCount != 1 || outboxCount != 1 || completedAttemptCount != 1 {
		t.Fatalf("transactional creation evidence mismatch: events=%d outbox=%d attempts=%d", eventCount, outboxCount, completedAttemptCount)
	}

	if _, err := GetClientScopedOrderTruth(db, created.ID, fixture.TenantID, fixture.OtherClientID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-client read must be denied as not found, got %v", err)
	}
	if _, err := GetPartnerScopedOrderTruth(db, created.ID, fixture.TenantID, "other-store"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-store read must be denied as not found, got %v", err)
	}

	partnerTruth, err := GetPartnerScopedOrderTruth(db, created.ID, fixture.TenantID, fixture.StoreID)
	if err != nil {
		t.Fatalf("partner scoped read: %v", err)
	}
	if partnerTruth.ClientID != "" || string(partnerTruth.DeliveryAddressSnapshot) != `{"redacted":true}` {
		t.Fatalf("partner response leaked client PII: %+v", partnerTruth)
	}
	for _, event := range partnerTruth.StatusTimeline {
		if string(event.Metadata) != `{}` {
			t.Fatalf("partner event metadata was not redacted: %s", event.Metadata)
		}
	}

	operatorTruth, err := GetOperatorScopedOrderTruth(db, created.ID, fixture.TenantID)
	if err != nil {
		t.Fatalf("operator scoped read: %v", err)
	}
	if operatorTruth.ClientID != "" || string(operatorTruth.DeliveryAddressSnapshot) != `{"redacted":true}` {
		t.Fatalf("operator response leaked client PII: %+v", operatorTruth)
	}

	_, err = db.Exec(`
		UPDATE dsh_orders
		SET total_minor_units=total_minor_units+1
		WHERE id=$1::uuid`, created.ID)
	if err == nil {
		t.Fatal("order pricing snapshot mutation must be rejected")
	}

	var storedSnapshot json.RawMessage
	if err := db.QueryRow(`
		SELECT item_snapshot FROM dsh_order_items
		WHERE order_id=$1::uuid`, created.ID,
	).Scan(&storedSnapshot); err != nil {
		t.Fatalf("read item snapshot: %v", err)
	}
	if !json.Valid(storedSnapshot) || !containsJSONField(storedSnapshot, "productId") {
		t.Fatalf("invalid stored item snapshot: %s", storedSnapshot)
	}
}

func containsJSONField(raw []byte, field string) bool {
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return false
	}
	_, ok := decoded[field]
	return ok
}

func ExampleCreateOrderTruthInput() {
	input := CreateOrderTruthInput{
		CheckoutIntentID: "8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5",
		ClientID:         "client-1001",
		TenantID:         "tenant-yemen",
		IdempotencyKey:   "order-create-key-1001",
		CorrelationID:    "order-create-trace-1001",
	}
	fmt.Println(input.TenantID, input.ClientID)
	// Output: tenant-yemen client-1001
}
