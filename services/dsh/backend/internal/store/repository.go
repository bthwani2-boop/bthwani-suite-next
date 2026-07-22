package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

const storeColumns = `id, COALESCE(partner_id,''), slug, display_name, status, city_code, service_area_code,
	serviceability_status, rating_average, rating_count, delivery_eta_min,
	delivery_eta_max, is_visible, hero_image_url, logo_url, catalog_domain_id,
	COALESCE((SELECT d.name_ar FROM dsh_catalog_domains d WHERE d.id = dsh_stores.catalog_domain_id), ''),
	delivery_modes, is_free_delivery, distance_km, follower_count,
	has_pro_badge, has_coupon_badge, points_multiplier, is_popular, version,
	partner_readiness, catalog_approval_status, marketing_visibility,
	COALESCE(address_line,''), COALESCE(coverage_summary,''), COALESCE(operating_hours,''),
	COALESCE(delivery_readiness,''), COALESCE(storefront_photo_ref,''),
	COALESCE(interior_photo_ref,''), COALESCE(signage_photo_ref,''),
	created_at, updated_at`

const publicStorePredicate = `is_visible = true
	AND status = 'active'
	AND serviceability_status IN ('serviceable','limited')
	AND partner_readiness = 'ready'
	AND catalog_approval_status = 'approved'
	AND marketing_visibility = 'visible'
	AND cardinality(delivery_modes) > 0
	AND btrim(COALESCE(address_line,'')) <> ''
	AND btrim(COALESCE(coverage_summary,'')) <> ''
	AND btrim(COALESCE(operating_hours,'')) <> ''
	AND delivery_readiness = 'ready'
	AND btrim(COALESCE(hero_image_url,'')) <> ''
	AND btrim(COALESCE(logo_url,'')) <> ''`

func scanStore(scanner interface{ Scan(...any) error }) (DshStoreRow, error) {
	var row DshStoreRow
	err := scanner.Scan(
		&row.ID, &row.PartnerID, &row.Slug, &row.DisplayName, &row.Status, &row.CityCode,
		&row.ServiceAreaCode, &row.ServiceabilityStatus, &row.RatingAverage,
		&row.RatingCount, &row.DeliveryEtaMin, &row.DeliveryEtaMax, &row.IsVisible,
		&row.HeroImageURL, &row.LogoURL, &row.Category, &row.CategoryLabel, pq.Array(&row.DeliveryModes),
		&row.IsFreeDelivery, &row.DistanceKM, &row.FollowerCount, &row.HasProBadge,
		&row.HasCouponBadge, &row.PointsMultiplier, &row.IsPopular,
		&row.Version,
		&row.PartnerReadiness, &row.CatalogApprovalStatus, &row.MarketingVisibility,
		&row.AddressLine, &row.CoverageSummary, &row.OperatingHours,
		&row.DeliveryReadiness, &row.StorefrontPhotoRef, &row.InteriorPhotoRef,
		&row.SignagePhotoRef,
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
		conditions = append(conditions, "("+publicStorePredicate+")")
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
	row, err := scanStore(db.QueryRow("SELECT "+storeColumns+` FROM dsh_stores
		WHERE id = $1 AND (`+publicStorePredicate+`)`, storeID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query store by id: %w", err)
	}
	return &row, nil
}

// GetStoreByPartnerID resolves the store owned by partnerID, ignoring the
// public visibility gate (used by internal/field/operator surfaces, never by
// app-client). Returns nil if the partner has no linked store.
func GetStoreByPartnerID(db *sql.DB, partnerID string) (*DshStoreRow, error) {
	row, err := scanStore(db.QueryRow(
		"SELECT "+storeColumns+" FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at ASC LIMIT 1",
		partnerID,
	))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query store by partner id: %w", err)
	}
	return &row, nil
}

type CreateDraftStoreInput struct {
	PartnerID   string
	DisplayName string
	CityCode    string
	Category    string
}

type execQueryRower interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
}

