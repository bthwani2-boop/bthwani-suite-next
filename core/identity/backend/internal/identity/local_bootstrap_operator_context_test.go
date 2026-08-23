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
		{Service: "dsh", Surface: "control-panel", Action: "finance.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_financial_eligibility.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_financial_eligibility.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "marketing.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "marketing.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.fulfillment_sla.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.fulfillment_sla.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_capacity.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_capacity.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.operational_policy.audit.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.operational_policy.rollback", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "finance.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.review", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.marketing_review", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.adopt", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.publish", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.media.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.assortment.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.assortment.manage", Scope: "all"},
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
		"platform:flags:manage":       {},
		"platform:services:manage":    {},
		"platform:health:acknowledge": {},
		"platform:audit:export":       {},
		"platform:wlt-policy:read":    {},
		"dsh.partners.read":           {},
		"dsh.partner-scopes.read":     {},
	}
	for _, permission := range permissions {
		if _, forbidden := forbiddenActions[permission.Action]; forbidden {
			t.Fatalf("forbidden or non-consumed local operator permission present: %s", permission.Action)
		}
	}
	legacyPlatformRead := "platform" + ".read"
	for _, permission := range permissions {
		if permission.Action == legacyPlatformRead {
			t.Fatalf("legacy platform read permission remains in local operator authority: %#v", permission)
		}
	}
}
