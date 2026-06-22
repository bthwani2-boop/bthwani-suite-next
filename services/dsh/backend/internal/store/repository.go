package store

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

const storeColumns = `id, slug, display_name, status, city_code, service_area_code,
	serviceability_status, rating_average, rating_count, delivery_eta_min,
	delivery_eta_max, is_visible, hero_image_url, logo_url, category,
	delivery_modes, is_free_delivery, distance_km, follower_count,
	has_pro_badge, has_coupon_badge, points_multiplier, is_popular, version,
	created_at, updated_at`

func scanStore(scanner interface{ Scan(...any) error }) (DshStoreRow, error) {
	var row DshStoreRow
	err := scanner.Scan(
		&row.ID, &row.Slug, &row.DisplayName, &row.Status, &row.CityCode,
		&row.ServiceAreaCode, &row.ServiceabilityStatus, &row.RatingAverage,
		&row.RatingCount, &row.DeliveryEtaMin, &row.DeliveryEtaMax, &row.IsVisible,
		&row.HeroImageURL, &row.LogoURL, &row.Category, pq.Array(&row.DeliveryModes),
		&row.IsFreeDelivery, &row.DistanceKM, &row.FollowerCount, &row.HasProBadge,
		&row.HasCouponBadge, &row.PointsMultiplier, &row.IsPopular,
		&row.Version,
		&row.CreatedAt, &row.UpdatedAt,
	)
	return row, err
}

func ListStores(db *sql.DB, q DshStoreListQuery) (DshStoreListResult, error) {
	return listStores(db, q, true)
}

func ListAllStores(db *sql.DB, q DshStoreListQuery) (DshStoreListResult, error) {
	return listStores(db, q, false)
}

func listStores(db *sql.DB, q DshStoreListQuery, publicOnly bool) (DshStoreListResult, error) {
	conditions := []string{}
	if publicOnly {
		conditions = append(conditions, "is_visible = true")
	}
	params := []any{}
	idx := 1

	add := func(column string, value any) {
		conditions = append(conditions, fmt.Sprintf("%s = $%d", column, idx))
		params = append(params, value)
		idx++
	}
	if q.CityCode != "" {
		add("city_code", q.CityCode)
	}
	if q.ServiceAreaCode != "" {
		add("service_area_code", q.ServiceAreaCode)
	}
	if q.Status != "" {
		add("status", q.Status)
	}
	if q.IsVisible != nil {
		add("is_visible", *q.IsVisible)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM dsh_stores "+whereClause, params...).Scan(&total); err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to count stores: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s FROM dsh_stores %s
		ORDER BY rating_average DESC NULLS LAST, display_name ASC
		LIMIT $%d OFFSET $%d`, storeColumns, whereClause, idx, idx+1)
	rows, err := db.Query(query, append(params, q.Limit, q.Offset)...)
	if err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to query stores: %w", err)
	}
	defer rows.Close()

	stores := []DshStoreSummary{}
	for rows.Next() {
		row, scanErr := scanStore(rows)
		if scanErr != nil {
			return DshStoreListResult{}, fmt.Errorf("failed to scan store row: %w", scanErr)
		}
		stores = append(stores, RowToSummary(row))
	}
	if err := rows.Err(); err != nil {
		return DshStoreListResult{}, fmt.Errorf("error reading rows: %w", err)
	}

	return DshStoreListResult{
		Stores:     stores,
		Pagination: Pagination{Limit: q.Limit, Offset: q.Offset, Total: total},
	}, nil
}

func GetStoreByID(db *sql.DB, storeID string) (*DshStoreRow, error) {
	row, err := scanStore(db.QueryRow("SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1 AND is_visible = true", storeID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query store by id: %w", err)
	}
	return &row, nil
}
