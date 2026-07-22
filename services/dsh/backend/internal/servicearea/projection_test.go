package servicearea

import "testing"

func TestProjectComputesGovernedGeometryMetadata(t *testing.T) {
	projection := Project(Geofence{Polygon: [][]float64{
		{44.10, 15.30},
		{44.25, 15.32},
		{44.20, 15.48},
		{44.08, 15.41},
	}})
	if projection.PointCount != 4 {
		t.Fatalf("PointCount = %d, want 4", projection.PointCount)
	}
	if projection.Bounds.MinLongitude != 44.08 || projection.Bounds.MaxLongitude != 44.25 || projection.Bounds.MinLatitude != 15.30 || projection.Bounds.MaxLatitude != 15.48 {
		t.Fatalf("unexpected bounds: %+v", projection.Bounds)
	}
}
