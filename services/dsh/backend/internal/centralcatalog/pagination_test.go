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

// openPaginationTestDB mirrors the DB-gated test pattern used elsewhere in
// this backend (see internal/fieldreadiness/fieldreadiness_db_test.go):
// integration tests only run when a real database is explicitly requested.
func openPaginationTestDB(t *testing.T) *sql.DB {
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

func paginationUniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

// seedPaginationDomain creates a bare-minimum catalog domain to satisfy the
// FK on dsh_master_products/dsh_product_proposals.
func seedPaginationDomain(t *testing.T, db *sql.DB) string {
	t.Helper()
	ctx := context.Background()
	id := paginationUniqueID("domain")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_domains (id, slug, name_ar, name_en)
		VALUES ($1, $1, 'اختبار', 'test')`, id); err != nil {
		t.Fatalf("seed domain: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_domains WHERE id = $1`, id) })
	return id
}

// seedPaginationMasterProduct inserts a master product directly (bypassing
// CreateMasterProduct) so tests can control approval_status freely.
func seedPaginationMasterProduct(t *testing.T, db *sql.DB, domainID, approvalStatus string) string {
	t.Helper()
	ctx := context.Background()
	id := paginationUniqueID("mp")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_master_products (id, domain_id, canonical_name_ar, approval_status)
		VALUES ($1, $2, 'منتج اختبار', $3)`, id, domainID, approvalStatus); err != nil {
		t.Fatalf("seed master product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_master_products WHERE id = $1`, id) })
	return id
}

// seedPaginationProposal inserts a product proposal directly (bypassing
// CreateProposal, which requires a resolved catalog policy) so tests can
// control domain/status freely.
func seedPaginationProposal(t *testing.T, db *sql.DB, domainID, status string) string {
	t.Helper()
	ctx := context.Background()
	id := paginationUniqueID("proposal")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_product_proposals (id, proposed_name_ar, domain_id, source_surface, status)
		VALUES ($1, 'اقتراح اختبار', $2, 'control-panel-catalog', $3)`, id, domainID, status); err != nil {
		t.Fatalf("seed proposal: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_product_proposals WHERE id = $1`, id) })
	return id
}

// seedPaginationAsset inserts a catalog asset directly with the given status.
func seedPaginationAsset(t *testing.T, db *sql.DB, status string) string {
	t.Helper()
	ctx := context.Background()
	id := paginationUniqueID("asset")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_assets (id, object_key, mime_type, status, source_surface)
		VALUES ($1, $1, 'image/jpeg', $2, 'control-panel-catalog')`, id, status); err != nil {
		t.Fatalf("seed asset: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_assets WHERE id = $1`, id) })
	return id
}

func TestListMasterProductsPaginationTotal(t *testing.T) {
	db := openPaginationTestDB(t)

	domainID := seedPaginationDomain(t, db)
	for i := 0; i < 5; i++ {
		seedPaginationMasterProduct(t, db, domainID, "approved")
	}
	for i := 0; i < 2; i++ {
		seedPaginationMasterProduct(t, db, domainID, "draft")
	}

	// total reflects the full filtered count while items length <= limit.
	items, total, err := ListMasterProducts(context.Background(), db, MasterProductFilter{
		DomainID: domainID, Limit: 3, Offset: 0,
	})
	if err != nil {
		t.Fatalf("list master products: %v", err)
	}
	if total != 7 {
		t.Fatalf("expected total 7, got %d", total)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 items with limit=3, got %d", len(items))
	}

	// offset beyond total returns empty items but correct total.
	items, total, err = ListMasterProducts(context.Background(), db, MasterProductFilter{
		DomainID: domainID, Limit: 50, Offset: 1000,
	})
	if err != nil {
		t.Fatalf("list master products with large offset: %v", err)
	}
	if total != 7 {
		t.Fatalf("expected total 7 with large offset, got %d", total)
	}
	if len(items) != 0 {
		t.Fatalf("expected 0 items with offset beyond total, got %d", len(items))
	}

	// filters (approvalStatus) affect total identically to items.
	items, total, err = ListMasterProducts(context.Background(), db, MasterProductFilter{
		DomainID: domainID, ApprovalStatus: "draft", Limit: 50, Offset: 0,
	})
	if err != nil {
		t.Fatalf("list master products filtered by approvalStatus: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total 2 for approvalStatus=draft, got %d", total)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items for approvalStatus=draft, got %d", len(items))
	}

	// negative offset clamps to 0 instead of erroring.
	items, total, err = ListMasterProducts(context.Background(), db, MasterProductFilter{
		DomainID: domainID, Limit: 3, Offset: -10,
	})
	if err != nil {
		t.Fatalf("list master products with negative offset: %v", err)
	}
	if total != 7 || len(items) != 3 {
		t.Fatalf("expected negative offset clamped to 0 (total=7, len=3), got total=%d len=%d", total, len(items))
	}
}

