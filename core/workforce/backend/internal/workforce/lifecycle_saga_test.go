package workforce

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"workforce-api/internal/identityclient"
)

func TestLifecycleIdempotencyKeyIsDeterministicAndScoped(t *testing.T) {
	a := lifecycleCommandIdempotencyKey("ctx-1", "actor-1", "suspend", 7)
	b := lifecycleCommandIdempotencyKey("ctx-1", "actor-1", "suspend", 7)
	if a != b {
		t.Fatalf("same intent must derive the same key: %q vs %q", a, b)
	}
	for _, variant := range []struct {
		ctx, actor, operation string
		version               int
	}{
		{"ctx-2", "actor-1", "suspend", 7},
		{"ctx-1", "actor-2", "suspend", 7},
		{"ctx-1", "actor-1", "reactivate", 7},
		{"ctx-1", "actor-1", "suspend", 8},
	} {
		if key := lifecycleCommandIdempotencyKey(variant.ctx, variant.actor, variant.operation, variant.version); key == a {
			t.Fatalf("distinct intent derived colliding key: %+v", variant)
		}
	}
}

func TestClassifyLifecycleError(t *testing.T) {
	cases := []struct {
		err        error
		class      lifecycleErrorClass
		wantCodeNE string
	}{
		{identityclient.ErrUnavailable, lifecycleTransient, "IDENTITY_UNAVAILABLE"},
		{identityclient.ErrRateLimited, lifecycleTransient, "IDENTITY_RATE_LIMITED"},
		{fmt.Errorf("wrapped: %w", identityclient.ErrUnavailable), lifecycleTransient, "IDENTITY_UNAVAILABLE"},
		{identityclient.ErrActorNotFound, lifecycleDefinitive, "IDENTITY_ACTOR_NOT_FOUND"},
		{identityclient.ErrActorStateConflict, lifecycleDefinitive, "IDENTITY_ACTOR_STATE_CONFLICT"},
		{errors.New("identity returned HTTP 400 (INVALID_REQUEST)"), lifecycleDefinitive, "IDENTITY_REJECTED"},
	}
	for _, tc := range cases {
		class, code := classifyLifecycleError(tc.err)
		if class != tc.class {
			t.Fatalf("classifyLifecycleError(%v) = %s, want %s", tc.err, class, tc.class)
		}
		if code != tc.wantCodeNE {
			t.Fatalf("classifyLifecycleError(%v) code = %s, want %s", tc.err, code, tc.wantCodeNE)
		}
	}
	if class, _ := classifyLifecycleError(nil); class != "" {
		t.Fatal("nil error must classify as empty")
	}
}

func TestLifecycleRetryDelayIsMonotonicAndCapped(t *testing.T) {
	previous := time.Duration(0)
	for attempt := 1; attempt <= 12; attempt++ {
		delay := lifecycleRetryDelay(attempt)
		if delay < previous {
			t.Fatalf("backoff must be monotonic: attempt %d delay %s < previous %s", attempt, delay, previous)
		}
		if delay > 10*time.Minute {
			t.Fatalf("backoff must be capped at 10m: attempt %d delay %s", attempt, delay)
		}
		previous = delay
	}
	if got := lifecycleRetryDelay(0); got != 15*time.Second {
		t.Fatalf("attempt < 1 clamps to base delay, got %s", got)
	}
	if got := lifecycleRetryDelay(lifecycleMaxAttempts + 3); got != 10*time.Minute {
		t.Fatalf("large attempt must hit the cap, got %s", got)
	}
}

func TestLifecycleAuditActionMaps(t *testing.T) {
	if lifecycleMutationAction("suspend") != "workforce.suspended" ||
		lifecycleMutationAction("reactivate") != "workforce.reactivated" {
		t.Fatal("mutation action map broken")
	}
	if lifecycleRevertAction("suspend") != "workforce.suspend_reverted" ||
		lifecycleRevertAction("reactivate") != "workforce.reactivate_reverted" {
		t.Fatal("revert action map broken")
	}
	if lifecycleConfirmAction("suspend") != "workforce.suspend_identity_confirmed" ||
		lifecycleConfirmAction("reactivate") != "workforce.reactivate_identity_confirmed" {
		t.Fatal("confirm action map broken")
	}
	if lifecycleOperationName("suspend") != "suspend_workforce_actor" ||
		lifecycleOperationName("reactivate") != "reactivate_workforce_actor" {
		t.Fatal("operation name map broken")
	}
}
