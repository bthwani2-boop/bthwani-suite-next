package servicearea

import (
	"context"
	"database/sql"
	"math"
)

const topologyEpsilon = 1e-10

func UpsertGoverned(ctx context.Context, db *sql.DB, serviceAreaCode string, input UpsertInput) (Geofence, error) {
	if !validPolygonTopology(input.Polygon) {
		return Geofence{}, ErrInvalid
	}
	return Upsert(ctx, db, serviceAreaCode, input)
}

func validPolygonTopology(polygon [][]float64) bool {
	if !validPolygon(polygon) {
		return false
	}
	for index := range polygon {
		next := (index + 1) % len(polygon)
		if samePoint(polygon[index], polygon[next]) {
			return false
		}
	}
	if math.Abs(signedPolygonArea(polygon)) <= topologyEpsilon {
		return false
	}
	for first := 0; first < len(polygon); first++ {
		firstNext := (first + 1) % len(polygon)
		for second := first + 1; second < len(polygon); second++ {
			secondNext := (second + 1) % len(polygon)
			if first == second || firstNext == second || secondNext == first {
				continue
			}
			if first == 0 && secondNext == 0 {
				continue
			}
			if segmentsIntersect(polygon[first], polygon[firstNext], polygon[second], polygon[secondNext]) {
				return false
			}
		}
	}
	return true
}

func signedPolygonArea(polygon [][]float64) float64 {
	area := 0.0
	for index := range polygon {
		next := (index + 1) % len(polygon)
		area += polygon[index][0]*polygon[next][1] - polygon[next][0]*polygon[index][1]
	}
	return area / 2
}

func samePoint(first, second []float64) bool {
	return math.Abs(first[0]-second[0]) <= topologyEpsilon && math.Abs(first[1]-second[1]) <= topologyEpsilon
}

func orientation(first, second, third []float64) float64 {
	return (second[0]-first[0])*(third[1]-first[1]) - (second[1]-first[1])*(third[0]-first[0])
}

func segmentsIntersect(a, b, c, d []float64) bool {
	o1 := orientation(a, b, c)
	o2 := orientation(a, b, d)
	o3 := orientation(c, d, a)
	o4 := orientation(c, d, b)
	if ((o1 > topologyEpsilon && o2 < -topologyEpsilon) || (o1 < -topologyEpsilon && o2 > topologyEpsilon)) &&
		((o3 > topologyEpsilon && o4 < -topologyEpsilon) || (o3 < -topologyEpsilon && o4 > topologyEpsilon)) {
		return true
	}
	return math.Abs(o1) <= topologyEpsilon || math.Abs(o2) <= topologyEpsilon || math.Abs(o3) <= topologyEpsilon || math.Abs(o4) <= topologyEpsilon
}
