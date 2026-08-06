package servicearea

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math"
	"regexp"
	"strings"
	"time"
)

var (
	ErrInvalid             = errors.New("invalid service area")
	ErrNotFound            = errors.New("service area not found")
	ErrVersionConflict     = errors.New("service area version conflict")
	ErrIdempotencyConflict = errors.New("service area idempotency conflict")
)

var serviceAreaCodePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,79}$`)

const (
	serviceAreaSRID          = 4326
	serviceAreaOverlapPolicy = "priority_then_code"
)

type Geofence struct {
	ServiceAreaCode string      `json:"serviceAreaCode"`
	DisplayName     string      `json:"displayName"`
	Polygon         [][]float64 `json:"polygon"`
	Active          bool        `json:"active"`
	Priority        int         `json:"priority"`
	SRID            int         `json:"srid"`
	OverlapPolicy   string      `json:"overlapPolicy"`
	EffectiveFrom   time.Time   `json:"effectiveFrom"`
	ExpiresAt       *time.Time  `json:"expiresAt,omitempty"`
	Version         int         `json:"version"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

type UpsertInput struct {
	DisplayName     string      `json:"displayName"`
	Polygon         [][]float64 `json:"polygon"`
	Active          bool        `json:"active"`
	Priority        int         `json:"priority"`
	SRID            int         `json:"srid"`
	OverlapPolicy   string      `json:"overlapPolicy"`
	EffectiveFrom   time.Time   `json:"effectiveFrom"`
	ExpiresAt       *time.Time  `json:"expiresAt"`
	ExpectedVersion int         `json:"expectedVersion"`
	Reason          string      `json:"reason"`
	ActorID         string      `json:"-"`
	ActorSurface    string      `json:"-"`
	IdempotencyKey  string      `json:"-"`
	CorrelationID   string      `json:"-"`
}

type Resolution struct {
	ServiceAreaCode string `json:"serviceAreaCode,omitempty"`
	DisplayName     string `json:"displayName,omitempty"`
	Verified        bool   `json:"verified"`
	Version         int    `json:"version,omitempty"`
}

