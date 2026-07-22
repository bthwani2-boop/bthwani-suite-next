package servicearea

import "testing"

func TestValidPolygonTopologyAcceptsSimplePolygon(t *testing.T) {
	polygon := [][]float64{{44.10, 15.30}, {44.30, 15.30}, {44.30, 15.50}, {44.10, 15.50}}
	if !validPolygonTopology(polygon) {
		t.Fatal("expected simple polygon to be valid")
	}
}

func TestValidPolygonTopologyRejectsSelfIntersection(t *testing.T) {
	polygon := [][]float64{{44.10, 15.30}, {44.30, 15.50}, {44.30, 15.30}, {44.10, 15.50}}
	if validPolygonTopology(polygon) {
		t.Fatal("expected bow-tie polygon to be rejected")
	}
}

func TestValidPolygonTopologyRejectsZeroAreaAndDuplicateEdges(t *testing.T) {
	for _, polygon := range [][][]float64{
		{{44.10, 15.30}, {44.20, 15.40}, {44.30, 15.50}},
		{{44.10, 15.30}, {44.10, 15.30}, {44.30, 15.50}, {44.10, 15.50}},
	} {
		if validPolygonTopology(polygon) {
			t.Fatalf("expected invalid topology to be rejected: %+v", polygon)
		}
	}
}
