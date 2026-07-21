package servicearea

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

type Bounds struct {
	MinLongitude float64 `json:"minLongitude"`
	MinLatitude  float64 `json:"minLatitude"`
	MaxLongitude float64 `json:"maxLongitude"`
	MaxLatitude  float64 `json:"maxLatitude"`
}

type Projection struct {
	Geofence
	PointCount int    `json:"pointCount"`
	Bounds     Bounds `json:"bounds"`
}

func Project(item Geofence) Projection {
	projection := Projection{Geofence: item, PointCount: len(item.Polygon)}
	if len(item.Polygon) == 0 {
		return projection
	}
	projection.Bounds = Bounds{
		MinLongitude: item.Polygon[0][0],
		MaxLongitude: item.Polygon[0][0],
		MinLatitude:  item.Polygon[0][1],
		MaxLatitude:  item.Polygon[0][1],
	}
	for _, point := range item.Polygon[1:] {
		if point[0] < projection.Bounds.MinLongitude {
			projection.Bounds.MinLongitude = point[0]
		}
		if point[0] > projection.Bounds.MaxLongitude {
			projection.Bounds.MaxLongitude = point[0]
		}
		if point[1] < projection.Bounds.MinLatitude {
			projection.Bounds.MinLatitude = point[1]
		}
		if point[1] > projection.Bounds.MaxLatitude {
			projection.Bounds.MaxLatitude = point[1]
		}
	}
	return projection
}

func ListProjections(ctx context.Context, db *sql.DB) ([]Projection, error) {
	items, err := List(ctx, db)
	if err != nil {
		return nil, err
	}
	result := make([]Projection, 0, len(items))
	for _, item := range items {
		result = append(result, Project(item))
	}
	return result, nil
}

func GetProjection(ctx context.Context, db *sql.DB, serviceAreaCode string) (Projection, error) {
	serviceAreaCode = strings.ToLower(strings.TrimSpace(serviceAreaCode))
	if !serviceAreaCodePattern.MatchString(serviceAreaCode) {
		return Projection{}, ErrInvalid
	}
	row := db.QueryRowContext(ctx, `
		SELECT service_area_code, display_name, polygon, active, priority, version, created_at, updated_at
		FROM dsh_service_area_geofences
		WHERE service_area_code = $1`, serviceAreaCode)
	item, err := scanGeofence(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Projection{}, ErrNotFound
	}
	if err != nil {
		return Projection{}, err
	}
	return Project(item), nil
}
