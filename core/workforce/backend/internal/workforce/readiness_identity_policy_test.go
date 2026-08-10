package workforce

import (
	"errors"
	"testing"
)

func TestIdentityReadinessBlockerDistinguishesDependencyFailureFromSuspension(t *testing.T) {
	if reason, blocked := identityReadinessBlocker(true, nil); blocked {
		t.Fatalf("active Identity actor must not be blocked, got %s", reason)
	}

	reason, blocked := identityReadinessBlocker(false, nil)
	if !blocked || reason != BlockerIdentitySuspended {
		t.Fatalf("inactive lifecycle must map to IDENTITY_SUSPENDED, got blocked=%v reason=%s", blocked, reason)
	}

	reason, blocked = identityReadinessBlocker(false, errors.New("identity unavailable"))
	if !blocked || reason != BlockerEligibilityUnavailable {
		t.Fatalf("Identity dependency failure must map to ELIGIBILITY_UNAVAILABLE, got blocked=%v reason=%s", blocked, reason)
	}
}
