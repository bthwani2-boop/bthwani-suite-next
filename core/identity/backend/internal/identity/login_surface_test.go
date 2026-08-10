package identity

import "testing"

func TestResolvePasswordLoginSurface(t *testing.T) {
	tests := []struct {
		name    string
		actor   Actor
		want    string
		wantErr bool
	}{
		{
			name: "client binds to app-client",
			actor: Actor{
				Roles: []string{"client"},
				Permissions: []Permission{
					{Service: "dsh", Surface: "app-client", Action: "read", Scope: "own"},
				},
			},
			want: "app-client",
		},
		{
			name: "partner binds to app-partner",
			actor: Actor{
				Roles: []string{"partner"},
				Permissions: []Permission{
					{Service: "dsh", Surface: "app-partner", Action: "read", Scope: "own"},
				},
			},
			want: "app-partner",
		},
		{
			name: "operator binds to control-panel",
			actor: Actor{
				Roles: []string{"operator"},
				Permissions: []Permission{
					{Service: "dsh", Surface: "control-panel", Action: "manage", Scope: "all"},
				},
			},
			want: "control-panel",
		},
		{
			name: "ambiguous multi-surface actor fails closed",
			actor: Actor{
				Roles: []string{"client", "operator"},
				Permissions: []Permission{
					{Service: "dsh", Surface: "app-client", Action: "read", Scope: "own"},
					{Service: "dsh", Surface: "control-panel", Action: "manage", Scope: "all"},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolvePasswordLoginSurface(tt.actor)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got surface %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("surface = %q, want %q", got, tt.want)
			}
		})
	}
}
