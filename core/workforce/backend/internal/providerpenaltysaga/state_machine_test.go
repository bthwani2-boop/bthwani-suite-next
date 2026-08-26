package providerpenaltysaga

import (
	"errors"
	"testing"

	"workforce-api/internal/wltclient"
)

func TestFinancialSagaFailureWindowsHaveExplicitTransitions(t *testing.T) {
	readbackStates := []string{"IN_FLIGHT", "REMOTE_OUTCOME_UNKNOWN", "RECONCILING"}
	for _, state := range readbackStates {
		if !needsAuthoritativeReadback(state) {
			t.Fatalf("%s must reconcile before another mutation", state)
		}
	}
	for _, state := range []string{"READY", "RETRY_SCHEDULED", "REMOTE_CONFIRMED", "COMPLETED", "PERMANENTLY_REJECTED"} {
		if needsAuthoritativeReadback(state) {
			t.Fatalf("%s was incorrectly classified as an unknown remote outcome", state)
		}
	}

	if parentDisposition("REMOTE_OUTCOME_UNKNOWN") != "wait" || parentDisposition("IN_FLIGHT") != "wait" {
		t.Fatal("reverse requested during an unknown/in-flight post must wait for authoritative post reconciliation")
	}
	if parentDisposition("COMPLETED") != "proceed" {
		t.Fatal("a reconciled completed post must release its reverse command")
	}
	if parentDisposition("PERMANENTLY_REJECTED") != "project_absent" {
		t.Fatal("a proven absent post must complete reversal as an explicit no-financial-effect projection")
	}
}

func TestMandatoryRemoteFailureWindowsAreGoverned(t *testing.T) {
	for _, tc := range []struct {
		window string
		err    error
		want   string
	}{
		{window: "B response lost after WLT commit", err: wltclient.ErrOutcomeUnknown, want: "reconcile"},
		{window: "D request timeout with unknown result", err: wltclient.ErrOutcomeUnknown, want: "reconcile"},
		{window: "J governed retryable 5xx", err: wltclient.ErrRetryable, want: "retry"},
		{window: "K governed permanent 4xx", err: wltclient.ErrPermanent, want: "reject"},
	} {
		t.Run(tc.window, func(t *testing.T) {
			if got := mutationFailureDisposition(tc.err); got != tc.want {
				t.Fatalf("got %s want %s", got, tc.want)
			}
		})
	}
	if got := mutationFailureDisposition(errors.New("unclassified failure")); got != "reject" {
		t.Fatalf("unclassified failures must fail closed, got %s", got)
	}
}

func TestFinancialSagaProjectionFencesStaleVersions(t *testing.T) {
	post := command{Operation: "post", SourceVersion: 7}
	if !projectionVersionAllowed(post, 7) || projectionVersionAllowed(post, 8) {
		t.Fatal("post projection did not enforce its exact incident source version")
	}
	reverseAfterPost := command{Operation: "reverse", SourceVersion: 7, ParentCommandID: "post-command"}
	if !projectionVersionAllowed(reverseAfterPost, 7) || !projectionVersionAllowed(reverseAfterPost, 8) || projectionVersionAllowed(reverseAfterPost, 9) {
		t.Fatal("reverse projection did not allow only its own version or the single parent-post increment")
	}
}

func TestFinancialSagaOperatorContextBindingFailsClosed(t *testing.T) {
	valid := command{OperatorContextID: "context-a", IncidentOperatorContextID: "context-a", ActorOperatorContextID: "context-a"}
	if !operatorContextValid(valid) {
		t.Fatal("matching durable OperatorContext binding was rejected")
	}
	for _, item := range []command{
		{},
		{OperatorContextID: "context-a", IncidentOperatorContextID: "context-b", ActorOperatorContextID: "context-a"},
		{OperatorContextID: "context-a", IncidentOperatorContextID: "context-a", ActorOperatorContextID: "context-b"},
	} {
		if operatorContextValid(item) {
			t.Fatalf("stale or invalid OperatorContext was accepted: %+v", item)
		}
	}
}

