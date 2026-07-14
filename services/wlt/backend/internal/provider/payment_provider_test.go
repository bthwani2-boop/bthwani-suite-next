package provider

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPaymentProviderFactory(t *testing.T) {
	t.Run("Mock Mode factory", func(t *testing.T) {
		t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
		t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
		provider, err := NewDefaultPaymentProvider()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if _, ok := provider.(*Client); !ok {
			t.Fatal("expected mock provider to be of type *Client")
		}
	})

	t.Run("Production Mode factory", func(t *testing.T) {
		t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
		t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://prod.example")
		t.Setenv("WLT_ALLOW_PRODUCTION_PROVIDER", "true")
		provider, err := NewDefaultPaymentProvider()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if _, ok := provider.(*ProductionPaymentAdapter); !ok {
			t.Fatal("expected production provider to be of type *ProductionPaymentAdapter")
		}
	})
}

func TestProductionPaymentAdapterSimulations(t *testing.T) {
	adapter := NewProductionPaymentAdapter()
	ctx := context.Background()
	meta := NewRequestMeta("test")

	t.Run("Authorize path", func(t *testing.T) {
		res, err := adapter.Post(ctx, "/financial/card/authorize", nil, meta)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Status != "authorized" {
			t.Errorf("expected status 'authorized', got %s", res.Status)
		}
		if res.ProviderReference == "" {
			t.Error("expected provider reference to be generated")
		}
	})

	t.Run("Capture path", func(t *testing.T) {
		res, err := adapter.Post(ctx, "/financial/card/capture", nil, meta)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Status != "captured" {
			t.Errorf("expected status 'captured', got %s", res.Status)
		}
	})

	t.Run("Refund path", func(t *testing.T) {
		res, err := adapter.Post(ctx, "/financial/card/refund", nil, meta)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Status != "refunded" {
			t.Errorf("expected status 'refunded', got %s", res.Status)
		}
	})
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
