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
