package homediscovery

import "testing"

func TestDefaultFilters(t *testing.T) {
	filters := DefaultFilters()
	if len(filters) != 5 {
		t.Fatalf("expected 5 filters, got %d", len(filters))
	}
	if filters[0].Kind != "all" {
		t.Errorf("first filter should be 'all', got %s", filters[0].Kind)
	}
	if !filters[0].IsActive {
		t.Error("first filter 'all' should be active by default")
	}
	kinds := map[string]bool{}
	for _, f := range filters {
		kinds[f.Kind] = true
	}
	for _, expected := range []string{"all", "favorites", "nearest", "new", "offers"} {
		if !kinds[expected] {
			t.Errorf("missing filter kind: %s", expected)
		}
	}
}
