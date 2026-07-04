package orders

import (
	"context"
	"database/sql"
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

// TestCreateOrderStoresRealPriceSnapshotDBIntegration proves order items are
// created with the real catalog-derived unit price, not a hardcoded 0.
func TestCreateOrderStoresRealPriceSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "order-price-test-store-" + suffix
	clientID := "order-price-test-client-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Order Price Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active')
		RETURNING id::text`,
		clientID, storeID,
	).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items (cart_id, product_id, product_name, price_reference, unit_price, quantity)
		VALUES ($1::uuid, 'priced-product', 'Priced Product', '42.00 YER', 42.00, 2)`,
		cartID); err != nil {
		t.Fatalf("failed to insert priced cart item: %v", err)
	}

	var intentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
		VALUES ($1, $2::uuid, $3, 'payment_pending', 'cod', $4)
		RETURNING id::text`,
		clientID, cartID, storeID, "wlt-ps-"+suffix,
	).Scan(&intentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	order, err := CreateOrder(db, CreateOrderInput{CheckoutIntentID: intentID, ClientID: clientID})
	if err != nil {
		t.Fatalf("CreateOrder failed: %v", err)
	}
	if len(order.Items) != 1 {
		t.Fatalf("expected 1 order item, got %d", len(order.Items))
	}
	if order.Items[0].UnitPrice != 42.00 {
		t.Fatalf("expected order item unitPrice=42.00 from cart snapshot, got %v", order.Items[0].UnitPrice)
	}

	var storedUnitPrice float64
	if err := db.QueryRowContext(ctx, `SELECT unit_price FROM dsh_order_items WHERE order_id = $1::uuid`, order.ID).
		Scan(&storedUnitPrice); err != nil {
		t.Fatalf("failed to read stored order item price: %v", err)
	}
	if storedUnitPrice != 42.00 {
		t.Fatalf("expected dsh_order_items.unit_price=42.00, got %v", storedUnitPrice)
	}
}
