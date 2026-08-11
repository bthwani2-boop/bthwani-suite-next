package cart

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

// TestComputeCheckoutSnapshotDBIntegration proves DSH derives amount and
// currency from the same sovereign normalized assortment snapshot instead of
// handing WLT a zero amount or a locally hardcoded currency. It also proves
// ValidateCart reads that same DSH price authority.
func TestComputeCheckoutSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-" + suffix
	clientID := "cart-price-test-client-" + suffix
	domainID := "domain-" + suffix
	productID := "prod-" + suffix
	assortmentID := "assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Price Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id = $1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id = $1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id = $1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar)
		VALUES ($1, $1, 'Cart Price Test Domain')
		RETURNING id`,
		domainID,
	).Scan(&domainID); err != nil {
		t.Fatalf("failed to insert test domain: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, sku, approval_status, is_active)
		VALUES ($1, $2, 'Test Widget', $3, 'approved', true)
		RETURNING id`,
		productID, domainID, "sku-"+suffix,
	).Scan(&productID); err != nil {
		t.Fatalf("failed to insert test master product: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1, $2, 'approved', NOW())`,
		storeID, domainID,
	); err != nil {
		t.Fatalf("failed to approve test store domain: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, unit_price, currency, available,
			stock_status, publication_status
		)
		VALUES ($1, $2, $3, 25.50, 'USD', true, 'in_stock', 'client_visible')`,
		assortmentID, storeID, productID,
	); err != nil {
		t.Fatalf("failed to insert test store assortment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices
			(id, store_assortment_id, amount_minor, currency, effective_from)
		VALUES ($1, $2, 2550, 'USD', NOW())`,
		"price-"+suffix, assortmentID,
	); err != nil {
		t.Fatalf("failed to insert test assortment price: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory
			(store_assortment_id, policy_type, quantity, reserved_quantity, min_order_quantity, max_order_quantity, step_quantity)
		VALUES ($1, 'quantity', 100, 0, 1, 100, 1)`, assortmentID); err != nil {
		t.Fatalf("failed to insert test assortment inventory: %v", err)
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

	item, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: 3})
	if err != nil {
		t.Fatalf("UpsertItem failed: %v", err)
	}
	if item.UnitPriceMinorUnits != 2550 {
		t.Fatalf("expected cart item to snapshot catalog unitPriceMinorUnits=2550, got %v", item.UnitPriceMinorUnits)
	}
	if item.Currency != "USD" {
		t.Fatalf("expected cart item to snapshot assortment currency=USD, got %q", item.Currency)
	}
	if item.ProductName != "Test Widget" {
		t.Fatalf("expected cart item productName derived from catalog, got %q", item.ProductName)
	}

	validation, err := ValidateCart(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ValidateCart failed: %v", err)
	}
	if !validation.Ready || validation.PriceChanged || len(validation.Items) != 1 || validation.Items[0].Status != "ready" {
		t.Fatalf("expected normalized DSH price/inventory to validate ready, got %#v", validation)
	}

	snapshot, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ComputeCheckoutSnapshot failed: %v", err)
	}
	const expectedMinorUnits = int64(25.50 * 100 * 3) // 7650
	if snapshot.AmountMinorUnits != expectedMinorUnits {
		t.Fatalf("expected amountMinorUnits=%d for 3x 25.50, got %d", expectedMinorUnits, snapshot.AmountMinorUnits)
	}
	if snapshot.Currency != "USD" {
		t.Fatalf("expected checkout currency=USD from assortment snapshot, got %q", snapshot.Currency)
	}
	if snapshot.AmountMinorUnits <= 0 {
		t.Fatalf("checkout snapshot amount must be > 0 for a priced cart, got %d", snapshot.AmountMinorUnits)
	}
	if snapshot.SnapshotHash == "" {
		t.Fatalf("expected non-empty snapshot hash")
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_store_assortment_prices
		SET amount_minor = 2600, version = version + 1, updated_at = NOW()
		WHERE store_assortment_id = $1`, assortmentID); err != nil {
		t.Fatalf("failed to change current normalized price: %v", err)
	}
	validation, err = ValidateCart(ctx, db, cartID)
	if err != nil {
		t.Fatalf("ValidateCart after price change failed: %v", err)
	}
	if validation.Ready || !validation.PriceChanged || validation.Items[0].ReasonCode != "PRICE_CHANGED" {
		t.Fatalf("expected DSH normalized price change to invalidate cart, got %#v", validation)
	}
}

func TestUpsertItemRejectsPublicationApprovalAndInventoryPolicyViolationsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-policy-store-" + suffix
	clientID := "cart-policy-client-" + suffix
	domainID := "cart-policy-domain-" + suffix
	productID := "cart-policy-product-" + suffix
	assortmentID := "cart-policy-assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Policy Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`, storeID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_domains (id, slug, name_ar) VALUES ($1, $1, 'Policy Domain')`, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, approval_status, is_active)
		VALUES ($1, $2, 'Policy Product', 'approved', true)`, productID, domainID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, unit_price, currency, available, stock_status, publication_status
		) VALUES ($1, $2, $3, 10, 'YER', true, 'in_stock', 'hidden')`, assortmentID, storeID, productID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices (id, store_assortment_id, amount_minor, currency, effective_from)
		VALUES ($1, $2, 1000, 'YER', NOW())`, "policy-price-"+suffix, assortmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (
			store_assortment_id, policy_type, quantity, reserved_quantity,
			min_order_quantity, max_order_quantity, step_quantity
		) VALUES ($1, 'quantity', 10, 0, 2, 6, 2)`, assortmentID); err != nil {
		t.Fatal(err)
	}
	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id = $1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id = $1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id = $1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id = $1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id = $1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	assertInvalid := func(quantity int, label string) {
		t.Helper()
		_, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: quantity})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("%s: expected ErrInvalid, got %v", label, err)
		}
	}

	assertInvalid(2, "hidden assortment")
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortments SET publication_status='client_visible' WHERE id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(1, "below minimum quantity")
	assertInvalid(3, "off-step quantity")
	assertInvalid(8, "above maximum quantity")

	item, err := UpsertItem(ctx, db, storeID, cartID, UpsertItemInput{MasterProductID: productID, Quantity: 6})
	if err != nil || item == nil || item.Quantity != 6 {
		t.Fatalf("valid policy quantity should succeed, item=%#v err=%v", item, err)
	}

	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortments SET available=false WHERE id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(2, "assortment unavailable")
	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortments SET available=true WHERE id=$1`, assortmentID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_master_products SET approval_status='rejected' WHERE id=$1`, productID); err != nil {
		t.Fatal(err)
	}
	assertInvalid(2, "master product rejected")
}

