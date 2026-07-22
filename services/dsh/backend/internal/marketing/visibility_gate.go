package marketing

import (
	"database/sql"
	"errors"
)

// ErrTargetGateFailed is returned when a marketing target does not pass the
// client-visibility gate: inactive store, unapproved catalog target, expired
// campaign, or unpublished partner offer.
var ErrTargetGateFailed = errors.New("marketing target failed visibility gate")

var validTargetTypes = map[string]bool{
	"home": true, "stores": true, "store": true, "category": true,
	"subcategory": true, "product": true, "offer": true, "campaign": true,
	"search": true, "custom": true,
}

// ValidateTarget checks that targetType/targetID may be published to clients.
// No-target-id types pass trivially because they carry no entity reference.
func ValidateTarget(db *sql.DB, targetType, targetID string) (bool, string, error) {
	if targetType == "" {
		return true, "", nil
	}
	if !validTargetTypes[targetType] {
		return false, "unknown target_type", nil
	}

	switch targetType {
	case "home", "stores", "search", "custom":
		return true, "", nil
	case "store":
		return validateStoreTarget(db, targetID)
	case "category", "subcategory":
		return validateCategoryTarget(db, targetID)
	case "product":
		return validateProductTarget(db, targetID)
	case "campaign":
		return validateCampaignTarget(db, targetID)
	case "offer":
		return validateOfferTarget(db, targetID)
	default:
		return false, "unsupported target_type", nil
	}
}

func validateStoreTarget(db *sql.DB, storeID string) (bool, string, error) {
	if storeID == "" {
		return false, "target_id is required for target_type=store", nil
	}
	var eligible bool
	err := db.QueryRow(`
		SELECT EXISTS (
		  SELECT 1 FROM dsh_stores
		  WHERE id=$1 AND status='active' AND is_visible=true
		    AND serviceability_status IN ('serviceable','limited')
		    AND partner_readiness='ready'
		    AND catalog_approval_status='approved'
		    AND marketing_visibility='visible'
		)`, storeID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "store is not client_visible (status/visibility/serviceability/partner_readiness/catalog_approval/marketing_visibility)", nil
	}
	return true, "", nil
}

func validateCategoryTarget(db *sql.DB, categoryID string) (bool, string, error) {
	if categoryID == "" {
		return false, "target_id is required for target_type=category", nil
	}
	var eligible bool
	err := db.QueryRow(`
		SELECT EXISTS (
		  SELECT 1
		  FROM dsh_catalog_domains d
		  WHERE d.id=$1 AND d.is_active=true AND d.is_client_visible=true
		    AND d.is_manual_request=false
		  UNION ALL
		  SELECT 1
		  FROM dsh_catalog_nodes n
		  JOIN dsh_catalog_domains d ON d.id=n.domain_id
		  WHERE n.id=$1 AND n.is_active=true AND n.is_client_visible=true
		    AND d.is_active=true AND d.is_client_visible=true
		    AND d.is_manual_request=false
		)`, categoryID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "central catalog domain/node is not active or client_visible", nil
	}
	return true, "", nil
}

func validateProductTarget(db *sql.DB, productID string) (bool, string, error) {
	if productID == "" {
		return false, "target_id is required for target_type=product", nil
	}
	var eligible bool
	err := db.QueryRow(`
		SELECT EXISTS (
		  SELECT 1 FROM dsh_master_products p
		  JOIN dsh_catalog_domains d ON d.id = p.domain_id
		  LEFT JOIN dsh_catalog_nodes n ON n.id = p.category_node_id
		  JOIN dsh_store_assortments a ON a.master_product_id = p.id
		  JOIN dsh_stores s ON s.id = a.store_id
		  WHERE p.id=$1 AND p.is_active=true AND p.approval_status='approved'
		    AND d.is_active=true AND d.is_client_visible=true
		    AND d.is_manual_request=false
		    AND (n.id IS NULL OR (n.is_active=true AND n.is_client_visible=true))
		    AND a.publication_status='client_visible' AND a.available=true
		    AND s.status='active' AND s.is_visible=true
		    AND s.serviceability_status IN ('serviceable','limited')
		    AND s.partner_readiness='ready'
		    AND s.catalog_approval_status='approved'
		    AND s.marketing_visibility='visible'
		)`, productID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "master product or its client-visible assortment/store is not publishable", nil
	}
	return true, "", nil
}

func validateCampaignTarget(db *sql.DB, campaignID string) (bool, string, error) {
	if campaignID == "" {
		return false, "target_id is required for target_type=campaign", nil
	}
	var eligible bool
	err := db.QueryRow(`
		SELECT EXISTS (
		  SELECT 1 FROM dsh_marketing_campaigns
		  WHERE id=$1 AND status='active' AND archived_at IS NULL
		    AND audience IN ('all','client')
		    AND COALESCE(start_date,'') <> '' AND COALESCE(end_date,'') <> ''
		    AND start_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		    AND end_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		)`, campaignID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "referenced campaign is not active in its client-visible schedule", nil
	}
	return true, "", nil
}

func validateOfferTarget(db *sql.DB, offerID string) (bool, string, error) {
	if offerID == "" {
		return false, "target_id is required for target_type=offer", nil
	}
	var eligible bool
	err := db.QueryRow(`
		SELECT EXISTS (
		  SELECT 1
		  FROM dsh_partner_offers o
		  JOIN dsh_stores s ON s.id=o.store_id
		  WHERE o.id::TEXT=$1 AND o.status='published' AND o.archived_at IS NULL
		    AND o.eligibility IN ('all','client')
		    AND o.active_from_date <> '' AND o.active_to_date <> ''
		    AND o.active_from_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		    AND o.active_to_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		    AND s.status='active' AND s.is_visible=true
		    AND s.serviceability_status IN ('serviceable','limited')
		    AND s.partner_readiness='ready'
		    AND s.catalog_approval_status='approved'
		    AND s.marketing_visibility='visible'
		)`, offerID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "partner offer is not published in an active client-visible window", nil
	}
	return true, "", nil
}
