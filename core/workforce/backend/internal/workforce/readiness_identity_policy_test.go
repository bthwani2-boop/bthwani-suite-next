package workforce

import "testing"

func TestIdentityReadinessBlockerRepresentsLifecycleOnly(t *testing.T) {
	if reason, blocked := identityReadinessBlocker(true); blocked {
		t.Fatalf("active Identity actor must not be blocked, got %s", reason)
	}

	reason, blocked := identityReadinessBlocker(false)
	if !blocked || reason != BlockerIdentitySuspended {
		t.Fatalf("inactive lifecycle must map to IDENTITY_SUSPENDED, got blocked=%v reason=%s", blocked, reason)
	}
}
