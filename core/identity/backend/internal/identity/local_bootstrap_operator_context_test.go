package identity

import (
	"context"
	"testing"
)

func TestLocalBootstrapRequiresExplicitOperatorContextBeforeDatabaseAccess(t *testing.T) {
	input := LocalBootstrap{
		Enabled:  true,
		Password: "local-password",
	}

	t.Run("base actors", func(t *testing.T) {
		repo := &Repository{}
		if err := repo.BootstrapLocalActors(context.Background(), input); err == nil {
			t.Fatal("local actor bootstrap must reject a missing OperatorContext before database access")
		}
	})

	t.Run("platform actors", func(t *testing.T) {
		repo := &Repository{}
		if err := repo.BootstrapLocalPlatformActors(context.Background(), input); err == nil {
			t.Fatal("platform actor bootstrap must reject a missing OperatorContext before database access")
		}
	})
}

func TestDisabledLocalBootstrapDoesNotRequireOperatorContext(t *testing.T) {
	repo := &Repository{}
	input := LocalBootstrap{Enabled: false}

	if err := repo.BootstrapLocalActors(context.Background(), input); err != nil {
		t.Fatalf("disabled local actor bootstrap must be a no-op: %v", err)
	}
	if err := repo.BootstrapLocalPlatformActors(context.Background(), input); err != nil {
		t.Fatalf("disabled platform bootstrap must be a no-op: %v", err)
	}
}

func TestLocalOperatorDevelopmentPermissionsAreCanonical(t *testing.T) {
	permissions := localOperatorDevelopmentPermissions()
	seen := map[string]struct{}{}
	for _, permission := range permissions {
		key := permission.Service + "|" + permission.Surface + "|" + permission.Action + "|" + permission.Scope
		if _, duplicate := seen[key]; duplicate {
			t.Fatalf("duplicate local operator permission: %s", key)
		}
		seen[key] = struct{}{}
	}

	required := []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.manage", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
	}
	for _, permission := range required {
		key := permission.Service + "|" + permission.Surface + "|" + permission.Action + "|" + permission.Scope
		if _, ok := seen[key]; !ok {
			t.Fatalf("required local operator permission is missing: %s", key)
		}
	}

	forbiddenActions := map[string]struct{}{
		"platform:variables:approve":  {},
		"platform:variables:apply":    {},
		"platform:variables:rollback": {},
		"platform:rollouts:manage":    {},
		"dsh.partners.read":           {},
		"dsh.partner-scopes.read":     {},
	}
	for _, permission := range permissions {
		if _, forbidden := forbiddenActions[permission.Action]; forbidden {
			t.Fatalf("forbidden or non-consumed local operator permission present: %s", permission.Action)
		}
	}
}
