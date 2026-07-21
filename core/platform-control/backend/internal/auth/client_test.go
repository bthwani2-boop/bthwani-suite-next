package auth

import "testing"

func TestIdentityHasSurfacePermission(t *testing.T) {
	identity := Identity{
		Permissions: []Permission{
			{Service: "dsh", Surface: "app-field", Action: "platform:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
			{Service: "core", Surface: "*", Action: "platform:audit:read", Scope: "*"},
		},
	}

	tests := []struct {
		name    string
		service string
		surface string
		action  string
		scope   string
		want    bool
	}{
		{
			name:    "rejects matching action from another surface",
			service: "dsh",
			surface: "control-panel",
			action:  "platform:read",
			scope:   "all",
			want:    false,
		},
		{
			name:    "accepts exact control panel permission",
			service: "dsh",
			surface: "control-panel",
			action:  "platform:health:read",
			scope:   "all",
			want:    true,
		},
		{
			name:    "accepts explicit wildcard surface and scope",
			service: "core",
			surface: "control-panel",
			action:  "platform:audit:read",
			scope:   "all",
			want:    true,
		},
		{
			name:    "rejects another action",
			service: "dsh",
			surface: "control-panel",
			action:  "platform:variables:apply",
			scope:   "all",
			want:    false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := identity.HasSurfacePermission(test.service, test.surface, test.action, test.scope)
			if got != test.want {
				t.Fatalf("HasSurfacePermission() = %v, want %v", got, test.want)
			}
		})
	}
}