func TestFailureWindowsAToQHaveExplicitGovernedTransitions(t *testing.T) {
	tests := []struct {
		name   string
		assert func(*testing.T)
	}{
		{"A intent committed then crash before call", func(t *testing.T) {
			if needsAuthoritativeReadback("READY") {
				t.Fatal("a never-dispatched READY command must remain a fresh, durable mutation candidate")
			}
		}},
		{"B response lost after WLT commit", func(t *testing.T) {
			if mutationFailureDisposition(wltclient.ErrOutcomeUnknown) != "reconcile" || !needsAuthoritativeReadback("REMOTE_OUTCOME_UNKNOWN") {
				t.Fatal("lost responses must enter authoritative reconciliation")
			}
		}},
		{"C WLT success then Workforce commit failure", func(t *testing.T) {
			if needsAuthoritativeReadback("REMOTE_CONFIRMED") {
				t.Fatal("persisted remote proof must retry local projection without another mutation")
			}
		}},
		{"D request timeout with unknown WLT result", func(t *testing.T) {
			if mutationFailureDisposition(wltclient.ErrOutcomeUnknown) != "reconcile" {
				t.Fatal("post-dispatch timeout must not be treated as absent")
			}
		}},
		{"E client repeats same transition", func(t *testing.T) {
			if needsAuthoritativeReadback("COMPLETED") {
				t.Fatal("a terminal command replay must return its durable result")
			}
		}},
		{"F concurrent operations fence incident version", func(t *testing.T) {
			if projectionVersionAllowed(command{Operation: "post", SourceVersion: 4}, 5) {
				t.Fatal("a competing incident version must fence the stale post")
			}
		}},
		{"G two workers claim one intent", func(t *testing.T) {
			if !errors.Is(requireFencedUpdate(false, nil), errLeaseLost) {
				t.Fatal("a second worker must lose the DB lease fence")
			}
		}},
		{"H lease expires during remote call", func(t *testing.T) {
			if !errors.Is(requireFencedUpdate(false, nil), errLeaseLost) || !needsAuthoritativeReadback("IN_FLIGHT") {
				t.Fatal("an expired in-flight lease must reject stale acknowledgement and force readback")
			}
		}},
		{"I restart after remote success before projection", func(t *testing.T) {
			if needsAuthoritativeReadback("REMOTE_CONFIRMED") {
				t.Fatal("restart must project persisted proof, not call WLT again")
			}
		}},
		{"J WLT retryable 5xx", func(t *testing.T) {
			if mutationFailureDisposition(wltclient.ErrRetryable) != "retry" {
				t.Fatal("explicit retryable failure must use governed backoff")
			}
		}},
		{"K WLT permanent governed 4xx", func(t *testing.T) {
			if mutationFailureDisposition(wltclient.ErrPermanent) != "reject" {
				t.Fatal("governed permanent failure must terminate")
			}
		}},
		{"L long WLT outage", func(t *testing.T) {
			if backoff(100) != backoff(10) || backoff(10) <= 0 {
				t.Fatal("long outages must retain a durable capped retry schedule")
			}
		}},
		{"M reversal requested while post unknown", func(t *testing.T) {
			if parentDisposition("REMOTE_OUTCOME_UNKNOWN") != "wait" {
				t.Fatal("reverse must wait for authoritative post reconciliation")
			}
		}},
		{"N remote reversal then local commit failure", func(t *testing.T) {
			if needsAuthoritativeReadback("REMOTE_CONFIRMED") {
				t.Fatal("confirmed reversal must retry only its local projection")
			}
		}},
		{"O duplicate reversal after response loss", func(t *testing.T) {
			item := command{Operation: "reverse", IncidentID: "incident", ProviderActorID: "provider", ProviderActorType: "captain", IdempotencyKey: "reverse-key"}
			remote := wltclient.SagaProviderPenalty{ID: "penalty", IncidentID: "incident", ProviderActorID: "provider", ProviderActorType: "captain", Status: "reversed", LedgerTransactionID: "ledger", ReversalIdempotencyKey: "reverse-key"}
			if !validRemote(item, remote) {
				t.Fatal("exact reversal readback must recover the original command identity")
			}
			remote.ReversalIdempotencyKey = "different-key"
			if validRemote(item, remote) {
				t.Fatal("a different reversal identity must never satisfy readback")
			}
		}},
		{"P stale incident version attempts newer financial state", func(t *testing.T) {
			if projectionVersionAllowed(command{Operation: "reverse", SourceVersion: 8, ParentCommandID: "parent"}, 10) {
				t.Fatal("stale reversal must not overwrite a newer incident state")
			}
		}},
		{"Q OperatorContext changes during recovery", func(t *testing.T) {
			if operatorContextValid(command{OperatorContextID: "a", IncidentOperatorContextID: "b", ActorOperatorContextID: "a"}) {
				t.Fatal("changed incident ownership must fail closed")
			}
		}},
	}
	for _, test := range tests {
		t.Run(test.name, test.assert)
	}
}