// TestComputeCheckoutSnapshotRejectsUnpricedItemDBIntegration proves a cart
// item without a catalog price blocks checkout independently of its valid
// persisted currency snapshot.
func TestComputeCheckoutSnapshotRejectsUnpricedItemDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-price-test-store-unpriced-" + suffix
	clientID := "cart-price-test-client-unpriced-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Price Test Store Unpriced', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id = $1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

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
		INSERT INTO dsh_cart_items
			(cart_id, product_id, master_product_id, product_name, price_reference, unit_price_minor, currency, quantity)
		VALUES ($1, 'unpriced-product', 'unpriced-product', 'Unpriced Product', 'n/a', 0, 'USD', 1)`,
		cartID); err != nil {
		t.Fatalf("failed to insert unpriced cart item: %v", err)
	}

	_, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if !errors.Is(err, ErrCartItemMissingPrice) {
		t.Fatalf("expected ErrCartItemMissingPrice, got %v", err)
	}
}

func TestComputeCheckoutSnapshotRejectsMixedCurrenciesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "cart-currency-test-store-" + suffix
	clientID := "cart-currency-test-client-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Cart Currency Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`, storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id IN (SELECT id FROM dsh_carts WHERE store_id = $1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE store_id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'pickup', 'active') RETURNING id::text`, clientID, storeID).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items
			(cart_id, product_id, master_product_id, product_name, price_reference, unit_price_minor, currency, quantity)
		VALUES ($1, 'product-usd', 'product-usd', 'USD Product', '10.00', 1000, 'USD', 1),
		       ($1, 'product-eur', 'product-eur', 'EUR Product', '12.00', 1200, 'EUR', 1)`, cartID); err != nil {
		t.Fatalf("failed to insert mixed-currency cart items: %v", err)
	}

	_, err := ComputeCheckoutSnapshot(ctx, db, cartID)
	if !errors.Is(err, ErrCartItemCurrency) {
		t.Fatalf("expected ErrCartItemCurrency, got %v", err)
	}
}
