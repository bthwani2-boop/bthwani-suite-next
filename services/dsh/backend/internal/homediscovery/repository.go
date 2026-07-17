package homediscovery

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
)

const clientEligibleStorePredicate = `
	s.is_visible = true
	AND s.status = 'active'
	AND s.serviceability_status IN ('serviceable','limited')
	AND s.partner_readiness = 'ready'
	AND s.catalog_approval_status = 'approved'
	AND s.marketing_visibility = 'visible'
	AND EXISTS (
		SELECT 1 FROM dsh_partners p
		WHERE p.id = s.partner_id
		  AND p.activation_status = 'client_visible'
		  AND p.archived_at IS NULL
	)`

func ListBanners(db *sql.DB) ([]HomeBanner, error) {
	rows, err := db.Query(`
		SELECT b.id, b.title, COALESCE(b.subtitle,''), b.image_url, b.action_type, b.action_target
		FROM dsh_home_banners b
		WHERE b.is_active = true
		  AND b.publication_status = 'published'
		  AND b.approved_at IS NOT NULL
		  AND (b.publish_from IS NULL OR b.publish_from <= NOW())
		  AND (b.publish_until IS NULL OR b.publish_until > NOW())
		  AND (
			b.action_type <> 'store'
			OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = b.action_target
				  AND ` + clientEligibleStorePredicate + `
			)
		  )
		  AND (
			b.action_type <> 'category'
			OR EXISTS (
				SELECT 1 FROM dsh_catalog_domains d
				WHERE d.id = b.action_target
				  AND d.is_active = true
				  AND d.is_client_visible = true
			)
		  )
		ORDER BY b.sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query banners: %w", err)
	}
	defer rows.Close()

	banners := []HomeBanner{}
	for rows.Next() {
		var b HomeBanner
		if err := rows.Scan(&b.ID, &b.Title, &b.Subtitle, &b.ImageURL, &b.ActionType, &b.ActionTarget); err != nil {
			return nil, fmt.Errorf("failed to scan banner row: %w", err)
		}
		banners = append(banners, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading banner rows: %w", err)
	}
	return banners, nil
}

func ListPromos(db *sql.DB) ([]HomePromo, error) {
	rows, err := db.Query(`
		SELECT p.id, p.title, COALESCE(p.subtitle,''), COALESCE(p.badge_label,''), p.image_url, p.action_type, p.action_target
		FROM dsh_home_promos p
		WHERE p.is_active = true
		  AND p.publication_status = 'published'
		  AND p.approved_at IS NOT NULL
		  AND (p.publish_from IS NULL OR p.publish_from <= NOW())
		  AND (p.publish_until IS NULL OR p.publish_until > NOW())
		  AND (
			p.action_type <> 'store'
			OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = p.action_target
				  AND ` + clientEligibleStorePredicate + `
			)
		  )
		  AND (
			p.action_type <> 'category'
			OR EXISTS (
				SELECT 1 FROM dsh_catalog_domains d
				WHERE d.id = p.action_target
				  AND d.is_active = true
				  AND d.is_client_visible = true
			)
		  )
		ORDER BY p.sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query promos: %w", err)
	}
	defer rows.Close()

	promos := []HomePromo{}
	for rows.Next() {
		var p HomePromo
		if err := rows.Scan(&p.ID, &p.Title, &p.Subtitle, &p.BadgeLabel, &p.ImageURL, &p.ActionType, &p.ActionTarget); err != nil {
			return nil, fmt.Errorf("failed to scan promo row: %w", err)
		}
		promos = append(promos, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading promo rows: %w", err)
	}
	return promos, nil
}

