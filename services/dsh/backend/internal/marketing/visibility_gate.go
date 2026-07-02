package marketing

import (
	"database/sql"
	"errors"
)

// ErrTargetGateFailed is returned when a campaign/banner/promo target does not
// pass the client-visibility gate (store not client_visible, product not
// approved/active, category not approved, or partner not published).
var ErrTargetGateFailed = errors.New("marketing target failed visibility gate")

var validTargetTypes = map[string]bool{
	"home": true, "stores": true, "store": true, "category": true,
	"subcategory": true, "product": true, "offer": true, "campaign": true,
	"search": true, "custom": true,
}

// ValidateTarget checks that targetType/targetID may be published to
// clients. It returns (passed, reason). No-target-id types (home, stores,
// search, custom) pass trivially since they carry no entity reference to gate.
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
		// Partner offers have no backend persistence yet (no dsh_partner_offers
		// table) — see marketing_partner_offer_matrix.md. Reject rather than
		// silently allow an unverifiable target.
		return false, "offer targeting is not yet backed by a partner-offer table", nil
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
		  SELECT 1 FROM dsh_catalog_categories c
		  JOIN dsh_stores s ON s.id = c.store_id
		  WHERE c.id=$1 AND c.is_active=true
		    AND s.status='active' AND s.is_visible=true
		    AND s.serviceability_status IN ('serviceable','limited')
		    AND s.partner_readiness='ready'
		    AND s.catalog_approval_status='approved'
		    AND s.marketing_visibility='visible'
		)`, categoryID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "category is not active or its store is not client_visible", nil
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
		  SELECT 1 FROM dsh_catalog_products p
		  JOIN dsh_stores s ON s.id = p.store_id
		  WHERE p.id=$1 AND p.is_active=true
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
		return false, "product is not approved/active or its store is not client_visible", nil
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
		)`, campaignID).Scan(&eligible)
	if err != nil {
		return false, "", err
	}
	if !eligible {
		return false, "referenced campaign is not active", nil
	}
	return true, "", nil
}
