package http

import "testing"

func TestDshActorSurface(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		"operator": "control-panel",
		"client":   "app-client",
		"partner":  "app-partner",
		"field":    "app-field",
		"captain":  "app-captain",
		"system":   "system",
	}

	for role, expected := range cases {
		role := role
		expected := expected
		t.Run(role, func(t *testing.T) {
			t.Parallel()
			if actual := dshActorSurface(role); actual != expected {
				t.Fatalf("dshActorSurface(%q) = %q, want %q", role, actual, expected)
			}
		})
	}
}

func TestDshActorSurfaceUnknownRoleIsSystem(t *testing.T) {
	t.Parallel()

	if actual := dshActorSurface("unknown"); actual != "system" {
		t.Fatalf("dshActorSurface(unknown) = %q, want system", actual)
	}
}
