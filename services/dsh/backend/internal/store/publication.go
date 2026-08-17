package store

import (
	"fmt"
	"strings"
)

// ClientStorefrontPredicate is the single fail-closed publication gate for every
// app-client store read. The supplied alias must identify the outer dsh_stores
// relation (for example "s" or "dsh_stores").
//
// A store is client-visible only when the database-owned readiness view says so.
// Keeping the predicate as a view lookup prevents any reader from reimplementing
// publication semantics in Go or in a second SQL predicate.
func ClientStorefrontPredicate(alias string) string {
	alias = strings.TrimSpace(alias)
	if alias == "" {
		alias = "dsh_stores"
	}
	return fmt.Sprintf(`EXISTS (
		SELECT 1
		FROM dsh_partner_store_readiness_v publication
		WHERE publication.store_id = %s.id
		  AND publication.publication_decision = 'PUBLISHED'
	)`, alias)
}
