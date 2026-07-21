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

type Geofence struct {
	ServiceAreaCode string      `json:"serviceAreaCode"`
	DisplayName     string      `json:"displayName"`
	Polygon         [][]float64 `json:"polygon"`
	Active          bool        `json:"active"`
	Priority        int         `json:"priority"`
	Version         int         `json:"version"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

type UpsertInput struct {
	DisplayName     string      `json:"displayName"`
	Polygon         [][]float64 `json:"polygon"`
	Active          bool        `json:"active"`
	Priority        int         `json:"priority"`
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
		SELECT service_area_code, display_name, polygon, active, priority, version, created_at, updated_at
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
	rows, err := db.QueryContext(ctx, `
		SELECT service_area_code, display_name, polygon, active, priority, version, created_at, updated_at
		FROM dsh_service_area_geofences
		WHERE active = TRUE
		ORDER BY priority DESC, service_area_code ASC`)
	if err != nil {
		return Resolution{}, err
	}
	defer rows.Close()
	for rows.Next() {
		item, err := scanGeofence(rows)
		if err != nil {
			return Resolution{}, err
		}
		if pointInPolygon(longitude, latitude, item.Polygon) {
			return Resolution{
				ServiceAreaCode: item.ServiceAreaCode,
				DisplayName:     item.DisplayName,
				Verified:        true,
				Version:         item.Version,
			}, nil
		}
	}
	if err := rows.Err(); err != nil {
		return Resolution{}, err
	}
	return Resolution{Verified: false}, nil
}

func Upsert(ctx context.Context, db *sql.DB, serviceAreaCode string, input UpsertInput) (Geofence, error) {
	serviceAreaCode = strings.ToLower(strings.TrimSpace(serviceAreaCode))
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Reason = strings.TrimSpace(input.Reason)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorSurface = strings.TrimSpace(input.ActorSurface)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if !serviceAreaCodePattern.MatchString(serviceAreaCode) || input.DisplayName == "" || len(input.DisplayName) > 160 || len(input.Reason) < 3 || len(input.Reason) > 500 || input.ActorID == "" || input.ActorSurface == "" || len(input.IdempotencyKey) < 8 || input.Priority < 0 || input.Priority > 100000 || input.ExpectedVersion < 0 || !validPolygon(input.Polygon) {
		return Geofence{}, ErrInvalid
	}

	hashPayload, _ := json.Marshal(struct {
		ServiceAreaCode string      `json:"serviceAreaCode"`
		DisplayName     string      `json:"displayName"`
		Polygon         [][]float64 `json:"polygon"`
		Active          bool        `json:"active"`
		Priority        int         `json:"priority"`
		ExpectedVersion int         `json:"expectedVersion"`
		Reason          string      `json:"reason"`
	}{serviceAreaCode, input.DisplayName, input.Polygon, input.Active, input.Priority, input.ExpectedVersion, input.Reason})
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
	var result Geofence
	var action string
	var fromVersion any
	if !found {
		if input.ExpectedVersion != 0 {
			return Geofence{}, ErrVersionConflict
		}
		polygonJSON, _ := json.Marshal(input.Polygon)
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_service_area_geofences
				(service_area_code, display_name, polygon, active, priority)
			VALUES ($1, $2, $3::jsonb, $4, $5)
			RETURNING service_area_code, display_name, polygon, active, priority, version, created_at, updated_at`,
			serviceAreaCode, input.DisplayName, string(polygonJSON), input.Active, input.Priority,
		).Scan(&result.ServiceAreaCode, &result.DisplayName, &polygonJSON, &result.Active, &result.Priority, &result.Version, &result.CreatedAt, &result.UpdatedAt)
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
		polygonJSON, _ := json.Marshal(input.Polygon)
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_service_area_geofences
			SET display_name = $2, polygon = $3::jsonb, active = $4, priority = $5,
				version = version + 1, updated_at = NOW()
			WHERE service_area_code = $1
			RETURNING service_area_code, display_name, polygon, active, priority, version, created_at, updated_at`,
			serviceAreaCode, input.DisplayName, string(polygonJSON), input.Active, input.Priority,
		).Scan(&result.ServiceAreaCode, &result.DisplayName, &polygonJSON, &result.Active, &result.Priority, &result.Version, &result.CreatedAt, &result.UpdatedAt)
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
	if err := row.Scan(&item.ServiceAreaCode, &item.DisplayName, &polygon, &item.Active, &item.Priority, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
		return Geofence{}, err
	}
	if err := json.Unmarshal(polygon, &item.Polygon); err != nil {
		return Geofence{}, err
	}
	return item, nil
}

func getForUpdate(ctx context.Context, tx *sql.Tx, serviceAreaCode string) (Geofence, bool, error) {
	row := tx.QueryRowContext(ctx, `
		SELECT service_area_code, display_name, polygon, active, priority, version, created_at, updated_at
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

func validPolygon(polygon [][]float64) bool {
	if len(polygon) < 3 || len(polygon) > 10000 {
		return false
	}
	for _, point := range polygon {
		if len(point) != 2 || !validCoordinate(point[1], point[0]) {
			return false
		}
	}
	return true
}

func pointInPolygon(longitude, latitude float64, polygon [][]float64) bool {
	inside := false
	j := len(polygon) - 1
	for i := 0; i < len(polygon); i++ {
		xi, yi := polygon[i][0], polygon[i][1]
		xj, yj := polygon[j][0], polygon[j][1]
		if pointOnSegment(longitude, latitude, xi, yi, xj, yj) {
			return true
		}
		intersects := ((yi > latitude) != (yj > latitude)) &&
			(longitude < (xj-xi)*(latitude-yi)/(yj-yi)+xi)
		if intersects {
			inside = !inside
		}
		j = i
	}
	return inside
}

func pointOnSegment(px, py, ax, ay, bx, by float64) bool {
	const epsilon = 1e-9
	cross := (px-ax)*(by-ay) - (py-ay)*(bx-ax)
	if math.Abs(cross) > epsilon {
		return false
	}
	dot := (px-ax)*(bx-ax) + (py-ay)*(by-ay)
	if dot < -epsilon {
		return false
	}
	squaredLength := (bx-ax)*(bx-ax) + (by-ay)*(by-ay)
	return dot <= squaredLength+epsilon
}
