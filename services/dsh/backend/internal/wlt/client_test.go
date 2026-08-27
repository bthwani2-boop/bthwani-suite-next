package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientNotConfiguredRejectsWithoutNetworkCall(t *testing.T) {
	c := NewClient("", "")
	if c.Configured() {
		t.Fatalf("expected client with empty baseURL to be unconfigured")
	}
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error when client is not configured")
	}
	if !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestClientNotConfiguredWithoutServiceToken(t *testing.T) {
	c := NewClient("https://wlt.internal", "")
	if c.Configured() {
		t.Fatalf("expected client with missing service token to be unconfigured")
	}
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected not configured error, got: %v", err)
	}
}

func TestCreatePaymentSessionSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/wlt/payment-sessions" {
			t.Fatalf("expected /wlt/payment-sessions, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		if r.Header.Get("X-Correlation-ID") != "corr-1" {
			t.Fatalf("expected X-Correlation-ID=corr-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		if r.Header.Get("Idempotency-Key") != "idem-1" {
			t.Fatalf("expected Idempotency-Key=idem-1, got %q", r.Header.Get("Idempotency-Key"))
		}
		var input CreatePaymentSessionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if input.CheckoutIntentID != "intent-1" {
			t.Fatalf("expected checkoutIntentId=intent-1, got %q", input.CheckoutIntentID)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{
				ID:               "ps-1",
				CheckoutIntentID: "intent-1",
				ClientID:         "client-1",
				StoreID:          "store-1",
				PaymentMethod:    "wallet",
				Status:           "pending",
			},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	if !c.Configured() {
		t.Fatalf("expected client to be configured")
	}

	session, err := c.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{
		CheckoutIntentID: "intent-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
		CorrelationID:    "corr-1",
		IdempotencyKey:   "idem-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "ps-1" {
		t.Fatalf("expected session id=ps-1, got %q", session.ID)
	}
	if session.Status != "pending" {
		t.Fatalf("expected status=pending, got %q", session.Status)
	}
}

func TestCreatePaymentSessionNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{CheckoutIntentID: "intent-1"})
	if err == nil {
		t.Fatalf("expected error for HTTP 500 response")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error to mention status 500, got: %v", err)
	}
	if !IsPaymentSessionOutcomeUnknown(err) {
		t.Fatalf("expected HTTP 500 to be classified as unknown outcome, got: %v", err)
	}
}

func TestCreatePaymentSessionMalformedBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("{not-json"))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{CheckoutIntentID: "intent-1"})
	if err == nil {
		t.Fatalf("expected error for malformed JSON response")
	}
	if !strings.Contains(err.Error(), "decode") {
		t.Fatalf("expected decode error, got: %v", err)
	}
	if !IsPaymentSessionOutcomeUnknown(err) {
		t.Fatalf("expected malformed success response to be unknown, got: %v", err)
	}
}

func TestCreatePaymentSessionMissingID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{
				CheckoutIntentID: "intent-1",
			},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{CheckoutIntentID: "intent-1"})
	if err == nil {
		t.Fatalf("expected error when response is missing paymentSession.id")
	}
	if !strings.Contains(err.Error(), "missing id") {
		t.Fatalf("expected 'missing id' error, got: %v", err)
	}
	if !IsPaymentSessionOutcomeUnknown(err) {
		t.Fatalf("expected missing id after success to be unknown, got: %v", err)
	}
}

func TestNewClientTrimsTrailingSlash(t *testing.T) {
	c := NewClient("https://wlt.internal/", "test-service-token")
	if c.baseURL != "https://wlt.internal" {
		t.Fatalf("expected trailing slash to be trimmed, got %q", c.baseURL)
	}
}

func TestFinalizeCodReservationSendsGovernedHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/wlt/cod-reservations/finalize" {
			t.Fatalf("expected /wlt/cod-reservations/finalize, got %s", r.URL.Path)
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		var input map[string]string
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if input["orderId"] != "order-1" || input["checkoutIntentId"] != "intent-1" {
			t.Fatalf("unexpected input: %+v", input)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"codReservation":{"id":"reservation-1","status":"finalized"},"replayed":false}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, _, err := c.FinalizeCodReservation(trustedMutationTestContext(), "order-1", "intent-1", "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestFinalizeCodReservationNotConfigured(t *testing.T) {
	c := NewClient("", "")
	_, _, err := c.FinalizeCodReservation(context.Background(), "order-1", "intent-1", "", "")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestExecuteFinanceReadWalletBuildsCanonicalPathAndHeaders(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.URL.RawQuery != "" {
			t.Fatalf("expected no query string for path-based wallet lookup, got %q", r.URL.RawQuery)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"wallet":{"balanceMinorUnits":0}}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	status, body, err := c.ExecuteFinanceRead(trustedMutationTestContext(), "finance.wallet.read", map[string]string{"actorType": "field", "actorId": "field-123"}, nil, "corr-1", "OperatorContext-a")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	if gotPath != "/wlt/wallets/field/field-123" {
		t.Fatalf("expected path /wlt/wallets/field/field-123, got %q", gotPath)
	}
	if !strings.Contains(string(body), "balanceMinorUnits") {
		t.Fatalf("expected body to be forwarded verbatim, got %q", body)
	}
}

func TestExecuteFinanceReadEscapesActorIDSegment(t *testing.T) {
	var gotEscapedPath string
	var gotSegmentCount int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotEscapedPath = r.URL.EscapedPath()
		gotSegmentCount = len(strings.Split(strings.TrimPrefix(r.URL.EscapedPath(), "/"), "/"))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"wallet":{"balanceMinorUnits":0}}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	if _, _, err := c.ExecuteFinanceRead(trustedMutationTestContext(), "finance.wallet.read", map[string]string{"actorType": "field", "actorId": "../admin"}, nil, "corr-1", "OperatorContext-a"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotEscapedPath != "/wlt/wallets/field/..%2Fadmin" {
		t.Fatalf("expected escaped path /wlt/wallets/field/..%%2Fadmin, got %q", gotEscapedPath)
	}
	if gotSegmentCount != 4 {
		t.Fatalf("expected exactly 4 path segments, got %d from %q", gotSegmentCount, gotEscapedPath)
	}
}

func TestExecuteFinanceReadRejectsIncompleteWalletCoordinates(t *testing.T) {
	c := NewClient("https://wlt.internal", "test-service-token")
	_, _, err := c.ExecuteFinanceRead(trustedMutationTestContext(), "finance.wallet.read", map[string]string{"actorType": "field"}, nil, "corr-1", "OperatorContext-a")
	if err == nil || !strings.Contains(err.Error(), "path parameters are incomplete") {
		t.Fatalf("expected incomplete-coordinate error, got: %v", err)
	}
}

func TestExecuteFinanceReadRequiresTrustedOperatorContext(t *testing.T) {
	c := NewClient("https://wlt.internal", "test-service-token")
	_, _, err := c.ExecuteFinanceRead(context.Background(), "finance.wallet.read", map[string]string{"actorType": "field", "actorId": "field-1"}, nil, "corr-1", "")
	if err == nil || !strings.Contains(err.Error(), "trusted OperatorContext context is required") {
		t.Fatalf("expected trusted-context error, got: %v", err)
	}
}

func TestExecuteFinanceReadNotConfigured(t *testing.T) {
	c := NewClient("", "")
	_, _, err := c.ExecuteFinanceRead(trustedMutationTestContext(), "finance.wallet.read", map[string]string{"actorType": "field", "actorId": "field-1"}, nil, "corr-1", "OperatorContext-a")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestDeliverFieldCommissionSendsExactBodyAndHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/wlt/commissions" {
			t.Fatalf("expected /wlt/commissions, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		if r.Header.Get("X-Correlation-ID") != "corr-visit-1" {
			t.Fatalf("expected X-Correlation-ID=corr-visit-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		var raw map[string]any
		if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		expected := map[string]any{
			"beneficiaryActorId":   "field-1",
			"beneficiaryActorType": "field",
			"sourceType":           "field_visit",
			"sourceId":             "visit-1",
			"visitId":              "visit-1",
			"storeId":              "store-1",
			"idempotencyKey":       "field_visit_commission:visit-1",
		}
		for k, v := range expected {
			if raw[k] != v {
				t.Fatalf("expected %s=%v, got %v", k, v, raw[k])
			}
		}
		for _, forbidden := range []string{"amount", "amountMinorUnits", "currency", "commissionType"} {
			if _, ok := raw[forbidden]; ok {
				t.Fatalf("did not expect %q field in field commission request body", forbidden)
			}
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	err := c.DeliverFieldCommission(trustedMutationTestContext(), DeliverFieldCommissionInput{
		BeneficiaryActorID: "field-1",
		SourceID:           "visit-1",
		VisitID:            "visit-1",
		StoreID:            "store-1",
		IdempotencyKey:     "field_visit_commission:visit-1",
		CorrelationID:      "corr-visit-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDeliverFieldCommissionNotConfigured(t *testing.T) {
	c := NewClient("", "")
	err := c.DeliverFieldCommission(context.Background(), DeliverFieldCommissionInput{})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestDeliverFieldCommissionNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	err := c.DeliverFieldCommission(trustedMutationTestContext(), DeliverFieldCommissionInput{VisitID: "visit-1"})
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error mentioning status 500, got: %v", err)
	}
}

func TestExpireSessionSendsServiceHeadersAndPath(t *testing.T) {
	var gotPath, gotMethod string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotMethod = r.Method
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		if r.Header.Get("X-Correlation-ID") != "corr-1" {
			t.Fatalf("expected X-Correlation-ID=corr-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	if err := c.ExpireSession(trustedMutationTestContext(), "ps-1", "corr-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("expected POST, got %s", gotMethod)
	}
	if gotPath != "/wlt/payment-sessions/ps-1/expire" {
		t.Fatalf("expected /wlt/payment-sessions/ps-1/expire, got %q", gotPath)
	}
}

func TestExpireSessionTreats409AsTerminalSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusConflict)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	if err := c.ExpireSession(trustedMutationTestContext(), "ps-1", "corr-1"); err != nil {
		t.Fatalf("expected 409 to be treated as terminal success (session already not expirable), got error: %v", err)
	}
}

func TestExpireSessionNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	err := c.ExpireSession(trustedMutationTestContext(), "ps-1", "corr-1")
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error mentioning status 500, got: %v", err)
	}
}

func TestExpireSessionNotConfigured(t *testing.T) {
	c := NewClient("", "")
	err := c.ExpireSession(context.Background(), "ps-1", "corr-1")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestCancelSessionForOrderSendsExactBodyAndHeaders(t *testing.T) {
	var gotPath string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
			t.Fatalf("expected X-Delegated-Operator-Context=OperatorContext-a, got %q", r.Header.Get("X-Delegated-Operator-Context"))
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		if r.Header.Get("X-Correlation-ID") != "order-cancellation-order-1" {
			t.Fatalf("expected X-Correlation-ID=order-cancellation-order-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"action": "refund_requested",
			"refund": map[string]any{"id": "refund-1"},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	result, err := c.CancelSessionForOrderWithResult(trustedMutationTestContext(), "ps-1", CancelSessionForOrderInput{
		OrderID:  "order-1",
		ClientID: "client-1",
		Reason:   "store rejected order",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "refund_requested" || result.RefundID != "refund-1" {
		t.Fatalf("unexpected cancel result: %+v", result)
	}
	if gotPath != "/wlt/order-cancellations" {
		t.Fatalf("expected /wlt/order-cancellations, got %q", gotPath)
	}
	if gotBody["paymentSessionId"] != "ps-1" {
		t.Fatalf("expected paymentSessionId in canonical body, got %+v", gotBody)
	}
	if gotBody["orderId"] != "order-1" || gotBody["clientId"] != "client-1" || gotBody["reason"] != "store rejected order" {
		t.Fatalf("unexpected request body: %+v", gotBody)
	}
}

func TestCancelSessionForOrderNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CancelSessionForOrderWithResult(trustedMutationTestContext(), "ps-1", CancelSessionForOrderInput{
		OrderID:  "order-1",
		ClientID: "client-1",
		Reason:   "client cancelled order",
	})
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error mentioning status 500, got: %v", err)
	}
}

func TestCancelSessionForOrderNotConfigured(t *testing.T) {
	c := NewClient("", "")
	_, err := c.CancelSessionForOrderWithResult(context.Background(), "ps-1", CancelSessionForOrderInput{OrderID: "order-1"})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestFinalizeCodReservationNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, _, err := c.FinalizeCodReservation(trustedMutationTestContext(), "order-1", "intent-1", "", "")
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error mentioning status 500, got: %v", err)
	}
}

func TestCreatePaymentSessionClientErrorIsDefinitive(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{CheckoutIntentID: "intent-1"})
	if err == nil {
		t.Fatal("expected HTTP 400 error")
	}
	if IsPaymentSessionOutcomeUnknown(err) {
		t.Fatalf("expected HTTP 400 to be definitive, got: %v", err)
	}
}
