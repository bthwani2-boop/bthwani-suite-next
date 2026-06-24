package platformpolicies

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
)

// ── Service Zones ─────────────────────────────────────────────────────────────

type Zone struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	CityCode    string    `json:"cityCode"`
	IsActive    bool      `json:"isActive"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func ListZones(db *sql.DB) ([]Zone, error) {
	rows, err := db.Query(`
		SELECT id, name, city_code, is_active,
		       COALESCE(description,''), created_at, updated_at
		FROM dsh_platform_zones ORDER BY city_code, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Zone
	for rows.Next() {
		var z Zone
		if err := rows.Scan(&z.ID, &z.Name, &z.CityCode, &z.IsActive,
			&z.Description, &z.CreatedAt, &z.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, z)
	}
	if out == nil {
		out = []Zone{}
	}
	return out, rows.Err()
}

func CreateZone(db *sql.DB, name, cityCode, description string) (Zone, error) {
	if name == "" || cityCode == "" {
		return Zone{}, ErrInvalid
	}
	var z Zone
	err := db.QueryRow(`
		INSERT INTO dsh_platform_zones (name, city_code, is_active, description)
		VALUES ($1, $2, TRUE, $3)
		RETURNING id, name, city_code, is_active,
		          COALESCE(description,''), created_at, updated_at`,
		name, cityCode, description).Scan(
		&z.ID, &z.Name, &z.CityCode, &z.IsActive,
		&z.Description, &z.CreatedAt, &z.UpdatedAt)
	return z, err
}

func UpdateZone(db *sql.DB, id string, isActive bool, name, description string) (Zone, error) {
	var z Zone
	err := db.QueryRow(`
		UPDATE dsh_platform_zones
		SET is_active=$2,
		    name=COALESCE(NULLIF($3,''), name),
		    description=COALESCE(NULLIF($4,''), description),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, name, city_code, is_active,
		          COALESCE(description,''), created_at, updated_at`,
		id, isActive, name, description).Scan(
		&z.ID, &z.Name, &z.CityCode, &z.IsActive,
		&z.Description, &z.CreatedAt, &z.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return z, ErrNotFound
	}
	return z, err
}

// ── SLA Rules ─────────────────────────────────────────────────────────────────

