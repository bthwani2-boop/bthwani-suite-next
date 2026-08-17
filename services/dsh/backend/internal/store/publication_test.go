package store

import (
	"strings"
	"testing"
)

func TestClientStorefrontPredicateUsesCanonicalReadinessView(t *testing.T) {
	predicate := ClientStorefrontPredicate("s")
	for _, fragment := range []string{
		"dsh_partner_store_readiness_v publication",
		"publication.store_id = s.id",
		"publication.publication_decision = 'PUBLISHED'",
	} {
		if !strings.Contains(predicate, fragment) {
			t.Fatalf("canonical predicate is missing %q: %s", fragment, predicate)
		}
	}
	if strings.Contains(predicate, "dsh_partners partner") || strings.Contains(predicate, "dsh_store_assortments assortment") {
		t.Fatalf("publication rules were duplicated outside the canonical view: %s", predicate)
	}
}

func TestClientStorefrontPredicateNormalizesAlias(t *testing.T) {
	predicate := ClientStorefrontPredicate("  dsh_stores  ")
	if !strings.Contains(predicate, "publication.store_id = dsh_stores.id") {
		t.Fatalf("expected normalized table alias in predicate: %s", predicate)
	}
	if strings.Contains(predicate, "  dsh_stores  .") {
		t.Fatalf("predicate retained alias whitespace: %s", predicate)
	}
}
