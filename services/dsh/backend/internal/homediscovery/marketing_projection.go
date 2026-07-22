package homediscovery

import (
	"context"
	"database/sql"
	"fmt"
)

// ListMarketingPromos builds a client-only read projection. Marketing remains
// the owner of campaign, ticker and partner-offer truth; home discovery never
// mutates those entities and only exposes rows publishable at query time.
func ListMarketingPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	tickers, err := listTickerPromos(ctx, db, query)
	if err != nil {
		return nil, err
	}
	campaigns, err := listCampaignPromos(ctx, db, query)
	if err != nil {
		return nil, err
	}
	offers, err := listPartnerOfferPromos(ctx, db, query)
	if err != nil {
		return nil, err
	}
	result := append(tickers, campaigns...)
	return append(result, offers...), nil
}

func listTickerPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT 'ticker:' || t.id::TEXT,
		       t.message,
		       '',
		       CASE t.priority
		         WHEN 'critical' THEN 'عاجل'
		         WHEN 'high' THEN 'مهم'
		         WHEN 'low' THEN 'معلومة'
		         ELSE 'تنبيه'
		       END,
		       '',
		       CASE WHEN t.action_type IN ('store','category') THEN t.action_type ELSE 'none' END,
		       CASE WHEN t.action_type IN ('store','category') THEN COALESCE(t.action_target,'') ELSE '' END
		FROM dsh_marketing_tickers t
		WHERE t.deleted_at IS NULL
		  AND t.status='published'
		  AND (t.audience='all' OR (t.audience='client' AND $1='authenticated'))
		  AND (
		    t.open_hour IS NULL OR t.close_hour IS NULL OR
		    (t.open_hour <= t.close_hour AND EXTRACT(HOUR FROM CURRENT_TIMESTAMP) >= t.open_hour AND EXTRACT(HOUR FROM CURRENT_TIMESTAMP) < t.close_hour) OR
		    (t.open_hour > t.close_hour AND (EXTRACT(HOUR FROM CURRENT_TIMESTAMP) >= t.open_hour OR EXTRACT(HOUR FROM CURRENT_TIMESTAMP) < t.close_hour))
		  )
		ORDER BY t.pinned DESC,
		         CASE t.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,
		         t.updated_at DESC
		LIMIT 5`, query.AudienceSegment)
	if err != nil {
		return nil, fmt.Errorf("failed to query marketing ticker projection: %w", err)
	}
	defer rows.Close()
	out := []HomePromo{}
	for rows.Next() {
		var item HomePromo
		if err := rows.Scan(&item.ID, &item.Title, &item.Subtitle, &item.BadgeLabel, &item.ImageURL, &item.ActionType, &item.ActionTarget); err != nil {
			return nil, fmt.Errorf("failed to scan marketing ticker projection: %w", err)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func listCampaignPromos(ctx context.Context, db *sql.DB, query HomeDiscoveryQuery) ([]HomePromo, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT 'campaign:' || c.id::TEXT,
		       c.title,
		       COALESCE(c.description,''),
		       'حملة',
		       CASE WHEN c.target_type='store' THEN COALESCE(s.hero_image_url,s.logo_url,'') ELSE '' END,
		       CASE WHEN c.target_type IN ('store','category','subcategory') THEN c.target_type ELSE 'none' END,
		       CASE WHEN c.target_type IN ('store','category','subcategory') THEN COALESCE(c.target_id,'') ELSE '' END
		FROM dsh_marketing_campaigns c
		LEFT JOIN dsh_stores s ON c.target_type='store' AND s.id::TEXT=c.target_id
		WHERE c.archived_at IS NULL
		  AND c.status='active'
		  AND (c.audience='all' OR (c.audience='client' AND $3='authenticated'))
		  AND COALESCE(c.start_date,'') <> ''
		  AND COALESCE(c.end_date,'') <> ''
		  AND c.start_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND c.end_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND COALESCE(c.placement,'home') IN ('home','hero','feed','banner','floating')
		  AND (
		    c.target_type IS NULL OR c.target_type='' OR c.target_type IN ('home','stores','search','custom') OR
		    (c.target_type='store' AND s.id IS NOT NULL AND `+clientEligibleStorePredicate+`
		      AND ($1='' OR s.city_code=$1)
		      AND ($2='' OR s.service_area_code=$2)) OR
		    (c.target_type IN ('category','subcategory') AND EXISTS (
		      SELECT 1 FROM dsh_catalog_domains d
		      WHERE d.id::TEXT=c.target_id AND d.is_active=TRUE AND d.is_client_visible=TRUE
		        AND d.is_manual_request=FALSE
		      UNION ALL
		      SELECT 1 FROM dsh_catalog_nodes n
		      JOIN dsh_catalog_domains d ON d.id=n.domain_id
		      WHERE n.id::TEXT=c.target_id AND n.is_active=TRUE AND n.is_client_visible=TRUE
		        AND d.is_active=TRUE AND d.is_client_visible=TRUE AND d.is_manual_request=FALSE
		    ))
		  )
		ORDER BY c.updated_at DESC, c.id
		LIMIT 10`, query.CityCode, query.ServiceAreaCode, query.AudienceSegment)
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
		  AND (o.eligibility='all' OR (o.eligibility='client' AND $3='authenticated'))
		  AND o.active_from_date <> ''
		  AND o.active_to_date <> ''
		  AND o.active_from_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND o.active_to_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
		  AND `+clientEligibleStorePredicate+`
		  AND ($1='' OR s.city_code=$1)
		  AND ($2='' OR s.service_area_code=$2)
		ORDER BY o.updated_at DESC, o.id
		LIMIT 10`, query.CityCode, query.ServiceAreaCode, query.AudienceSegment)
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
