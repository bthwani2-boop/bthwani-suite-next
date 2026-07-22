package providers

import (
	"math"
	"testing"
)

func TestValidRouteCoordinate(t *testing.T) {
	tests := []struct {
		name      string
		latitude  float64
		longitude float64
		want      bool
	}{
		{name: "sanaa", latitude: 15.3694, longitude: 44.1910, want: true},
		{name: "minimum", latitude: -90, longitude: -180, want: true},
		{name: "maximum", latitude: 90, longitude: 180, want: true},
		{name: "latitude overflow", latitude: 90.1, longitude: 44, want: false},
		{name: "longitude overflow", latitude: 15, longitude: 180.1, want: false},
		{name: "nan", latitude: math.NaN(), longitude: 44, want: false},
		{name: "infinite", latitude: 15, longitude: math.Inf(1), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validRouteCoordinate(tt.latitude, tt.longitude); got != tt.want {
				t.Fatalf("validRouteCoordinate(%v, %v) = %v, want %v", tt.latitude, tt.longitude, got, tt.want)
			}
		})
	}
}
