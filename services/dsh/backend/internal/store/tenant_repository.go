package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var ErrStoreTenantContextRequired = errors.New("trusted store tenant context is required")

func normalizeStoreTenantID(tenantID string) (string, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return "", ErrStoreTenantContextRequired
	}
	return tenantID, nil
}

// ListAllStoresForTenant is the operator listing boundary for the partners and
// stores workspace. It never accepts a tenant selector from the browser.
func ListAllStoresForTenant(db *sql.DB, tenantID string, q DshStoreListQuery) (DshStoreListResult, error) {
	tenantID, err := normalizeStoreTenantID(tenantID)
	if err != nil {
		return DshStoreListResult{}, err
	}
	conditions := []string{"tenant_id = $1"}
	params := []any{tenantID}
	idx := 2
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
	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM dsh_stores "+whereClause, params...).Scan(&total); err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to count tenant stores: %w", err)
	}
	query := fmt.Sprintf(`SELECT %s FROM dsh_stores %s
		ORDER BY rating_average DESC NULLS LAST, display_name ASC
		LIMIT $%d OFFSET $%d`, storeColumns, whereClause, idx, idx+1)
	rows, err := db.Query(query, append(params, q.Limit, q.Offset)...)
	if err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to query tenant stores: %w", err)
	}
	defer rows.Close()

	stores := make([]DshStoreSummary, 0)
	for rows.Next() {
		row, scanErr := scanStore(rows)
		if scanErr != nil {
			return DshStoreListResult{}, fmt.Errorf("failed to scan tenant store row: %w", scanErr)
		}
		stores = append(stores, RowToSummary(row))
	}
	if err := rows.Err(); err != nil {
		return DshStoreListResult{}, fmt.Errorf("error reading tenant stores: %w", err)
	}
	return DshStoreListResult{
		Stores: stores,
		Pagination: Pagination{
			Limit: q.Limit, Offset: q.Offset, Total: total,
		},
	}, nil
}

func GetStoreByIDInternalForTenant(ctx context.Context, db *sql.DB, tenantID, storeID string) (*DshStoreRow, error) {
	tenantID, err := normalizeStoreTenantID(tenantID)
	if err != nil {
		return nil, err
	}
	row, err := scanStore(db.QueryRowContext(ctx,
		"SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1 AND tenant_id = $2",
		storeID, tenantID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrScopedStoreNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func GetStoreByPartnerIDForTenant(db *sql.DB, tenantID, partnerID string) (*DshStoreRow, error) {
	tenantID, err := normalizeStoreTenantID(tenantID)
	if err != nil {
		return nil, err
	}
	row, err := scanStore(db.QueryRow(
		"SELECT "+storeColumns+" FROM dsh_stores WHERE partner_id = $1 AND tenant_id = $2 ORDER BY created_at ASC LIMIT 1",
		partnerID, tenantID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}