func List(ctx context.Context, db *sql.DB) ([]Geofence, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT service_area_code, display_name, ST_AsGeoJSON(polygon)::jsonb->'coordinates'->0 as polygon, active, priority,
		       srid, overlap_policy, effective_from, expires_at,
		       version, created_at, updated_at
		FROM dsh_service_area_geofences
		ORDER BY priority DESC, service_area_code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Geofence{}
	for rows.Next() {
		item, err := scanGeofence(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func Resolve(ctx context.Context, db *sql.DB, latitude, longitude float64) (Resolution, error) {
	if !validCoordinate(latitude, longitude) {
		return Resolution{}, ErrInvalid
	}
	row := db.QueryRowContext(ctx, `
		WITH effective_versions AS (
			SELECT DISTINCT ON (service_area_code)
			       service_area_code, display_name, polygon, active, priority,
			       srid, overlap_policy, effective_from, expires_at, version,
			       created_at, created_at AS updated_at
			FROM dsh_service_area_versions
			WHERE effective_from <= NOW()
			  AND (expires_at IS NULL OR expires_at > NOW())
			ORDER BY service_area_code, effective_from DESC, version DESC
		)
		SELECT service_area_code, display_name, version
		FROM effective_versions
		WHERE active = TRUE
		  AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
		ORDER BY priority DESC, service_area_code ASC
		LIMIT 1`, longitude, latitude)

	var res Resolution
	if err := row.Scan(&res.ServiceAreaCode, &res.DisplayName, &res.Version); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Resolution{Verified: false}, nil
		}
		return Resolution{}, err
	}
	res.Verified = true
	return res, nil
}

func Upsert(ctx context.Context, db *sql.DB, serviceAreaCode string, input UpsertInput) (Geofence, error) {
	serviceAreaCode = strings.ToLower(strings.TrimSpace(serviceAreaCode))
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Reason = strings.TrimSpace(input.Reason)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorSurface = strings.TrimSpace(input.ActorSurface)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	input.OverlapPolicy = strings.TrimSpace(input.OverlapPolicy)
	if input.SRID == 0 {
		input.SRID = serviceAreaSRID
	}
	if input.OverlapPolicy == "" {
		input.OverlapPolicy = serviceAreaOverlapPolicy
	}
	if !input.EffectiveFrom.IsZero() {
		input.EffectiveFrom = input.EffectiveFrom.UTC()
	}
	if input.ExpiresAt != nil {
		expiresAt := input.ExpiresAt.UTC()
		input.ExpiresAt = &expiresAt
	}
	if !serviceAreaCodePattern.MatchString(serviceAreaCode) || input.DisplayName == "" || len(input.DisplayName) > 160 || len(input.Reason) < 3 || len(input.Reason) > 500 || input.ActorID == "" || input.ActorSurface == "" || len(input.IdempotencyKey) < 8 || input.Priority < 0 || input.Priority > 100000 || input.SRID != serviceAreaSRID || input.OverlapPolicy != serviceAreaOverlapPolicy || (!input.EffectiveFrom.IsZero() && input.EffectiveFrom.Before(time.Now().UTC().Add(-time.Second))) || (input.ExpiresAt != nil && !input.EffectiveFrom.IsZero() && !input.ExpiresAt.After(input.EffectiveFrom)) || input.ExpectedVersion < 0 {
		return Geofence{}, ErrInvalid
	}

	hashPayload, _ := json.Marshal(struct {
		ServiceAreaCode string      `json:"serviceAreaCode"`
		DisplayName     string      `json:"displayName"`
		Polygon         [][]float64 `json:"polygon"`
		Active          bool        `json:"active"`
		Priority        int         `json:"priority"`
		SRID            int         `json:"srid"`
		OverlapPolicy   string      `json:"overlapPolicy"`
		EffectiveFrom   time.Time   `json:"effectiveFrom"`
		ExpiresAt       *time.Time  `json:"expiresAt"`
		ExpectedVersion int         `json:"expectedVersion"`
		Reason          string      `json:"reason"`
	}{serviceAreaCode, input.DisplayName, input.Polygon, input.Active, input.Priority, input.SRID, input.OverlapPolicy, input.EffectiveFrom, input.ExpiresAt, input.ExpectedVersion, input.Reason})
	sum := sha256.Sum256(hashPayload)
	requestHash := hex.EncodeToString(sum[:])
	operation := "upsert-service-area:" + serviceAreaCode

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Geofence{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, input.ActorID+"|"+operation+"|"+input.IdempotencyKey); err != nil {
		return Geofence{}, err
	}

	var storedHash string
	var storedResponse []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_service_area_mutation_results
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		input.ActorID, operation, input.IdempotencyKey).Scan(&storedHash, &storedResponse)
	if err == nil {
		if storedHash != requestHash {
			return Geofence{}, ErrIdempotencyConflict
		}
		var replay Geofence
		if err := json.Unmarshal(storedResponse, &replay); err != nil {
			return Geofence{}, err
		}
		if err := tx.Commit(); err != nil {
			return Geofence{}, err
		}
		return replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Geofence{}, err
	}

	before, found, err := getForUpdate(ctx, tx, serviceAreaCode)
	if err != nil {
		return Geofence{}, err
	}
	effectiveFrom := input.EffectiveFrom
	if effectiveFrom.IsZero() {
		effectiveFrom = time.Now().UTC()
	}
	if input.ExpiresAt != nil && !input.ExpiresAt.After(effectiveFrom) {
		return Geofence{}, ErrInvalid
	}
	var result Geofence
	var action string
	var fromVersion any
	var polygonJSON []byte
		// Convert [][]float64 to a GeoJSON Polygon representation for PostGIS
		geoJSONBytes, _ := json.Marshal(map[string]interface{}{
			"type":        "Polygon",
			"coordinates": [][][]float64{input.Polygon},
		})
		geoJSONStr := string(geoJSONBytes)

		if !found {
			if input.ExpectedVersion != 0 {
				return Geofence{}, ErrVersionConflict
			}
			err = tx.QueryRowContext(ctx, `
				INSERT INTO dsh_service_area_geofences
					(service_area_code, display_name, polygon, active, priority,
					 srid, overlap_policy, effective_from, expires_at)
				VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4, $5, $6, $7, $8, $9)
				RETURNING service_area_code, display_name, ST_AsGeoJSON(polygon)::jsonb->'coordinates'->0, active, priority,
				          srid, overlap_policy, effective_from, expires_at,
				          version, created_at, updated_at`,
				serviceAreaCode, input.DisplayName, geoJSONStr, input.Active, input.Priority,
				input.SRID, input.OverlapPolicy, effectiveFrom, input.ExpiresAt,
			).Scan(&result.ServiceAreaCode, &result.DisplayName, &polygonJSON, &result.Active, &result.Priority,
				&result.SRID, &result.OverlapPolicy, &result.EffectiveFrom, &result.ExpiresAt,
				&result.Version, &result.CreatedAt, &result.UpdatedAt)
			if err != nil {
				return Geofence{}, err
			}
			if err := json.Unmarshal(polygonJSON, &result.Polygon); err != nil {
				return Geofence{}, err
			}
			action = "created"
			fromVersion = nil
		} else {
			if input.ExpectedVersion != before.Version {
				return Geofence{}, ErrVersionConflict
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_service_area_geofences
				SET display_name = $2, polygon = ST_GeomFromGeoJSON($3), active = $4, priority = $5,
					srid = $6, overlap_policy = $7, effective_from = $8, expires_at = $9,
					version = version + 1, updated_at = NOW()
				WHERE service_area_code = $1
				RETURNING service_area_code, display_name, ST_AsGeoJSON(polygon)::jsonb->'coordinates'->0, active, priority,
				          srid, overlap_policy, effective_from, expires_at,
				          version, created_at, updated_at`,
				serviceAreaCode, input.DisplayName, geoJSONStr, input.Active, input.Priority,
				input.SRID, input.OverlapPolicy, effectiveFrom, input.ExpiresAt,
			).Scan(&result.ServiceAreaCode, &result.DisplayName, &polygonJSON, &result.Active, &result.Priority,
				&result.SRID, &result.OverlapPolicy, &result.EffectiveFrom, &result.ExpiresAt,
				&result.Version, &result.CreatedAt, &result.UpdatedAt)
			if err != nil {
				return Geofence{}, err
			}
			if err := json.Unmarshal(polygonJSON, &result.Polygon); err != nil {
				return Geofence{}, err
			}
		action = "updated"
		if before.Active != result.Active {
			if result.Active {
				action = "activated"
			} else {
				action = "deactivated"
			}
		}
		fromVersion = before.Version
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_service_area_events
			(service_area_code, actor_id, actor_surface, action, from_version, to_version, reason, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''))`,
		serviceAreaCode, input.ActorID, input.ActorSurface, action, fromVersion, result.Version, input.Reason, input.CorrelationID); err != nil {
		return Geofence{}, err
	}
	versionGeoJSONBytes, _ := json.Marshal(map[string]interface{}{
		"type":        "Polygon",
		"coordinates": [][][]float64{result.Polygon},
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_service_area_versions (
			service_area_code, version, display_name, polygon, active, priority,
			srid, overlap_policy, effective_from, expires_at,
			actor_id, actor_surface, reason, correlation_id
		) VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, NULLIF($14, ''))`,
		result.ServiceAreaCode, result.Version, result.DisplayName, string(versionGeoJSONBytes),
		result.Active, result.Priority, result.SRID, result.OverlapPolicy,
		result.EffectiveFrom, result.ExpiresAt, input.ActorID, input.ActorSurface,
		input.Reason, input.CorrelationID); err != nil {
		return Geofence{}, err
	}
	responseJSON, _ := json.Marshal(result)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_service_area_mutation_results
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		input.ActorID, operation, input.IdempotencyKey, requestHash, string(responseJSON)); err != nil {
		return Geofence{}, err
	}
	if err := tx.Commit(); err != nil {
		return Geofence{}, err
	}
	return result, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanGeofence(row rowScanner) (Geofence, error) {
	var item Geofence
	var polygon []byte
	if err := row.Scan(
		&item.ServiceAreaCode, &item.DisplayName, &polygon, &item.Active, &item.Priority,
		&item.SRID, &item.OverlapPolicy, &item.EffectiveFrom, &item.ExpiresAt,
		&item.Version, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return Geofence{}, err
	}
	if err := json.Unmarshal(polygon, &item.Polygon); err != nil {
		return Geofence{}, err
	}
	return item, nil
}

func getForUpdate(ctx context.Context, tx *sql.Tx, serviceAreaCode string) (Geofence, bool, error) {
	row := tx.QueryRowContext(ctx, `
		SELECT service_area_code, display_name, ST_AsGeoJSON(polygon)::jsonb->'coordinates'->0 as polygon, active, priority,
		       srid, overlap_policy, effective_from, expires_at,
		       version, created_at, updated_at
		FROM dsh_service_area_geofences
		WHERE service_area_code = $1
		FOR UPDATE`, serviceAreaCode)
	item, err := scanGeofence(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Geofence{}, false, nil
	}
	return item, err == nil, err
}

func validCoordinate(latitude, longitude float64) bool {
	return !math.IsNaN(latitude) && !math.IsNaN(longitude) && !math.IsInf(latitude, 0) && !math.IsInf(longitude, 0) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

func pointInPolygon(latitude, longitude float64, polygon [][]float64) bool {
	if len(polygon) < 3 {
		return false
	}
	inside := false
	j := len(polygon) - 1
	for i := 0; i < len(polygon); i++ {
		pi := polygon[i]
		pj := polygon[j]
		if (pi[1] > longitude) != (pj[1] > longitude) &&
			latitude < (pj[0]-pi[0])*(longitude-pi[1])/(pj[1]-pi[1])+pi[0] {
			inside = !inside
		}
		j = i
	}
	return inside
}
