package store

import (
	"strings"
	"testing"
)

func TestClientStorefrontPredicateContainsAllPublicationGates(t *testing.T) {
	predicate := ClientStorefrontPredicate("s")
	required := []string{
		"s.is_visible = true",
		"s.status = 'active'",
		"s.serviceability_status IN ('serviceable','limited')",
		"s.partner_readiness = 'ready'",
		"s.catalog_approval_status = 'approved'",
		"s.marketing_visibility = 'visible'",
		"cardinality(s.delivery_modes) > 0",
		"s.delivery_readiness = 'ready'",
		"partner.id = s.partner_id",
		"partner.activation_status = 'client_visible'",
		"assortment.store_id = s.id",
		"assortment.publication_status = 'client_visible'",
		"product.approval_status = 'approved'",
		"domain.is_client_visible = true",
		"store_domain.status = 'approved'",
	}

	for _, fragment := range required {
		if !strings.Contains(predicate, fragment) {
			t.Fatalf("client storefront predicate is missing %q", fragment)
		}
	}
}

func TestClientStorefrontPredicateNormalizesAlias(t *testing.T) {
	predicate := ClientStorefrontPredicate("  dsh_stores  ")
	if !strings.Contains(predicate, "dsh_stores.is_visible = true") {
		t.Fatalf("expected normalized table alias in predicate: %s", predicate)
	}
	if strings.Contains(predicate, "  dsh_stores  .") {
		t.Fatalf("predicate retained alias whitespace: %s", predicate)
	}
}
