package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

// seedCreateProposalNode inserts a bare-minimum catalog node under the given
// domain so CreateProposal's domain/node consistency check has something
// real to look up. Mirrors seedPaginationDomain's throwaway-row pattern.
func seedCreateProposalNode(t *testing.T, db *sql.DB, domainID string) string {
	t.Helper()
	ctx := context.Background()
	id := paginationUniqueID("node")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_catalog_nodes (id, domain_id, level, slug, name_ar)
		VALUES ($1, $2, 'BUSINESS_SUBDOMAIN', $1, 'قسم اختبار')`, id, domainID); err != nil {
		t.Fatalf("seed node: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_catalog_nodes WHERE id = $1`, id) })
	return id
}

// TestCreateProposalRejectsNodeFromWrongDomain covers the dsh WP6 fix:
// CreateProposal must reject a categoryNodeId that belongs to a different
// domain than the submitted domainId, instead of silently accepting it (and
// letting ResolveEffectivePolicy resolve a policy scoped to the wrong node).
func TestCreateProposalRejectsNodeFromWrongDomain(t *testing.T) {
	db := openPaginationTestDB(t)
	ctx := context.Background()

	domainA := seedPaginationDomain(t, db)
	domainB := seedPaginationDomain(t, db)
	nodeInB := seedCreateProposalNode(t, db, domainB)

	_, err := CreateProposal(ctx, db, "actor-test", ProductProposalInput{
		ProposedNameAr: "منتج اختبار",
		DomainID:       domainA,
		CategoryNodeID: &nodeInB,
		SourceSurface:  "app-field",
	})
	if err == nil {
		t.Fatal("expected error for node belonging to a different domain, got nil")
	}
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
	if !strings.Contains(err.Error(), "CATEGORY_NODE_NOT_IN_DOMAIN") {
		t.Fatalf("expected error to mention CATEGORY_NODE_NOT_IN_DOMAIN, got %v", err)
	}
}

// TestCreateProposalRejectsUnknownNode covers the not-found half of the same
// check: a categoryNodeId that doesn't exist at all must fail the same way
// as one from the wrong domain, not bubble up a raw ErrNotFound.
func TestCreateProposalRejectsUnknownNode(t *testing.T) {
	db := openPaginationTestDB(t)
	ctx := context.Background()

	domainA := seedPaginationDomain(t, db)
	missingNode := paginationUniqueID("node-does-not-exist")

	_, err := CreateProposal(ctx, db, "actor-test", ProductProposalInput{
		ProposedNameAr: "منتج اختبار",
		DomainID:       domainA,
		CategoryNodeID: &missingNode,
		SourceSurface:  "app-field",
	})
	if err == nil {
		t.Fatal("expected error for nonexistent node, got nil")
	}
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
	if !strings.Contains(err.Error(), "CATEGORY_NODE_NOT_IN_DOMAIN") {
		t.Fatalf("expected error to mention CATEGORY_NODE_NOT_IN_DOMAIN, got %v", err)
	}
}

// TestCreateProposalAcceptsNodeInSameDomain is the success-path regression
// check: a categoryNodeId that genuinely belongs to the submitted domainId
// must still create the proposal (the fix must not be overly strict).
func TestCreateProposalAcceptsNodeInSameDomain(t *testing.T) {
	db := openPaginationTestDB(t)
	ctx := context.Background()

	domainA := seedPaginationDomain(t, db)
	nodeInA := seedCreateProposalNode(t, db, domainA)

	proposal, err := CreateProposal(ctx, db, "actor-test", ProductProposalInput{
		ProposedNameAr: "منتج اختبار",
		DomainID:       domainA,
		CategoryNodeID: &nodeInA,
		SourceSurface:  "app-field",
	})
	if err != nil {
		t.Fatalf("expected success for node matching domain, got %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_product_proposals WHERE id = $1`, proposal.ID) })
	if proposal.DomainID != domainA {
		t.Fatalf("expected proposal domain %q, got %q", domainA, proposal.DomainID)
	}
	if proposal.CategoryNodeID == nil || *proposal.CategoryNodeID != nodeInA {
		t.Fatalf("expected proposal category node %q, got %v", nodeInA, proposal.CategoryNodeID)
	}
}

// TestCreateProposalAcceptsNilNode is a no-regression check: proposals with
// no category node at all (nil pointer) must keep working — the check only
// applies when a node is actually submitted.
func TestCreateProposalAcceptsNilNode(t *testing.T) {
	db := openPaginationTestDB(t)
	ctx := context.Background()

	domainA := seedPaginationDomain(t, db)

	proposal, err := CreateProposal(ctx, db, "actor-test", ProductProposalInput{
		ProposedNameAr: "منتج اختبار",
		DomainID:       domainA,
		CategoryNodeID: nil,
		SourceSurface:  "app-field",
	})
	if err != nil {
		t.Fatalf("expected success for nil category node, got %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_product_proposals WHERE id = $1`, proposal.ID) })
	if proposal.CategoryNodeID != nil {
		t.Fatalf("expected nil category node on proposal, got %v", *proposal.CategoryNodeID)
	}
}

// TestCreateProposalAcceptsEmptyNode covers the empty-string edge of the
// same nil-check: a pointer to an empty string must be treated the same as
// nil rather than looked up as a node id.
func TestCreateProposalAcceptsEmptyNode(t *testing.T) {
	db := openPaginationTestDB(t)
	ctx := context.Background()

	domainA := seedPaginationDomain(t, db)
	empty := ""

	proposal, err := CreateProposal(ctx, db, "actor-test", ProductProposalInput{
		ProposedNameAr: "منتج اختبار",
		DomainID:       domainA,
		CategoryNodeID: &empty,
		SourceSurface:  "app-field",
	})
	if err != nil {
		t.Fatalf("expected success for empty-string category node, got %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_product_proposals WHERE id = $1`, proposal.ID) })
}
