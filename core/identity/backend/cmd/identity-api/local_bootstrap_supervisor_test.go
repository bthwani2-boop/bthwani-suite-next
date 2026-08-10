package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

// collectOutcomes runs the supervisor until it has reported the requested number
// of passes, then cancels it and returns what it reported.
func collectOutcomes(
	t *testing.T,
	wanted int,
	converged func(context.Context) (bool, error),
	reconcile func(context.Context) error,
) []localBootstrapOutcome {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var mu sync.Mutex
	outcomes := make([]localBootstrapOutcome, 0, wanted)
	done := make(chan struct{})

	go superviseLocalBootstrap(ctx, time.Millisecond, converged, reconcile, func(outcome localBootstrapOutcome) {
		mu.Lock()
		defer mu.Unlock()
		if len(outcomes) < wanted {
			outcomes = append(outcomes, outcome)
			if len(outcomes) == wanted {
				close(done)
			}
		}
	})

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("supervisor did not report the expected number of passes")
	}
	cancel()

	mu.Lock()
	defer mu.Unlock()
	return append([]localBootstrapOutcome(nil), outcomes...)
}

func TestSupervisorLeavesConvergedBootstrapUntouched(t *testing.T) {
	reconciled := 0
	outcomes := collectOutcomes(t, 3,
		func(context.Context) (bool, error) { return true, nil },
		func(context.Context) error { reconciled++; return nil },
	)

	if reconciled != 0 {
		t.Fatalf("a converged runtime must never be re-bootstrapped, ran %d times", reconciled)
	}
	for index, outcome := range outcomes {
		if outcome.Repaired || outcome.Err != nil {
			t.Fatalf("pass %d reported work on a healthy runtime: %+v", index, outcome)
		}
	}
}

func TestSupervisorRepairsBootstrapWhenActorsDisappear(t *testing.T) {
	var mu sync.Mutex
	actorsPresent := false

	outcomes := collectOutcomes(t, 2,
		func(context.Context) (bool, error) {
			mu.Lock()
			defer mu.Unlock()
			return actorsPresent, nil
		},
		func(context.Context) error {
			mu.Lock()
			defer mu.Unlock()
			actorsPresent = true
			return nil
		},
	)

	if !outcomes[0].Repaired || outcomes[0].Err != nil {
		t.Fatalf("first pass must repair a runtime with no canonical actors: %+v", outcomes[0])
	}
	if outcomes[1].Repaired || outcomes[1].Err != nil {
		t.Fatalf("second pass must be a no-op once convergence is restored: %+v", outcomes[1])
	}
}

func TestSupervisorSurfacesConvergenceFailuresAndKeepsRunning(t *testing.T) {
	convergenceFailure := errors.New("database unreachable")
	reconciled := 0

	outcomes := collectOutcomes(t, 2,
		func(context.Context) (bool, error) { return false, convergenceFailure },
		func(context.Context) error { reconciled++; return nil },
	)

	if reconciled != 0 {
		t.Fatal("an unreadable database must never trigger a blind re-bootstrap")
	}
	for index, outcome := range outcomes {
		if !errors.Is(outcome.Err, convergenceFailure) {
			t.Fatalf("pass %d must surface the convergence failure, got %+v", index, outcome)
		}
	}
}

func TestSupervisorReportsReconciliationFailure(t *testing.T) {
	reconcileFailure := errors.New("bootstrap upsert rejected")

	outcomes := collectOutcomes(t, 1,
		func(context.Context) (bool, error) { return false, nil },
		func(context.Context) error { return reconcileFailure },
	)

	if outcomes[0].Repaired {
		t.Fatal("a failed reconciliation must never be reported as repaired")
	}
	if !errors.Is(outcomes[0].Err, reconcileFailure) {
		t.Fatalf("unexpected outcome: %+v", outcomes[0])
	}
}

func TestSupervisorStopsWhenTheProcessShutsDown(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})

	go func() {
		superviseLocalBootstrap(ctx, time.Millisecond,
			func(context.Context) (bool, error) { return true, nil },
			func(context.Context) error { return nil },
			func(localBootstrapOutcome) {},
		)
		close(stopped)
	}()

	cancel()
	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("supervisor must stop when the process context is cancelled")
	}
}

func TestOutcomeReportingIsSilentUntilConvergenceChanges(t *testing.T) {
	// The readiness probe already logs every few seconds, so a steady state must
	// stay quiet; only transitions are worth a line.
	var lines []string
	report := newLocalBootstrapReporter(func(format string, args ...any) {
		lines = append(lines, fmt.Sprintf(format, args...))
	})

	for pass := 0; pass < 3; pass++ {
		report(localBootstrapOutcome{})
	}
	if len(lines) != 0 {
		t.Fatalf("a healthy runtime must log nothing, got %#v", lines)
	}

	failure := errors.New("database unreachable")
	report(localBootstrapOutcome{Err: failure})
	report(localBootstrapOutcome{Err: failure})
	if len(lines) != 1 {
		t.Fatalf("a sustained failure must log once, got %#v", lines)
	}
	if !strings.Contains(lines[0], "lost convergence") {
		t.Fatalf("unexpected failure line: %q", lines[0])
	}

	report(localBootstrapOutcome{Repaired: true})
	if len(lines) != 2 || !strings.Contains(lines[1], "re-converged") {
		t.Fatalf("recovery must be announced exactly once, got %#v", lines)
	}

	report(localBootstrapOutcome{})
	if len(lines) != 2 {
		t.Fatalf("returning to steady state must stay silent, got %#v", lines)
	}
}
