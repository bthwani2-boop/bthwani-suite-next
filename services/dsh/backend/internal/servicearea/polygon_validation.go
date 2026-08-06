package servicearea

// validPolygon checks that the polygon ring has the minimum number of
// vertices (≥3 points, plus the closing repeat) required to form a ring.
// Detailed self-intersection checks are delegated to validPolygonTopology.
func validPolygon(ring [][]float64) bool {
	// A polygon ring must have at least 4 points (3 unique + 1 closing).
	if len(ring) < 4 {
		return false
	}
	// Each point must have at least 2 coordinates (lon, lat).
	for _, point := range ring {
		if len(point) < 2 {
			return false
		}
	}
	return true
}
