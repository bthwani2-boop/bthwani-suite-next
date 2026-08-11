package centralcatalog

import (
	"context"
	"database/sql"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openAssortmentRuntimeTruthDB(t *testing.T) *sql.DB {
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

func TestInventoryMutationSynchronizesAssortmentProjectionDBIntegration(t *testing.T) {
	db := openAssortmentRuntimeTruthDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "inventory-truth-store-" + suffix
	domainID := "inventory-truth-domain-" + suffix
	productID := "inventory-truth-product-" + suffix
	assortmentID := "inventory-truth-assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible
		) VALUES ($1,$1,'Inventory Truth Store','published','SAN','SAN-1','serviceable',true)`, storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar)
		VALUES ($1,$1,'Inventory Truth Domain')`, domainID); err != nil {
		t.Fatalf("insert domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (
			id, domain_id, canonical_name_ar, approval_status, is_active
		) VALUES ($1,$2,'Inventory Truth Product','approved',true)`, productID, domainID); err != nil {
		t.Fatalf("insert product: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, unit_price, currency,
			available, stock_status, publication_status
		) VALUES ($1,$2,$3,10,'YER',false,'out_of_stock','approved')`, assortmentID, storeID, productID); err != nil {
		t.Fatalf("insert assortment: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortment_inventory WHERE store_assortment_id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	inv, err := UpsertAssortmentInventoryWithRuntimeTruthAtomic(ctx, db, storeID, productID, "operator-test", StoreAssortmentInventoryInput{
		PolicyType:       "signal",
		Quantity:         7,
		MinOrderQuantity: 1,
		MaxOrderQuantity: 100,
		StepQuantity:     1,
	})
	if err != nil {
		t.Fatalf("create inventory truth: %v", err)
	}
	if inv.Version < 1 {
		t.Fatalf("expected inventory version >=1, got %d", inv.Version)
	}

	assertProjection := func(wantAvailable bool, wantStockStatus string) {
		t.Helper()
		var available bool
		var stockStatus string
		if err := db.QueryRowContext(ctx, `
			SELECT available, stock_status
			FROM dsh_store_assortments
			WHERE id=$1`, assortmentID).Scan(&available, &stockStatus); err != nil {
			t.Fatalf("read projection: %v", err)
		}
		if available != wantAvailable || stockStatus != wantStockStatus {
			t.Fatalf("projection drift: got available=%v stock=%q, want available=%v stock=%q", available, stockStatus, wantAvailable, wantStockStatus)
		}
	}

	assertProjection(true, "in_stock")

	updated, err := UpsertAssortmentInventoryWithRuntimeTruthAtomic(ctx, db, storeID, productID, "operator-test", StoreAssortmentInventoryInput{
		PolicyType:       "signal",
		Quantity:         0,
		MinOrderQuantity: 1,
		MaxOrderQuantity: 100,
		StepQuantity:     1,
		ExpectedVersion:  inv.Version,
	})
	if err != nil {
		t.Fatalf("deplete inventory truth: %v", err)
	}
	if updated.Version <= inv.Version {
		t.Fatalf("expected inventory version to advance: before=%d after=%d", inv.Version, updated.Version)
	}
	assertProjection(false, "out_of_stock")

	_, err = UpsertAssortmentInventoryWithRuntimeTruthAtomic(ctx, db, storeID, productID, "operator-test", StoreAssortmentInventoryInput{
		PolicyType:       "signal",
		Quantity:         10,
		MinOrderQuantity: 1,
		MaxOrderQuantity: 100,
		StepQuantity:     1,
		ExpectedVersion:  inv.Version,
	})
	if err != ErrConflict {
		t.Fatalf("stale inventory expectedVersion must conflict, got %v", err)
	}
	assertProjection(false, "out_of_stock")
}
