package payment

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"wlt-api/internal/provider"
)

// slowCountingProvider simulates a provider call slow enough that, without
// the claim/finalize fix, two concurrent requests on the same session could
// both pass the old unlocked status check before either write landed.
type slowCountingProvider struct {
	res   provider.ProviderResult
	delay time.Duration
	calls int32
}

func (p *slowCountingProvider) Authorize(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	atomic.AddInt32(&p.calls, 1)
	time.Sleep(p.delay)
	return p.res, nil
}

func (p *slowCountingProvider) Capture(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	atomic.AddInt32(&p.calls, 1)
	time.Sleep(p.delay)
	return p.res, nil
}

func (p *slowCountingProvider) Refund(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	atomic.AddInt32(&p.calls, 1)
	time.Sleep(p.delay)
	return p.res, nil
}

func (p *slowCountingProvider) Status(ctx context.Context, inquiry provider.StatusInquiry, meta provider.RequestMeta) (provider.ProviderResult, error) {
	atomic.AddInt32(&p.calls, 1)
	time.Sleep(p.delay)
	return p.res, nil
}

var _ provider.CashInRail = (*slowCountingProvider)(nil)

// TestCaptureSessionWithProvider_ConcurrentCalls_OnlyOneReachesProvider fires
// two concurrent CaptureSessionWithProvider calls against the same
// 'authorized' session and asserts the provider is only ever called once --
// proving claimSession's guarded claim (not the old unlocked
// read-then-write) is what prevents a double capture.
func TestCaptureSessionWithProvider_ConcurrentCalls_OnlyOneReachesProvider(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := context.Background()
	checkoutIntentID := fmt.Sprintf("test-checkout-concurrent-cap-%d", time.Now().UnixNano())
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "authorized", "card-auth-concurrent", 1000, false)

	client := &slowCountingProvider{
		res:   provider.ProviderResult{ProviderReference: "card-capture-concurrent", Status: "captured"},
		delay: 200 * time.Millisecond,
	}

	const attempts = 5
	var wg sync.WaitGroup
	results := make([]error, attempts)
	var successCount int32

	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := CaptureSessionWithProvider(ctx, db, client, sessionID, provider.RequestMeta{})
			results[idx] = err
			if err == nil {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}
	wg.Wait()

	if successCount != 1 {
		t.Fatalf("expected exactly 1 successful capture out of %d concurrent attempts, got %d (results: %v)", attempts, successCount, results)
	}
	if calls := atomic.LoadInt32(&client.calls); calls != 1 {
		t.Fatalf("expected the provider to be called exactly once despite %d concurrent capture attempts, got %d calls", attempts, calls)
	}

	var status string
	if err := db.QueryRowContext(ctx, "SELECT status FROM wlt_payment_sessions WHERE id = $1", sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query final status: %v", err)
	}
	if status != "captured" {
		t.Fatalf("expected final status 'captured', got %q", status)
	}
}
