package identity

import (
	"testing"
	"time"
)

func TestTokenHashDoesNotExposeToken(t *testing.T) {
	token := "secret-access-token"
	hash := tokenHash(token)
	if hash == token || len(hash) != 64 {
		t.Fatalf("unexpected token hash: %q", hash)
	}
	if hash != tokenHash(token) {
		t.Fatal("token hashing must be deterministic")
	}
}

func TestActorIdentityDerivesSurfaceAndServiceAccess(t *testing.T) {
	expiresAt := time.Now().Add(time.Minute)
	resolved := toIdentity(Actor{
		ID:       "partner-1",
		TenantID: "tenant-1",
		Roles:    []string{"partner"},
		Permissions: []Permission{
			{Service: "dsh", Surface: "app-partner", Action: "store:write", Scope: "own"},
		},
	}, "session-1", expiresAt)

	if !resolved.SurfaceAccess["app-partner"] || !resolved.ServiceAccess["dsh"] {
		t.Fatalf("derived access is incomplete: %#v", resolved)
	}
	if resolved.AuthState != "authenticated" || resolved.Subject != "partner-1" {
		t.Fatalf("unexpected identity: %#v", resolved)
	}
}

func TestDevBypassIdentityMatchesLocalActorScopeIDs(t *testing.T) {
	now := time.Now()
	tests := []struct {
		role    string
		subject string
		surface string
		scope   string
	}{
		{role: "client", subject: "client-local-001", surface: "app-client", scope: "own"},
		{role: "partner", subject: "partner-local-001", surface: "app-partner", scope: "own"},
		{role: "field", subject: "field-local-001", surface: "app-field", scope: "assigned"},
		{role: "captain", subject: "captain-local-001", surface: "app-captain", scope: "assigned"},
		{role: "operator", subject: "operator-local-001", surface: "control-panel", scope: "all"},
	}

	for _, test := range tests {
		t.Run(test.role, func(t *testing.T) {
			resolved, err := resolveDevBypassIdentity("dev-bypass-"+test.role+"-123", now)
			if err != nil {
				t.Fatalf("resolve dev bypass: %v", err)
			}
			if resolved.Subject != test.subject || !resolved.SurfaceAccess[test.surface] {
				t.Fatalf("unexpected identity: %#v", resolved)
			}
			if len(resolved.Permissions) != 1 || resolved.Permissions[0].Scope != test.scope {
				t.Fatalf("unexpected permissions: %#v", resolved.Permissions)
			}
		})
	}
}

func TestDevBypassIdentityRejectsUnknownRole(t *testing.T) {
	if _, err := resolveDevBypassIdentity("dev-bypass-unknown-123", time.Now()); err != ErrUnauthenticated {
		t.Fatalf("expected unauthenticated, got %v", err)
	}
}
