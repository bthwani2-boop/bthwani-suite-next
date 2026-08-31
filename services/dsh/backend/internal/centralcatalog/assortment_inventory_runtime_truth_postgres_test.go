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

func TestInventoryMutationUsesNormalizedTruthDBIntegration(t *testing.T) {
	db := openAssortmentRuntimeTruthDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "inventory-truth-store-" + suffix
	domainID := "inventory-truth-domain-" + suffix
	productID := "inventory-truth-product-" + suffix
	assortmentID := "inventory-truth-assortment-" + suffix
	operatorContextID := "inventory-truth-context-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, operator_context_id
		) VALUES ($1,$1,'Inventory Truth Store','published','SAN','SAN-1','serviceable',true,$2)`, storeID, operatorContextID); err != nil {
		t.Fatalf("insert governed store: %v", err)
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
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1,$2,'approved',NOW())`, storeID, domainID); err != nil {
		t.Fatalf("approve governed store domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, publication_status
		) VALUES ($1,$2,$3,'approved')`, assortmentID, storeID, productID); err != nil {
		t.Fatalf("insert assortment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices (id, store_assortment_id, amount_minor, currency, effective_from)
		VALUES ($1,$2,1000,'YER',NOW())`, "inventory-truth-price-"+suffix, assortmentID); err != nil {
		t.Fatalf("insert normalized price: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortment_inventory WHERE store_assortment_id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1`, storeID)
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

	assertRuntimeTruth := func(wantQuantity int, wantAvailable bool, wantStockStatus string) {
		t.Helper()
		inventory, err := GetAssortmentInventoryRuntimeTruth(ctx, db, storeID, productID)
		if err != nil {
			t.Fatalf("read normalized inventory: %v", err)
		}
		if inventory.Quantity != wantQuantity {
			t.Fatalf("normalized inventory quantity=%d, want %d", inventory.Quantity, wantQuantity)
		}
		truth := assortmentInventoryTruth{
			PolicyType: inventory.PolicyType, Quantity: inventory.Quantity, ReservedQuantity: inventory.ReservedQuantity,
			MinOrderQuantity: inventory.MinOrderQuantity, MaxOrderQuantity: inventory.MaxOrderQuantity, StepQuantity: inventory.StepQuantity,
		}
		if assortmentInventoryAvailable(truth) != wantAvailable || assortmentInventoryStockStatus(truth) != wantStockStatus {
			t.Fatalf("normalized runtime truth: available=%v stock=%q, want available=%v stock=%q", assortmentInventoryAvailable(truth), assortmentInventoryStockStatus(truth), wantAvailable, wantStockStatus)
		}
	}

	assertRuntimeTruth(7, true, "in_stock")
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
	assertRuntimeTruth(0, false, "out_of_stock")

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
	assertRuntimeTruth(0, false, "out_of_stock")
}

func TestAssortmentMetadataUsesNormalizedRuntimeTruthAndImageGateDBIntegration(t *testing.T) {
	db := openAssortmentRuntimeTruthDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "metadata-truth-store-" + suffix
	domainID := "metadata-truth-domain-" + suffix
	productID := "metadata-truth-product-" + suffix
	operatorContextID := "metadata-truth-context-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, operator_context_id
		) VALUES ($1,$1,'Metadata Truth Store','published','SAN','SAN-1','serviceable',true,$2)`, storeID, operatorContextID); err != nil {
		t.Fatalf("insert governed store: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar)
		VALUES ($1,$1,'Metadata Truth Domain')`, domainID); err != nil {
		t.Fatalf("insert domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (
			id, domain_id, canonical_name_ar, approval_status, is_active
		) VALUES ($1,$2,'Metadata Truth Product','approved',true)`, productID, domainID); err != nil {
		t.Fatalf("insert product: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1,$2,'approved',NOW())`, storeID, domainID); err != nil {
		t.Fatalf("approve governed store domain: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortment_inventory WHERE store_assortment_id IN (SELECT id FROM dsh_store_assortments WHERE store_id=$1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortment_prices WHERE store_assortment_id IN (SELECT id FROM dsh_store_assortments WHERE store_id=$1)`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	_, err := UpsertStoreAssortmentWithRuntimeTruth(ctx, db, storeID, productID, "operator-test", StoreAssortmentInput{
		PublicationStatus: "client_visible",
	}, false)
	if err == nil {
		t.Fatal("client-visible assortment without an approved image was accepted")
	}

	created, err := UpsertStoreAssortmentWithRuntimeTruth(ctx, db, storeID, productID, "operator-test", StoreAssortmentInput{
		LocalNote: "initial metadata", PublicationStatus: "draft",
	}, false)
	if err != nil {
		t.Fatalf("create assortment metadata: %v", err)
	}
	if created.ID == "" || created.Version != 1 || created.LocalNote != "initial metadata" {
		t.Fatalf("unexpected metadata-only assortment creation: %+v", created)
	}
	price, err := CreateAssortmentPriceAtomic(ctx, db, storeID, productID, "operator-test", "metadata-truth-price-"+suffix, StoreAssortmentPriceInput{
		AmountMinor: 1250, Currency: "YER", PrepTimeMin: 15, PrepTimeMax: 30, EffectiveFrom: time.Now().UTC(),
	})
	if err != nil || price.AmountMinor != 1250 {
		t.Fatalf("create normalized price: price=%+v err=%v", price, err)
	}
	inventory, err := UpsertAssortmentInventoryWithRuntimeTruthAtomic(ctx, db, storeID, productID, "operator-test", StoreAssortmentInventoryInput{
		PolicyType: "signal", Quantity: 20, MinOrderQuantity: 1, MaxOrderQuantity: 100, StepQuantity: 1,
	})
	if err != nil || inventory.Quantity != 20 {
		t.Fatalf("create normalized inventory: inventory=%+v err=%v", inventory, err)
	}
	created, err = GetStoreAssortmentByKey(ctx, db, storeID, productID)
	if err != nil {
		t.Fatalf("read normalized assortment: %v", err)
	}
	commercial, err := GetAssortmentCommercialReadback(ctx, db, storeID, productID)
	if err != nil || len(commercial.Prices) != 1 || commercial.Prices[0].AmountMinor != 1250 || commercial.Prices[0].Currency != "YER" || commercial.Inventory.Quantity != 20 {
		t.Fatalf("unexpected normalized runtime readback: commercial=%+v err=%v", commercial, err)
	}

	updated, err := UpsertStoreAssortmentWithRuntimeTruth(ctx, db, storeID, productID, "operator-test", StoreAssortmentInput{
		LocalNote: "metadata-only edit", PublicationStatus: "draft", ExpectedVersion: &created.Version,
	}, false)
	if err != nil {
		t.Fatalf("metadata-only edit: %v", err)
	}
	if updated.Version != 2 || updated.LocalNote != "metadata-only edit" {
		t.Fatalf("metadata edit overwrote normalized runtime truth: %+v", updated)
	}
	if _, err := UpsertStoreAssortmentWithRuntimeTruth(ctx, db, storeID, productID, "operator-test", StoreAssortmentInput{
		PublicationStatus: "draft",
	}, false); err == nil {
		t.Fatal("existing assortment update without expectedVersion was accepted")
	}

	if _, err := db.ExecContext(ctx, `UPDATE dsh_master_products SET canonical_image_object_key='catalog/metadata-truth.png' WHERE id=$1`, productID); err != nil {
		t.Fatalf("approve canonical image: %v", err)
	}
	visible, err := UpsertStoreAssortmentWithRuntimeTruth(ctx, db, storeID, productID, "operator-test", StoreAssortmentInput{
		PublicationStatus: "client_visible", ExpectedVersion: &updated.Version,
	}, false)
	if err != nil {
		t.Fatalf("publish assortment with canonical image: %v", err)
	}
	if visible.PublicationStatus != "client_visible" || visible.Version != 3 {
		t.Fatalf("client-visible projection drifted from runtime truth: %+v", visible)
	}
}
