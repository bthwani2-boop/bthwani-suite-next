package provider

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFinancialRailRouterFactory(t *testing.T) {
	t.Run("Mock Mode router", func(t *testing.T) {
		t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
		t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
		t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")
		router, err := NewFinancialRailRouter(nil, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if router == nil {
			t.Fatal("expected non-nil router")
		}
		var _ CashInRail = router
	})

	t.Run("Production Mode fails closed", func(t *testing.T) {
		t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
		t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://prod.example")
		t.Setenv("WLT_ALLOW_PRODUCTION_PROVIDER", "true")
		router, err := NewFinancialRailRouter(nil, "")
		if router != nil {
			t.Fatalf("expected no production router, got %T", router)
		}
		if !errors.Is(err, ErrProductionProviderUnavailable) {
			t.Fatalf("expected ErrProductionProviderUnavailable, got %v", err)
		}
	})
}

func TestProductionPaymentAdapterFailsClosed(t *testing.T) {
	adapter := NewProductionPaymentAdapter()
	ctx := context.Background()
	meta := NewRequestMeta("test")

	for _, path := range []string{
		"/financial/card/authorize",
		"/financial/card/capture",
		"/financial/card/refund",
	} {
		t.Run(path, func(t *testing.T) {
			res, err := adapter.Post(ctx, path, nil, meta)
			if !errors.Is(err, ErrProductionProviderUnavailable) {
				t.Fatalf("expected fail-closed production error, got result=%+v err=%v", res, err)
			}
			if res.Status != "" || res.ProviderReference != "" {
				t.Fatalf("production adapter must never synthesize a success: %+v", res)
			}
		})
	}

	res, err := adapter.Get(ctx, "/health", meta)
	if !errors.Is(err, ErrProductionProviderUnavailable) {
		t.Fatalf("expected production health/read to fail closed, got result=%+v err=%v", res, err)
	}
	if res.Status != "" || res.ProviderReference != "" {
		t.Fatalf("production health/read must not report synthetic health: %+v", res)
	}
}

func TestRequestMetaFromHTTP(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("X-Correlation-ID", "corr-123")
	req.Header.Set("Idempotency-Key", "idem-456")

	meta := RequestMetaFromHTTP(req, "test-prefix")
	if meta.CorrelationID != "corr-123" {
		t.Errorf("expected CorrelationID 'corr-123', got %s", meta.CorrelationID)
	}
	if meta.IdempotencyKey != "idem-456" {
		t.Errorf("expected IdempotencyKey 'idem-456', got %s", meta.IdempotencyKey)
	}
}
