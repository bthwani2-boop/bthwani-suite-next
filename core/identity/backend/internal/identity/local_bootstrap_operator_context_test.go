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

func TestMergeRequiredPermissionsAddsPartnerBundleWithoutDuplicates(t *testing.T) {
	existing := []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "store:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"},
	}

	merged := mergeRequiredPermissions(existing, localOperatorPartnerPermissions)
	for _, required := range localOperatorPartnerPermissions {
		count := 0
		for _, permission := range merged {
			if permission == required {
				count++
			}
		}
		if count != 1 {
			t.Fatalf("required permission %+v must exist exactly once; count=%d", required, count)
		}
	}

	mergedAgain := mergeRequiredPermissions(merged, localOperatorPartnerPermissions)
	if len(mergedAgain) != len(merged) {
		t.Fatalf("permission reconciliation must be idempotent: first=%d second=%d", len(merged), len(mergedAgain))
	}
}
