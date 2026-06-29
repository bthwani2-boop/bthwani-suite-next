package payment

import (
	"context"
	"errors"
	"testing"

	"wlt-api/internal/provider"
)

type recordingProvider struct {
	path string
	body map[string]any
	meta provider.RequestMeta
	res  provider.ProviderResult
	err  error
}

func (p *recordingProvider) Post(ctx context.Context, path string, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.path = path
	p.meta = meta
	if typed, ok := body.(map[string]any); ok {
		p.body = typed
	}
	return p.res, p.err
}

func TestAuthorizeProviderCallsFinancialProvider(t *testing.T) {
	client := &recordingProvider{
		res: provider.ProviderResult{ProviderReference: "card-auth-001", Status: "authorized"},
	}
	session := &PaymentSession{
		ID:               "wps_1",
		CheckoutIntentID: "checkout_1",
		ClientID:         "client_1",
		StoreID:          "store_1",
		PaymentMethod:    "official_wallet",
	}

	result, err := authorizeProvider(context.Background(), client, session, 1000, "SAR", provider.RequestMeta{
		CorrelationID:  "corr-1",
		IdempotencyKey: "idem-1",
	})
	if err != nil {
		t.Fatalf("authorizeProvider returned error: %v", err)
	}
	if client.path != "/financial/card/authorize" {
		t.Fatalf("unexpected provider path: %s", client.path)
	}
	if client.meta.CorrelationID != "corr-1" || client.meta.IdempotencyKey != "idem-1" {
		t.Fatalf("provider metadata was not forwarded")
	}
	if client.body["paymentSessionId"] != "wps_1" || client.body["amountMinorUnits"] != int64(1000) {
		t.Fatalf("provider request body missing WLT payment data: %#v", client.body)
	}
	if result.ProviderReference != "card-auth-001" {
		t.Fatalf("provider reference was not returned")
	}
}

func TestCaptureProviderCallsFinancialProvider(t *testing.T) {
	client := &recordingProvider{
		res: provider.ProviderResult{ProviderReference: "card-capture-001", Status: "captured"},
	}
	session := &PaymentSession{
		ID:                "wps_1",
		ProviderReference: "card-auth-001",
		AmountMinorUnits:  1000,
		Currency:          "SAR",
	}

	result, err := captureProvider(context.Background(), client, session, provider.RequestMeta{
		CorrelationID:  "corr-2",
		IdempotencyKey: "idem-2",
	})
	if err != nil {
		t.Fatalf("captureProvider returned error: %v", err)
	}
	if client.path != "/financial/card/capture" {
		t.Fatalf("unexpected provider path: %s", client.path)
	}
	if client.body["providerReference"] != "card-auth-001" {
		t.Fatalf("capture did not include authorize provider reference: %#v", client.body)
	}
	if result.ProviderReference != "card-capture-001" {
		t.Fatalf("capture provider reference was not returned")
	}
}

func TestProviderFailureMappingIsReturned(t *testing.T) {
	providerErr := provider.Error{Code: "CARD_DECLINED", StatusCode: 402, Message: "declined"}
	client := &recordingProvider{err: providerErr}
	session := &PaymentSession{ID: "wps_1"}

	_, err := authorizeProvider(context.Background(), client, session, 1000, "SAR", provider.RequestMeta{})
	if !errors.As(err, &providerErr) {
		t.Fatalf("expected provider error to be returned, got %v", err)
	}
}