// CreateDraftStore inserts a new, unpublished store linked to a partner.
// Never visible to app-client: is_visible=false, status=inactive,
// serviceability=unavailable, and partner_readiness/catalog_approval_status/
// marketing_visibility keep their safe column defaults (pending/draft/hidden).
func CreateDraftStore(db execQueryRower, input CreateDraftStoreInput) (DshStoreRow, error) {
	id := fmt.Sprintf("store-%d", time.Now().UnixNano())
	catalogDomainID := catalogDomainIDForPartnerCategory(input.Category)
	cityCode := input.CityCode
	if cityCode == "" {
		cityCode = "unassigned"
	}

	_, err := db.Exec(`
		INSERT INTO dsh_stores (
			id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, catalog_domain_id, partner_id
		) VALUES ($1,$1,$2,'inactive',$3,$3,'unavailable',false,$4,$5)`,
		id, input.DisplayName, cityCode, catalogDomainID, input.PartnerID,
	)
	if err != nil {
		return DshStoreRow{}, fmt.Errorf("failed to create draft store: %w", err)
	}

	row, err := scanStore(db.QueryRow("SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1", id))
	if err != nil {
		return DshStoreRow{}, fmt.Errorf("failed to load created draft store: %w", err)
	}
	return row, nil
}

func catalogDomainIDForPartnerCategory(category string) string {
	category = strings.TrimSpace(category)
	if strings.HasPrefix(category, "domain-") {
		return category
	}
	switch category {
	case "restaurant":
		return "domain-restaurants"
	case "grocery", "bakery":
		return "domain-groceries"
	case "pharmacy":
		return "domain-pharmacy"
	default:
		return "domain-bthwani-store"
	}
}

func UpdateFieldStoreDraft(ctx context.Context, db *sql.DB, storeID, actorID, correlationID string, input FieldStoreDraftInput) (FieldPartnerStoreDraft, StoreAuditEvent, error) {
	if storeID == "" || actorID == "" {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, fmt.Errorf("invalid field store draft input")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}
	defer tx.Rollback()

	before, err := scanStore(tx.QueryRowContext(ctx, "SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1", storeID))
	if err == sql.ErrNoRows {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, ErrScopedStoreNotFound
	}
	if err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_stores
		SET display_name = COALESCE($2, display_name),
		    city_code = COALESCE($3, city_code),
		    service_area_code = COALESCE($4, service_area_code),
		    address_line = COALESCE($5, address_line),
		    coverage_summary = COALESCE($6, coverage_summary),
		    operating_hours = COALESCE($7, operating_hours),
		    delivery_readiness = COALESCE($8, delivery_readiness),
		    storefront_photo_ref = COALESCE($9, storefront_photo_ref),
		    interior_photo_ref = COALESCE($10, interior_photo_ref),
		    signage_photo_ref = COALESCE($11, signage_photo_ref),
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1`,
		storeID, input.DisplayName, input.CityCode, input.ServiceAreaCode,
		input.AddressLine, input.CoverageSummary, input.OperatingHours,
		input.DeliveryReadiness, input.StorefrontPhotoRef, input.InteriorPhotoRef,
		input.SignagePhotoRef,
	)
	if err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}

	after, err := scanStore(tx.QueryRowContext(ctx, "SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1", storeID))
	if err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}
	audit := StoreAuditEvent{
		ID:            eventID("audit"),
		ActorID:       actorID,
		ActorRole:     "field",
		StoreID:       storeID,
		Action:        "field_store_draft_updated",
		FromState:     map[string]any{"store": RowToFieldPartnerStoreDraft(before)},
		ToState:       map[string]any{"store": RowToFieldPartnerStoreDraft(after)},
		Reason:        "field onboarding store draft update",
		CorrelationID: correlationID,
		CreatedAt:     time.Now().UTC(),
	}
	beforeJSON, _ := json.Marshal(audit.FromState)
	afterJSON, _ := json.Marshal(audit.ToState)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_store_action_audit
		  (id, actor_id, actor_role, store_id, action, from_state, to_state, reason, correlation_id, created_at)
		VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)`,
		audit.ID, audit.ActorID, audit.ActorRole, audit.StoreID, audit.Action,
		string(beforeJSON), string(afterJSON), audit.Reason, audit.CorrelationID, audit.CreatedAt,
	)
	if err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}

	if err := tx.Commit(); err != nil {
		return FieldPartnerStoreDraft{}, StoreAuditEvent{}, err
	}

	return RowToFieldPartnerStoreDraft(after), audit, nil
}
