package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

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

func TestResolveRequiresTrustedOperatorContext(t *testing.T) {
	tests := []struct {
		name            string
		operatorContext string
		wantErr         error
		wantContext     string
	}{
		{name: "missing context", operatorContext: "", wantErr: ErrUnauthenticated},
		{name: "whitespace context", operatorContext: "   ", wantErr: ErrUnauthenticated},
		{name: "valid context is normalized", operatorContext: " context-main ", wantContext: "context-main"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/auth/session" {
					t.Fatalf("unexpected path: %s", r.URL.Path)
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(Identity{
					Subject:           "actor-1",
					OperatorContextID: test.operatorContext,
					AuthState:         "authenticated",
				})
			}))
			defer server.Close()

			identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer session-token")
			if test.wantErr != nil {
				if !errors.Is(err, test.wantErr) {
					t.Fatalf("Resolve() error = %v, want %v", err, test.wantErr)
				}
				if identity.Subject != "" || identity.OperatorContextID != "" || identity.AuthState != "" {
					t.Fatalf("Resolve() returned identity on rejection: %+v", identity)
				}
				return
			}
			if err != nil {
				t.Fatalf("Resolve() error = %v", err)
			}
			if identity.OperatorContextID != test.wantContext {
				t.Fatalf("operator context = %q, want %q", identity.OperatorContextID, test.wantContext)
			}
		})
	}
}
