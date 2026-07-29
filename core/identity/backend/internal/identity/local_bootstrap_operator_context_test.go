package identity

import (
	"context"
	"testing"
)

func TestLocalBootstrapRequiresExplicitTenantBeforeDatabaseAccess(t *testing.T) {
	input := LocalBootstrap{
		Enabled:  true,
		Password: "local-password",
	}

	t.Run("base actors", func(t *testing.T) {
		repo := &Repository{}
		if err := repo.BootstrapLocalActors(context.Background(), input); err == nil {
			t.Fatal("local actor bootstrap must reject a missing tenant before database access")
		}
	})

	t.Run("platform actors", func(t *testing.T) {
		repo := &Repository{}
		if err := repo.BootstrapLocalPlatformActors(context.Background(), input); err == nil {
			t.Fatal("platform actor bootstrap must reject a missing tenant before database access")
		}
	})
}

func TestDisabledLocalBootstrapDoesNotRequireTenant(t *testing.T) {
	repo := &Repository{}
	input := LocalBootstrap{Enabled: false}

	if err := repo.BootstrapLocalActors(context.Background(), input); err != nil {
		t.Fatalf("disabled local actor bootstrap must be a no-op: %v", err)
	}
	if err := repo.BootstrapLocalPlatformActors(context.Background(), input); err != nil {
		t.Fatalf("disabled platform bootstrap must be a no-op: %v", err)
	}
}
