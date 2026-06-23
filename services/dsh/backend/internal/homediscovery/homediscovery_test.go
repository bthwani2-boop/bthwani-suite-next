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

func TestValidateAdminInputByContentKind(t *testing.T) {
	valid := AdminContentInput{
		Title: "عرض صالح", ImageURL: "https://example.test/image.jpg",
		ActionType: "none", SortOrder: 1, IsActive: true,
	}
	for _, kind := range []string{"banners", "promos"} {
		if err := validateAdminInput(kind, valid); err != nil {
			t.Fatalf("%s should be valid: %v", kind, err)
		}
	}
	category := valid
	category.ImageURL = ""
	if err := validateAdminInput("categories", category); err != nil {
		t.Fatalf("category icon must be optional: %v", err)
	}
	if err := validateAdminInput("unknown", valid); err == nil {
		t.Fatal("unknown content kind must fail")
	}
}
