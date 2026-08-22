package workforce

import "testing"

func TestIdentityCurrentProviderReadinessBlockerRepresentsLifecycleOnly(t *testing.T) {
	if reason, blocked := identityCurrentProviderReadinessBlocker(true); blocked {
		t.Fatalf("active Identity actor must not be blocked, got %s", reason)
	}

	reason, blocked := identityCurrentProviderReadinessBlocker(false)
	if !blocked || reason != CurrentProviderBlockerIdentitySuspended {
		t.Fatalf("inactive lifecycle must map to IDENTITY_SUSPENDED, got blocked=%v reason=%s", blocked, reason)
	}
}
