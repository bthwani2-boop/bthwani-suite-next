package store

import (
	"database/sql"
	"fmt"
	"strings"
)

func ListStores(db *sql.DB, q DshStoreListQuery) (DshStoreListResult, error) {
	conditions := []string{}
	params := []interface{}{}
	idx := 1

	if q.CityCode != "" {
		conditions = append(conditions, fmt.Sprintf("city_code = $%d", idx))
		params = append(params, q.CityCode)
		idx++
	}
	if q.ServiceAreaCode != "" {
		conditions = append(conditions, fmt.Sprintf("service_area_code = $%d", idx))
		params = append(params, q.ServiceAreaCode)
		idx++
	}
	if q.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		params = append(params, q.Status)
		idx++
	}
	if q.IsVisible != nil {
		conditions = append(conditions, fmt.Sprintf("is_visible = $%d", idx))
		params = append(params, *q.IsVisible)
		idx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM dsh_stores %s", whereClause)
	var total int
	err := db.QueryRow(countQuery, params...).Scan(&total)
	if err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to count stores: %w", err)
	}

	// List query
	listQuery := fmt.Sprintf(`
		SELECT id, slug, display_name, status, city_code, service_area_code, serviceability_status,
		       rating_average, rating_count, delivery_eta_min, delivery_eta_max, is_visible,
		       hero_image_url, logo_url, created_at, updated_at
		FROM dsh_stores %s
		ORDER BY rating_average DESC NULLS LAST, display_name ASC
		LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)

	params = append(params, q.Limit, q.Offset)

	rows, err := db.Query(listQuery, params...)
	if err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to query stores: %w", err)
	}
	defer rows.Close()

	stores := []DshStoreSummary{}
	for rows.Next() {
		var row DshStoreRow
		err := rows.Scan(
			&row.ID, &row.Slug, &row.DisplayName, &row.Status, &row.CityCode, &row.ServiceAreaCode,
			&row.ServiceabilityStatus, &row.RatingAverage, &row.RatingCount, &row.DeliveryEtaMin,
			&row.DeliveryEtaMax, &row.IsVisible, &row.HeroImageUrl, &row.LogoUrl, &row.CreatedAt, &row.UpdatedAt,
		)
		if err != nil {
			return DshStoreListResult{}, fmt.Errorf("failed to scan store row: %w", err)
		}
		stores = append(stores, RowToSummary(row))
	}

	if err = rows.Err(); err != nil {
		return DshStoreListResult{}, fmt.Errorf("error reading rows: %w", err)
	}

	return DshStoreListResult{
		Stores: stores,
		Pagination: Pagination{
			Limit:  q.Limit,
			Offset: q.Offset,
			Total:  total,
		},
	}, nil
}

func GetStoreByID(db *sql.DB, storeID string) (*DshStoreRow, error) {
	query := `
		SELECT id, slug, display_name, status, city_code, service_area_code, serviceability_status,
		       rating_average, rating_count, delivery_eta_min, delivery_eta_max, is_visible,
		       hero_image_url, logo_url, created_at, updated_at
		FROM dsh_stores
		WHERE id = $1`

	var row DshStoreRow
	err := db.QueryRow(query, storeID).Scan(
		&row.ID, &row.Slug, &row.DisplayName, &row.Status, &row.CityCode, &row.ServiceAreaCode,
		&row.ServiceabilityStatus, &row.RatingAverage, &row.RatingCount, &row.DeliveryEtaMin,
		&row.DeliveryEtaMax, &row.IsVisible, &row.HeroImageUrl, &row.LogoUrl, &row.CreatedAt, &row.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query store by id: %w", err)
	}

	return &row, nil
}
