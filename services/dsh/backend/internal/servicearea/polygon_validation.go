package servicearea

const maxServiceAreaPolygonPoints = 10000

// normalizePolygonRing owns the boundary between the API representation and
// PostGIS. The API accepts three or more unique longitude/latitude vertices
// and may replay a PostGIS response whose final vertex closes the ring. The
// domain representation is always unclosed so both forms hash identically.
func normalizePolygonRing(ring [][]float64) ([][]float64, bool) {
	if len(ring) < 3 || len(ring) > maxServiceAreaPolygonPoints+1 {
		return nil, false
	}

	normalized := make([][]float64, len(ring))
	for index, point := range ring {
		if len(point) != 2 || !validCoordinate(point[1], point[0]) {
			return nil, false
		}
		normalized[index] = []float64{point[0], point[1]}
	}
	if len(normalized) > 3 && samePoint(normalized[0], normalized[len(normalized)-1]) {
		normalized = normalized[:len(normalized)-1]
	}
	if len(normalized) < 3 || len(normalized) > maxServiceAreaPolygonPoints {
		return nil, false
	}
	return normalized, true
}

func closePolygonRing(ring [][]float64) [][]float64 {
	closed := make([][]float64, 0, len(ring)+1)
	for _, point := range ring {
		closed = append(closed, []float64{point[0], point[1]})
	}
	closed = append(closed, []float64{ring[0][0], ring[0][1]})
	return closed
}

func validPolygon(ring [][]float64) bool {
	_, valid := normalizePolygonRing(ring)
	return valid
}
