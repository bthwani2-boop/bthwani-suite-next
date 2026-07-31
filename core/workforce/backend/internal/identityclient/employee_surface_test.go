package identityclient

import "testing"

func TestCanonicalActivationSurfaceForEmployee(t *testing.T) {
	for _, supplied := range []string{"", "webapp", "control-panel", "app-client"} {
		if got := canonicalActivationSurface("employee", supplied); got != "control-panel" {
			t.Fatalf("canonicalActivationSurface(employee,%q)=%q want control-panel", supplied, got)
		}
	}
}

func TestCanonicalActivationSurfacePreservesProviderSurface(t *testing.T) {
	if got := canonicalActivationSurface("captain", "app-captain"); got != "app-captain" {
		t.Fatalf("canonicalActivationSurface(captain,app-captain)=%q", got)
	}
}
