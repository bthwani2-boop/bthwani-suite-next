package homediscovery

import (
	"context"
	"database/sql"
	"fmt"
)

// ListMarketingPromos builds a client-only read projection. Marketing remains
// the owner of campaign and partner-offer truth; home discovery never mutates
// those entities and only exposes rows that are publishable at query time.
func ListMarketingPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	campaigns, err := listCampaignPromos(ctx, db, query)
	if err != nil {
		return nil, err
	}
	offers, err := listPartnerOfferPromos(ctx, db, query)
	if err != nil {
		return nil, err
	}
	return append(campaigns, offers...), nil
}

func listCampaignPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT 'campaign:' || c.id::TEXT,
		       c.title,
		       COALESCE(c.description,''),
		       'حملة',
		       CASE WHEN c.target_type='store' THEN COALESCE(s.hero_image_url,s.logo_url,'') ELSE '' END,
		       CASE WHEN c.target_type IN ('store','category') THEN c.target_type ELSE 'none' END,
		       CASE WHEN c.target_type IN ('store','category') THEN COALESCE(c.target_id,'') ELSE '' END
		FROM dsh_marketing_campaigns c
		LEFT JOIN dsh_stores s ON c.target_type='store' AND s.id::TEXT=c.target_id
		WHERE c.archived_at IS NULL
		  AND c.status='active'
		  AND c.audience IN ('all','client')
		  AND COALESCE(c.start_date,'') <> ''
		  AND COALESCE(c.end_date,'') <> ''
		  AND c.start_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND c.end_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND COALESCE(c.placement,'home') IN ('home','hero','feed','banner','floating')
		  AND (
		    c.target_type IS NULL OR c.target_type='' OR
		    (c.target_type='store' AND s.id IS NOT NULL AND `+clientEligibleStorePredicate+`
		      AND ($1='' OR s.city_code=$1)
		      AND ($2='' OR s.service_area_code=$2)) OR
		    (c.target_type='category' AND EXISTS (
		      SELECT 1 FROM dsh_catalog_domains d
		      WHERE d.id=c.target_id AND d.is_active=TRUE AND d.is_client_visible=TRUE
		    ))
		  )
		ORDER BY c.updated_at DESC, c.id
		LIMIT 10`, query.CityCode, query.ServiceAreaCode)
	if err != nil {
		return nil, fmt.Errorf("failed to query marketing campaign projection: %w", err)
	}
	defer rows.Close()
	out := []HomePromo{}
	for rows.Next() {
		var item HomePromo
		if err := rows.Scan(&item.ID, &item.Title, &item.Subtitle, &item.BadgeLabel, &item.ImageURL, &item.ActionType, &item.ActionTarget); err != nil {
			return nil, fmt.Errorf("failed to scan marketing campaign projection: %w", err)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func listPartnerOfferPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT 'partner-offer:' || o.id::TEXT,
		       o.title,
		       o.value_label,
		       CASE o.offer_type
		         WHEN 'free-delivery' THEN 'توصيل مجاني'
		         WHEN 'bundle' THEN 'باقة'
		         WHEN 'buy-x-get-y' THEN 'اشترِ واحصل'
		         WHEN 'coupon' THEN 'كوبون'
		         ELSE 'عرض شريك'
		       END,
		       COALESCE(s.hero_image_url,s.logo_url,''),
		       'store',
		       o.store_id::TEXT
		FROM dsh_partner_offers o
		JOIN dsh_stores s ON s.id=o.store_id
		WHERE o.archived_at IS NULL
		  AND o.status='published'
		  AND o.eligibility IN ('all','client')
		  AND o.active_from_date <> ''
		  AND o.active_to_date <> ''
		  AND o.active_from_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND o.active_to_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND `+clientEligibleStorePredicate+`
		  AND ($1='' OR s.city_code=$1)
		  AND ($2='' OR s.service_area_code=$2)
		ORDER BY o.updated_at DESC, o.id
		LIMIT 10`, query.CityCode, query.ServiceAreaCode)
	if err != nil {
		return nil, fmt.Errorf("failed to query partner-offer projection: %w", err)
	}
	defer rows.Close()
	out := []HomePromo{}
	for rows.Next() {
		var item HomePromo
		if err := rows.Scan(&item.ID, &item.Title, &item.Subtitle, &item.BadgeLabel, &item.ImageURL, &item.ActionType, &item.ActionTarget); err != nil {
			return nil, fmt.Errorf("failed to scan partner-offer projection: %w", err)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
