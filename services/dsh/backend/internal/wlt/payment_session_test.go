package wlt

import (
        "context"
        "net/http"
        "net/http/httptest"
        "testing"
        "time"
)

func paymentSessionTestContext() context.Context {
        return WithOperatorContext(context.Background(), "OperatorContext-a")
}

func TestGetPaymentSessionUsesServiceTokenAndParsesTruth(t *testing.T) {
        updatedAt := time.Date(2026, 7, 21, 1, 2, 3, 0, time.UTC)
        server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                if r.Method != http.MethodGet {
                        t.Fatalf("method=%s, want GET", r.Method)
                }
                if r.URL.Path != "/wlt/payment-sessions/session-1" {
                        t.Fatalf("path=%s", r.URL.Path)
                }
                if got := r.Header.Get("Authorization"); got != "Bearer service-secret" {
                        t.Fatalf("authorization=%q", got)
                }
                if got := r.Header.Get("X-Delegated-Operator-Context"); got != "OperatorContext-a" {
                        t.Fatalf("delegated OperatorContext=%q", got)
                }
                if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
                        t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
                }
                w.Header().Set("Content-Type", "application/json")
                // The stub mirrors the real WLT reference.PaymentSession read model
                // (clientId/paymentMethod/providerReference/amountMinorUnits with
                // RFC3339 timestamps) so this test proves the actual cross-service
                // contract, not an invented one.
                _, _ = w.Write([]byte(`{"paymentSession": {
                        "id":"session-1",
                        "operatorContextId":"OperatorContext-a",
                        "clientId":"client-1",
                        "storeId":"store-1",
                        "paymentMethod":"official_wallet",
                        "status":"captured",
                        "providerReference":"WLT-001",
                        "amountMinorUnits":12500,
                        "currency":"YER",
                        "financialPurpose":"order_payment",
                        "createdAt":"2026-07-21T01:00:00Z",
                        "updatedAt":"2026-07-21T01:02:03Z"
                }}`))
        }))
        defer server.Close()

        client := NewClient(server.URL, "service-secret")
        session, err := client.GetPaymentSession(paymentSessionTestContext(), "session-1")
        if err != nil {
                t.Fatalf("GetPaymentSession: %v", err)
        }
        if session.ID != "session-1" || session.Status != "captured" || session.PaymentMethod != "official_wallet" {
                t.Fatalf("unexpected session: %#v", session)
        }
        if session.ClientID != "client-1" || session.StoreID != "store-1" || session.ProviderReference != "WLT-001" || session.AmountMinorUnits != 12500 || session.Currency != "YER" {
                t.Fatalf("unexpected session identity/financials: %#v", session)
        }
        if !session.UpdatedAt.Equal(updatedAt) {
                t.Fatalf("updatedAt=%s, want %s", session.UpdatedAt, updatedAt)
        }
}

func TestGetPaymentSessionRejectsIncompleteResponse(t *testing.T) {
        server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                _, _ = w.Write([]byte(`{"paymentSession": {"id":"session-1"}}`))
        }))
        defer server.Close()

        client := NewClient(server.URL, "service-secret")
        if _, err := client.GetPaymentSession(paymentSessionTestContext(), "session-1"); err == nil {
                t.Fatal("incomplete WLT response must fail closed")
        }
}
