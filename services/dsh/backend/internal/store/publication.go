package store

import (
	"fmt"
	"strings"
)

// ClientStorefrontPredicate is the single fail-closed publication gate for every
// app-client store read. The supplied alias must identify the outer dsh_stores
// relation (for example "s" or "dsh_stores").
//
// A store is client-visible only when its operational profile, legal partner,
// media, fulfillment modes, and at least one approved catalog assortment are all
// complete. Keeping this predicate in one place prevents home discovery, store
// discovery, and store detail from drifting apart.
func ClientStorefrontPredicate(alias string) string {
	alias = strings.TrimSpace(alias)
	prefix := ""
	if alias != "" {
		prefix = alias + "."
	}

	return fmt.Sprintf(`%[1]sis_visible = true
	AND %[1]sstatus = 'active'
	AND %[1]sserviceability_status IN ('serviceable','limited')
	AND %[1]spartner_readiness = 'ready'
	AND %[1]scatalog_approval_status = 'approved'
	AND %[1]smarketing_visibility = 'visible'
	AND cardinality(%[1]sdelivery_modes) > 0
	AND btrim(COALESCE(%[1]saddress_line,'')) <> ''
	AND btrim(COALESCE(%[1]scoverage_summary,'')) <> ''
	AND btrim(COALESCE(%[1]soperating_hours,'')) <> ''
	AND %[1]sdelivery_readiness = 'ready'
	AND btrim(COALESCE(%[1]shero_image_url,'')) <> ''
	AND btrim(COALESCE(%[1]slogo_url,'')) <> ''
	AND EXISTS (
		SELECT 1
		FROM dsh_partners partner
		WHERE partner.id = %[1]spartner_id
		  AND partner.activation_status = 'client_visible'
		  AND partner.archived_at IS NULL
	)
	AND EXISTS (
		SELECT 1
		FROM dsh_store_assortments assortment
		JOIN dsh_master_products product
		  ON product.id = assortment.master_product_id
		JOIN dsh_catalog_domains domain
		  ON domain.id = product.domain_id
		JOIN dsh_store_catalog_domains store_domain
		  ON store_domain.store_id = assortment.store_id
		 AND store_domain.domain_id = product.domain_id
		WHERE assortment.store_id = %[1]sid
		  AND assortment.publication_status = 'client_visible'
		  AND assortment.available = true
		  AND product.approval_status = 'approved'
		  AND product.is_active = true
		  AND domain.is_active = true
		  AND domain.is_client_visible = true
		  AND store_domain.status = 'approved'
	)`, prefix)
}
