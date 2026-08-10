package identity

import (
	"context"
	"reflect"
	"testing"
)

func TestLocalBootstrapSecurityUsernamesAreExactPasswordActors(t *testing.T) {
	got := localBootstrapSecurityUsernames()
	want := []string{
		"operator",
		"bthwani",
		"client",
		"platform-approver",
		"platform-applier",
		"platform-rollout-manager",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected local bootstrap security usernames: got %#v want %#v", got, want)
	}
	for _, forbidden := range []string{"field", "captain", "local-field-001", "local-captain-001"} {
		for _, username := range got {
			if username == forbidden {
				t.Fatalf("Workforce-managed provider %q must never enter password bootstrap convergence", forbidden)
			}
		}
	}
}

func TestLocalBootstrapSecurityConvergenceDisabledNeverRequiresDatabase(t *testing.T) {
	var repo *Repository
	if err := repo.ReconcileLocalBootstrapSecurityState(context.Background(), LocalBootstrap{Enabled: false}); err != nil {
		t.Fatalf("disabled local bootstrap must be a no-op: %v", err)
	}
}
