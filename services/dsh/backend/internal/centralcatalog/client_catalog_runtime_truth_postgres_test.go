package centralcatalog

import (
	"context"
	"strconv"
	"testing"
	"time"
)

func TestGetPurchasableClientCatalogUsesCurrentPriceAndInventoryDBIntegration(t *testing.T) {
	db := openAssortmentRuntimeTruthDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "client-catalog-truth-store-" + suffix
	domainID := "client-catalog-truth-domain-" + suffix
	productID := "client-catalog-truth-product-" + suffix
	assortmentID := "client-catalog-truth-assortment-" + suffix
	operatorContextID := "client-catalog-truth-context-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, operator_context_id
		) VALUES ($1,$1,'Client Catalog Truth Store','published','SAN','SAN-1','serviceable',true,$2)`, storeID, operatorContextID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar)
		VALUES ($1,$1,'Client Catalog Truth Domain')`, domainID); err != nil {
		t.Fatalf("insert domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (
			id, domain_id, canonical_name_ar, approval_status, is_active
		) VALUES ($1,$2,'Client Catalog Truth Product','approved',true)`, productID, domainID); err != nil {
		t.Fatalf("insert master product: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1,$2,'approved',NOW())`, storeID, domainID); err != nil {
		t.Fatalf("approve store domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, unit_price, currency,
			available, stock_status, publication_status
		) VALUES ($1,$2,$3,1,'YER',true,'in_stock','client_visible')`, assortmentID, storeID, productID); err != nil {
		t.Fatalf("insert assortment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (
			store_assortment_id, policy_type, quantity, reserved_quantity,
			min_order_quantity, max_order_quantity, step_quantity
		) VALUES ($1,'signal',0,0,1,100,1)`, assortmentID); err != nil {
		t.Fatalf("insert inventory: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices (
			id, store_assortment_id, amount_minor, currency,
			prep_time_min, prep_time_max, effective_from
		) VALUES ($1,$2,2599,'YER',15,30,NOW())`, "client-catalog-truth-price-"+suffix, assortmentID); err != nil {
		t.Fatalf("insert effective price: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1 AND domain_id=$2`, storeID, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
	})

	_, _, products, _, _, err := GetPurchasableClientCatalog(ctx, db, storeID)
	if err != nil {
		t.Fatalf("read depleted public catalog: %v", err)
	}
	if len(products) != 0 {
		t.Fatalf("depleted inventory must not reach the client catalog: %#v", products)
	}

	if _, err := db.ExecContext(ctx, `UPDATE dsh_store_assortment_inventory SET quantity=4 WHERE store_assortment_id=$1`, assortmentID); err != nil {
		t.Fatalf("make inventory available: %v", err)
	}
	_, _, products, _, _, err = GetPurchasableClientCatalog(ctx, db, storeID)
	if err != nil {
		t.Fatalf("read purchasable public catalog: %v", err)
	}
	if len(products) != 1 {
		t.Fatalf("expected one purchasable product, got %#v", products)
	}
	if products[0].ID != productID || products[0].UnitPrice != 25.99 || products[0].Currency != "YER" {
		t.Fatalf("client catalog must retain canonical product ID and effective price, got %#v", products[0])
	}
}
