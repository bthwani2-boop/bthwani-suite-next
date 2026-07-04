package cart

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

// TestComputeCheckoutSnapshotDBIntegration proves the real gap this slice
// closed: DSH now derives a non-zero, verifiable cart total from its own
// catalog price snapshot, instead of handing WLT an amount of 0.
func TestComputeCheckoutSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-" + suffix
	clientID := "cart-price-test-client-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Price Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	var productID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_catalog_products (id, store_id, name, sku, price_reference, unit_price)
		VALUES ($1, $2, 'Test Widget', $3, '25.50 YER', 25.50)
		RETURNING id`,
		"prod-"+suffix, storeID, "sku-"+suffix,
	).Scan(&productID); err != nil {
		t.Fatalf("failed to insert test product: %v", err)
	}

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active')
		RETURNING id::text`,
		clientID, storeID,
	).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	item, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{ProductID: productID, Quantity: 3})
	if err != nil {
		t.Fatalf("UpsertItem failed: %v", err)
	}
	if item.UnitPrice != 25.50 {
		t.Fatalf("expected cart item to snapshot catalog unitPrice=25.50, got %v", item.UnitPrice)
	}
	if item.ProductName != "Test Widget" {
		t.Fatalf("expected cart item productName derived from catalog, got %q", item.ProductName)
	}

	snapshot, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ComputeCheckoutSnapshot failed: %v", err)
	}
	const expectedMinorUnits = int64(25.50 * 100 * 3) // 7650
	if snapshot.AmountMinorUnits != expectedMinorUnits {
		t.Fatalf("expected amountMinorUnits=%d for 3x 25.50, got %d", expectedMinorUnits, snapshot.AmountMinorUnits)
	}
	if snapshot.AmountMinorUnits <= 0 {
		t.Fatalf("checkout snapshot amount must be > 0 for a priced cart, got %d", snapshot.AmountMinorUnits)
	}
	if snapshot.SnapshotHash == "" {
		t.Fatalf("expected non-empty snapshot hash")
	}
}

// TestComputeCheckoutSnapshotRejectsUnpricedItemDBIntegration proves a cart
// item without a catalog price (unit_price left at its 0 default) blocks
// checkout instead of silently handing WLT amount=0.
func TestComputeCheckoutSnapshotRejectsUnpricedItemDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-unpriced-" + suffix
	clientID := "cart-price-test-client-unpriced-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Price Test Store Unpriced', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
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

	// Insert a cart item directly (bypassing UpsertItem/catalog lookup) with
	// unit_price left at its zero default, simulating legacy/unpriced data.
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items (cart_id, product_id, product_name, price_reference, unit_price, quantity)
		VALUES ($1, 'unpriced-product', 'Unpriced Product', 'n/a', 0, 1)`,
		cartID); err != nil {
		t.Fatalf("failed to insert unpriced cart item: %v", err)
	}

	_, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if err != ErrCartItemMissingPrice {
		t.Fatalf("expected ErrCartItemMissingPrice, got %v", err)
	}
}
