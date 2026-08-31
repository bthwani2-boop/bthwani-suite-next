package homediscovery

import (
	"context"
	"database/sql"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredHomeDiscoveryDB(t *testing.T) *sql.DB {
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

func TestListHomeStoresRetainsCanonicalPublicationReadbackDBIntegration(t *testing.T) {
	db := openRequiredHomeDiscoveryDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "home-discovery-context-" + suffix
	partnerID := "home-discovery-partner-" + suffix
	storeID := "home-discovery-store-" + suffix
	domainID := "home-discovery-domain-" + suffix
	productID := "home-discovery-product-" + suffix
	assortmentID := "home-discovery-assortment-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (
			id, operator_context_id, legal_name_ar, display_name, legal_identity_number,
			primary_phone, activation_status
		) VALUES ($1,$2,'شريك اكتشاف منزلي','Home Discovery Partner',$1,'777000009','client_visible')`,
		partnerID, operatorContextID); err != nil {
		t.Fatalf("insert partner: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar, is_active, is_client_visible)
		VALUES ($1,$1,'نطاق اكتشاف منزلي',TRUE,TRUE)`, domainID); err != nil {
		t.Fatalf("insert catalog domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, catalog_domain_id, delivery_modes,
			partner_readiness, catalog_approval_status, marketing_visibility,
			partner_id, address_line, coverage_summary, operating_hours, delivery_readiness,
			operator_context_id
		) VALUES ($1,$1,'Home Discovery Test Store','published','SAN','SAN-1',
			'serviceable',TRUE,$2,ARRAY['delivery']::TEXT[],'ready','approved','visible',
			$3,'صنعاء','نطاق صنعاء','08:00-22:00','ready',$4)`,
		storeID, domainID, partnerID, operatorContextID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, approval_status, is_active)
		VALUES ($1,$2,'Home Discovery Test Product','approved',TRUE)`, productID, domainID); err != nil {
		t.Fatalf("insert master product: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_at)
		VALUES ($1,$2,'approved',NOW())`, storeID, domainID); err != nil {
		t.Fatalf("approve store catalog domain: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortments (
			id, store_id, master_product_id, publication_status
		) VALUES ($1,$2,$3,'client_visible')`,
		assortmentID, storeID, productID); err != nil {
		t.Fatalf("insert approved assortment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_prices (id, store_assortment_id, amount_minor, currency, effective_from)
		VALUES ($1,$2,10000,'YER',NOW())`, "home-discovery-price-"+suffix, assortmentID); err != nil {
		t.Fatalf("insert normalized assortment price: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (store_assortment_id, policy_type, quantity, min_order_quantity, max_order_quantity, step_quantity)
		VALUES ($1,'quantity',100,1,100,1)`, assortmentID); err != nil {
		t.Fatalf("insert normalized assortment inventory: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_assortments WHERE id=$1`, assortmentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_catalog_domains WHERE store_id=$1 AND domain_id=$2`, storeID, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id=$1`, productID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id=$1`, domainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id=$1`, partnerID)
	})

	stores, total, err := ListHomeStores(ctx, db, HomeDiscoveryQuery{
		CityCode: "SAN", ServiceAreaCode: "SAN-1", Limit: 20,
	})
	if err != nil {
		t.Fatalf("list home stores: %v", err)
	}
	if total != 1 || len(stores) != 1 {
		t.Fatalf("expected one published home store, total=%d stores=%#v", total, stores)
	}
	store := stores[0]
	if store.ID != storeID || store.PartnerReadiness != "ready" || store.CatalogApprovalStatus != "approved" || store.MarketingVisibility != "visible" {
		t.Fatalf("home store must retain canonical readiness fields: %#v", store)
	}
	if store.PublicationDecision != "PUBLISHED" || len(store.BlockingReasons) != 0 {
		t.Fatalf("home store must retain published decision and no blockers: %#v", store)
	}
}