func TestListProposalsPaginationTotal(t *testing.T) {
	db := openPaginationTestDB(t)

	domainID := seedPaginationDomain(t, db)
	for i := 0; i < 4; i++ {
		seedPaginationProposal(t, db, domainID, "partner-proposed")
	}
	for i := 0; i < 3; i++ {
		seedPaginationProposal(t, db, domainID, "catalog-adopted")
	}

	items, total, err := ListProposals(context.Background(), db, ProposalFilter{Limit: 2, Offset: 0})
	if err != nil {
		t.Fatalf("list proposals: %v", err)
	}
	if total < 7 {
		t.Fatalf("expected total >= 7 (own seeded rows), got %d", total)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items with limit=2, got %d", len(items))
	}

	// filters (status) affect total identically to items — scope to this
	// test's domain isn't possible for proposals (no domain filter on
	// ListProposals), so filter by status alone and assert self-consistency.
	items, total, err = ListProposals(context.Background(), db, ProposalFilter{Status: "catalog-adopted", Limit: 50, Offset: 0})
	if err != nil {
		t.Fatalf("list proposals filtered by status: %v", err)
	}
	if total != len(items) {
		t.Fatalf("expected total to equal returned items when under limit, got total=%d len=%d", total, len(items))
	}

	// offset beyond total returns empty items but correct total.
	items, total, err = ListProposals(context.Background(), db, ProposalFilter{Status: "catalog-adopted", Limit: 50, Offset: 100000})
	if err != nil {
		t.Fatalf("list proposals with large offset: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("expected 0 items with offset beyond total, got %d", len(items))
	}
	if total == 0 {
		t.Fatalf("expected non-zero total even with an out-of-range offset")
	}
}

func TestListAssetsPaginationTotal(t *testing.T) {
	db := openPaginationTestDB(t)

	for i := 0; i < 5; i++ {
		seedPaginationAsset(t, db, "draft")
	}
	for i := 0; i < 2; i++ {
		seedPaginationAsset(t, db, "approved")
	}

	items, total, err := ListAssets(context.Background(), db, "approved", 50, 0)
	if err != nil {
		t.Fatalf("list assets: %v", err)
	}
	if total != len(items) {
		t.Fatalf("expected total to equal returned items when under limit, got total=%d len=%d", total, len(items))
	}
	if total < 2 {
		t.Fatalf("expected at least the 2 seeded approved assets, got %d", total)
	}

	// limit/offset default+cap behavior: limit <= 0 defaults to 50, and
	// offset beyond total returns empty items but the correct total.
	items, total, err = ListAssets(context.Background(), db, "approved", 0, 100000)
	if err != nil {
		t.Fatalf("list assets with large offset: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("expected 0 items with offset beyond total, got %d", len(items))
	}
	if total < 2 {
		t.Fatalf("expected total to still report >= 2 with large offset, got %d", total)
	}
}