func ListCategories(db *sql.DB) ([]HomeCategory, error) {
	rows, err := db.Query(`
		SELECT id, name_ar, COALESCE(icon,''), sort_order
		FROM dsh_catalog_domains
		WHERE is_active = true
		  AND is_client_visible = true
		  AND is_manual_request = false
		UNION ALL
		SELECT n.id, n.name_ar, COALESCE(n.icon,''), n.sort_order
		FROM dsh_catalog_nodes n
		JOIN dsh_catalog_domains d ON n.domain_id = d.id
		WHERE d.is_manual_request = true
		  AND n.is_active = true
		ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	categories := []HomeCategory{}
	for rows.Next() {
		var c HomeCategory
		if err := rows.Scan(&c.ID, &c.Label, &c.IconURL, &c.SortOrder); err != nil {
			return nil, fmt.Errorf("failed to scan category row: %w", err)
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading category rows: %w", err)
	}
	return categories, nil
}

func ListHomeStores(db *sql.DB, query HomeDiscoveryQuery) ([]HomeStore, int, error) {
	conditions := []string{clientEligibleStorePredicate}
	params := []any{}
	idx := 1

	add := func(column string, value any) {
		conditions = append(conditions, fmt.Sprintf("s.%s = $%d", column, idx))
		params = append(params, value)
		idx++
	}
	if query.CityCode != "" {
		add("city_code", query.CityCode)
	}
	if query.ServiceAreaCode != "" {
		add("service_area_code", query.ServiceAreaCode)
	}

	whereClause := "WHERE "
	for i, condition := range conditions {
		if i > 0 {
			whereClause += " AND "
		}
		whereClause += condition
	}

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM dsh_stores s LEFT JOIN dsh_catalog_domains c ON c.id = s.catalog_domain_id "+whereClause, params...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count home stores: %w", err)
	}

	const cols = `s.id, s.slug, s.display_name, s.status, s.city_code, s.service_area_code,
		s.serviceability_status, s.rating_average, s.rating_count, s.delivery_eta_min,
		s.delivery_eta_max, s.is_visible, s.hero_image_url, s.logo_url, s.catalog_domain_id,
		COALESCE(c.name_ar, '') AS category_label,
		s.delivery_modes, s.is_free_delivery, s.distance_km, s.follower_count,
		s.has_pro_badge, s.has_coupon_badge, s.points_multiplier, s.is_popular,
		s.created_at, s.updated_at`

	q := fmt.Sprintf(`SELECT %s FROM dsh_stores s
		LEFT JOIN dsh_catalog_domains c ON c.id = s.catalog_domain_id
		%s
		ORDER BY s.rating_average DESC NULLS LAST, s.display_name ASC
		LIMIT $%d OFFSET 0`, cols, whereClause, idx)

	rows, err := db.Query(q, append(params, query.Limit)...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query home stores: %w", err)
	}
	defer rows.Close()

	stores := []HomeStore{}
	for rows.Next() {
		var (
			id                   string
			slug                 string
			displayName          string
			status               string
			cityCode             string
			serviceAreaCode      string
			serviceabilityStatus string
			ratingAverage        *float64
			ratingCount          int
			deliveryEtaMin       *int
			deliveryEtaMax       *int
			isVisible            bool
			heroImageURL         *string
			logoURL              *string
			category             string
			categoryLabel        string
			deliveryModes        []string
			isFreeDelivery       bool
			distanceKm           *float64
			followerCount        int
			hasProBadge          bool
			hasCouponBadge       bool
			pointsMultiplier     *int
			isPopular            bool
			createdAt            time.Time
			updatedAt            time.Time
		)
		if err := rows.Scan(
			&id, &slug, &displayName, &status, &cityCode, &serviceAreaCode,
			&serviceabilityStatus, &ratingAverage, &ratingCount, &deliveryEtaMin,
			&deliveryEtaMax, &isVisible, &heroImageURL, &logoURL, &category,
			&categoryLabel, pq.Array(&deliveryModes), &isFreeDelivery, &distanceKm,
			&followerCount, &hasProBadge, &hasCouponBadge, &pointsMultiplier,
			&isPopular, &createdAt, &updatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan home store row: %w", err)
		}
		stores = append(stores, HomeStore{
			ID:               id,
			Slug:             slug,
			DisplayName:      displayName,
			Status:           status,
			Serviceability:   HomeServiceability{Status: serviceabilityStatus},
			RatingAverage:    ratingAverage,
			RatingCount:      ratingCount,
			DeliveryEtaMin:   deliveryEtaMin,
			DeliveryEtaMax:   deliveryEtaMax,
			HeroImageURL:     heroImageURL,
			LogoURL:          logoURL,
			Category:         category,
			CategoryLabel:    categoryLabel,
			IsFreeDelivery:   isFreeDelivery,
			HasProBadge:      hasProBadge,
			HasCouponBadge:   hasCouponBadge,
			IsPopular:        isPopular,
			FollowerCount:    followerCount,
			PointsMultiplier: pointsMultiplier,
			CityCode:         cityCode,
			ServiceAreaCode:  serviceAreaCode,
			IsVisible:        isVisible,
			DeliveryModes:    deliveryModes,
			DistanceKm:       distanceKm,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error reading home store rows: %w", err)
	}

	return stores, total, nil
}

func DefaultFilters() []HomeFilter {
	return []HomeFilter{
		{ID: "all", Label: "الكل", Kind: "all", IsActive: true},
		{ID: "favorites", Label: "المفضلة", Kind: "favorites", IsActive: false},
		{ID: "nearest", Label: "الأقرب", Kind: "nearest", IsActive: false},
		{ID: "new", Label: "الجديد", Kind: "new", IsActive: false},
		{ID: "offers", Label: "العروض", Kind: "offers", IsActive: false},
	}
}
