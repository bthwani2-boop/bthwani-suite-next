package servicearea

import "testing"

func TestPointInPolygonIncludesInteriorAndBoundary(t *testing.T) {
	polygon := [][]float64{
		{44.0, 15.0},
		{45.0, 15.0},
		{45.0, 16.0},
		{44.0, 16.0},
	}
	if !pointInPolygon(44.5, 15.5, polygon) {
		t.Fatal("expected interior point to resolve")
	}
	if !pointInPolygon(44.0, 15.5, polygon) {
		t.Fatal("expected boundary point to resolve")
	}
	if pointInPolygon(46.0, 15.5, polygon) {
		t.Fatal("expected outside point to be rejected")
	}
}

func TestValidPolygonRejectsMalformedCoordinates(t *testing.T) {
	if validPolygon([][]float64{{44, 15}, {45, 15}}) {
		t.Fatal("expected polygon with fewer than three points to fail")
	}
	if validPolygon([][]float64{{44, 15}, {45, 15}, {181, 16}}) {
		t.Fatal("expected invalid longitude to fail")
	}
	if validPolygon([][]float64{{44, 15}, {45, 15}, {45}}) {
		t.Fatal("expected malformed point to fail")
	}
}

func TestNormalizePolygonRingAcceptsTriangleAndCanonicalizesClosure(t *testing.T) {
	triangle := [][]float64{{44, 15}, {45, 15}, {45, 16}}
	normalized, valid := normalizePolygonRing(triangle)
	if !valid || len(normalized) != 3 {
		t.Fatalf("triangle normalization = (%+v, %t), want three valid vertices", normalized, valid)
	}

	closed := append(triangle, []float64{44, 15})
	normalized, valid = normalizePolygonRing(closed)
	if !valid || len(normalized) != 3 {
		t.Fatalf("closed ring normalization = (%+v, %t), want canonical unclosed triangle", normalized, valid)
	}
	if got := closePolygonRing(normalized); len(got) != 4 || !samePoint(got[0], got[len(got)-1]) {
		t.Fatalf("PostGIS ring = %+v, want explicit closing vertex", got)
	}
}

func TestServiceAreaCodePatternIsBounded(t *testing.T) {
	valid := []string{"old-city", "sanaa_01", "a1"}
	for _, code := range valid {
		if !serviceAreaCodePattern.MatchString(code) {
			t.Fatalf("expected %q to be valid", code)
		}
	}
	invalid := []string{"A", "UPPER", "space code", "-prefix"}
	for _, code := range invalid {
		if serviceAreaCodePattern.MatchString(code) {
			t.Fatalf("expected %q to be invalid", code)
		}
	}
}