type SlaRule struct {
	ID              string    `json:"id"`
	ZoneID          string    `json:"zoneId"`
	Category        string    `json:"category"`
	MaxPrepMins     int       `json:"maxPrepMins"`
	MaxDeliveryMins int       `json:"maxDeliveryMins"`
	UpdatedBy       string    `json:"updatedBy"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func ListSlaRules(db *sql.DB, zoneID string) ([]SlaRule, error) {
	rows, err := db.Query(`
		SELECT id, zone_id, category, max_prep_mins, max_delivery_mins,
		       COALESCE(updated_by,''), updated_at
		FROM dsh_platform_sla_rules
		WHERE ($1='' OR zone_id=$1)
		ORDER BY zone_id, category`, zoneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SlaRule
	for rows.Next() {
		var s SlaRule
		if err := rows.Scan(&s.ID, &s.ZoneID, &s.Category,
			&s.MaxPrepMins, &s.MaxDeliveryMins, &s.UpdatedBy, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if out == nil {
		out = []SlaRule{}
	}
	return out, rows.Err()
}

func UpsertSlaRule(db *sql.DB, zoneID, category string, maxPrepMins, maxDeliveryMins int, updatedBy string) (SlaRule, error) {
	if zoneID == "" || category == "" {
		return SlaRule{}, ErrInvalid
	}
	var s SlaRule
	err := db.QueryRow(`
		INSERT INTO dsh_platform_sla_rules
		       (zone_id, category, max_prep_mins, max_delivery_mins, updated_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (zone_id, category)
		DO UPDATE SET max_prep_mins=EXCLUDED.max_prep_mins,
		              max_delivery_mins=EXCLUDED.max_delivery_mins,
		              updated_by=EXCLUDED.updated_by,
		              updated_at=NOW()
		RETURNING id, zone_id, category, max_prep_mins, max_delivery_mins,
		          COALESCE(updated_by,''), updated_at`,
		zoneID, category, maxPrepMins, maxDeliveryMins, updatedBy).Scan(
		&s.ID, &s.ZoneID, &s.Category,
		&s.MaxPrepMins, &s.MaxDeliveryMins, &s.UpdatedBy, &s.UpdatedAt)
	return s, err
}

// ── Capacity Config ───────────────────────────────────────────────────────────

type CapacityConfig struct {
	ID                  string    `json:"id"`
	ZoneID              string    `json:"zoneId"`
	MaxConcurrentOrders int       `json:"maxConcurrentOrders"`
	MaxCaptainsOnline   int       `json:"maxCaptainsOnline"`
	ThrottleThreshold   int       `json:"throttleThreshold"`
	UpdatedBy           string    `json:"updatedBy"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

func GetCapacityConfig(db *sql.DB, zoneID string) (CapacityConfig, error) {
	var c CapacityConfig
	err := db.QueryRow(`
		SELECT id, zone_id, max_concurrent_orders, max_captains_online,
		       throttle_threshold, COALESCE(updated_by,''), updated_at
		FROM dsh_platform_capacity WHERE zone_id=$1`, zoneID).Scan(
		&c.ID, &c.ZoneID, &c.MaxConcurrentOrders, &c.MaxCaptainsOnline,
		&c.ThrottleThreshold, &c.UpdatedBy, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func UpsertCapacityConfig(db *sql.DB, zoneID string, maxOrders, maxCaptains, throttle int, updatedBy string) (CapacityConfig, error) {
	if zoneID == "" {
		return CapacityConfig{}, ErrInvalid
	}
	var c CapacityConfig
	err := db.QueryRow(`
		INSERT INTO dsh_platform_capacity
		       (zone_id, max_concurrent_orders, max_captains_online, throttle_threshold, updated_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (zone_id) DO UPDATE
		SET max_concurrent_orders=EXCLUDED.max_concurrent_orders,
		    max_captains_online=EXCLUDED.max_captains_online,
		    throttle_threshold=EXCLUDED.throttle_threshold,
		    updated_by=EXCLUDED.updated_by,
		    updated_at=NOW()
		RETURNING id, zone_id, max_concurrent_orders, max_captains_online,
		          throttle_threshold, COALESCE(updated_by,''), updated_at`,
		zoneID, maxOrders, maxCaptains, throttle, updatedBy).Scan(
		&c.ID, &c.ZoneID, &c.MaxConcurrentOrders, &c.MaxCaptainsOnline,
		&c.ThrottleThreshold, &c.UpdatedBy, &c.UpdatedAt)
	return c, err
}

// ── Serviceability check ──────────────────────────────────────────────────────

type ZoneServiceabilityResult struct {
	ZoneID      string `json:"zoneId"`
	IsActive    bool   `json:"isActive"`
	ActiveStores int   `json:"activeStores"`
	SlaAvailable bool  `json:"slaAvailable"`
}

func GetZoneServiceability(db *sql.DB, zoneID string) (ZoneServiceabilityResult, error) {
	out := ZoneServiceabilityResult{ZoneID: zoneID}
	err := db.QueryRow(`SELECT is_active FROM dsh_platform_zones WHERE id=$1`, zoneID).Scan(&out.IsActive)
	if errors.Is(err, sql.ErrNoRows) {
		return out, ErrNotFound
	}
	if err != nil {
		return out, err
	}
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM dsh_stores WHERE service_area_code=$1 AND visibility_status='active'`, zoneID,
	).Scan(&out.ActiveStores); err != nil {
		return out, err
	}
	var slaCount int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM dsh_platform_sla_rules WHERE zone_id=$1`, zoneID,
	).Scan(&slaCount); err != nil {
		return out, err
	}
	out.SlaAvailable = slaCount > 0
	return out, nil
}
