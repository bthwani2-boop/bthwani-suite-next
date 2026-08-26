package payment

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"wlt-api/internal/provider"
)

type recordingProvider struct {
	authorizeBody map[string]any
	captureBody   map[string]any
	refundBody    map[string]any
	meta          provider.RequestMeta
	res           provider.ProviderResult
	err           error
}

func (p *recordingProvider) Authorize(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.meta = meta
	if typed, ok := body.(map[string]any); ok {
		p.authorizeBody = typed
	}
	return p.res, p.err
}

func (p *recordingProvider) Capture(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.meta = meta
	if typed, ok := body.(map[string]any); ok {
		p.captureBody = typed
	}
	return p.res, p.err
}

func (p *recordingProvider) Refund(ctx context.Context, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.meta = meta
	if typed, ok := body.(map[string]any); ok {
		p.refundBody = typed
	}
	return p.res, p.err
}

func (p *recordingProvider) Status(ctx context.Context, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.meta = meta
	return p.res, p.err
}

var _ provider.CashInRail = (*recordingProvider)(nil)

func TestAuthorizeProviderCallsFinancialProvider(t *testing.T) {
	client := &recordingProvider{
		res: provider.ProviderResult{ProviderReference: "card-auth-001", Status: "authorized"},
	}
	checkoutIntentID := "checkout_1"
	session := &PaymentSession{
		ID:               "wps_1",
		CheckoutIntentID: &checkoutIntentID,
		ClientID:         "client_1",
		StoreID:          "store_1",
		PaymentMethod:    "official_wallet",
	}

	result, err := authorizeProvider(context.Background(), client, session, 1000, "YER", provider.RequestMeta{
		CorrelationID:  "corr-1",
		IdempotencyKey: "idem-1",
	})
	if err != nil {
		t.Fatalf("authorizeProvider returned error: %v", err)
	}
	if client.authorizeBody["paymentSessionId"] != "wps_1" || client.authorizeBody["amountMinorUnits"] != int64(1000) {
		t.Fatalf("provider request body missing WLT payment data: %#v", client.authorizeBody)
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
		Currency:          "YER",
	}

	result, err := captureProvider(context.Background(), client, session, provider.RequestMeta{
		CorrelationID:  "corr-2",
		IdempotencyKey: "idem-2",
	})
	if err != nil {
		t.Fatalf("captureProvider returned error: %v", err)
	}
	if client.captureBody["providerReference"] != "card-auth-001" {
		t.Fatalf("capture did not include authorize provider reference: %#v", client.captureBody)
	}
	if result.ProviderReference != "card-capture-001" {
		t.Fatalf("capture provider reference was not returned")
	}
}

func TestProviderFailureMappingIsReturned(t *testing.T) {
	providerErr := provider.Error{Code: "CARD_DECLINED", StatusCode: 402, Message: "declined"}
	client := &recordingProvider{err: providerErr}
	session := &PaymentSession{ID: "wps_1"}

	_, err := authorizeProvider(context.Background(), client, session, 1000, "YER", provider.RequestMeta{})
	if !errors.As(err, &providerErr) {
		t.Fatalf("expected provider error to be returned, got %v", err)
	}
}

// TestIsAmbiguousProviderError verifies the classification used to decide
// between marking a session 'failed' (a clean provider decline) and
// 'provider_result_unknown' (a genuinely ambiguous outcome).
func TestIsAmbiguousProviderError(t *testing.T) {
	declineErr := provider.Error{Code: "CARD_DECLINED", StatusCode: 402, Message: "declined"}
	if isAmbiguousProviderError(declineErr) {
		t.Fatalf("expected a provider.Error decline to NOT be ambiguous")
	}

	transportErr := errors.New("connection reset")
	if !isAmbiguousProviderError(transportErr) {
		t.Fatalf("expected a plain transport error to be ambiguous")
	}

	validationErr := fmt.Errorf("provider authorization returned invalid status or reference")
	if !isAmbiguousProviderError(validationErr) {
		t.Fatalf("expected a local validation error to be ambiguous")
	}
}
