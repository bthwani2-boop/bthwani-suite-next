package resilience

import (
	"errors"
	"testing"
	"time"
)

func TestCircuitBreakerOpensAndRecovers(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{
		FailureThreshold: 2,
		SuccessThreshold: 2,
		Timeout:          time.Millisecond,
	})
	failure := errors.New("upstream failed")

	if !errors.Is(cb.Execute(func() error { return failure }), failure) {
		t.Fatal("first failure must be returned")
	}
	if !errors.Is(cb.Execute(func() error { return failure }), failure) {
		t.Fatal("threshold failure must be returned")
	}
	if cb.State() != "OPEN" {
		t.Fatalf("state = %s, want OPEN", cb.State())
	}
	if !errors.Is(cb.Execute(func() error { return nil }), ErrCircuitOpen) {
		t.Fatal("open circuit must reject execution")
	}

	time.Sleep(2 * time.Millisecond)
	if err := cb.Execute(func() error { return nil }); err != nil {
		t.Fatalf("first half-open probe = %v", err)
	}
	if err := cb.Execute(func() error { return nil }); err != nil {
		t.Fatalf("second half-open probe = %v", err)
	}
	if cb.State() != "CLOSED" {
		t.Fatalf("state = %s, want CLOSED", cb.State())
	}
}
