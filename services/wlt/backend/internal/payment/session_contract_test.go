package payment

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// TestPaymentSessionJSONEmitsTrustedDshReadContract proves the exact JSON
// shape the DSH payment-session readback decodes: clientId (not actorId),
// paymentMethod, providerReference, amountMinorUnits, and RFC3339
// createdAt/updatedAt. DSH's checkout and special-request sagas parse this
// payload with Go time.Time fields, so any non-RFC3339 timestamp or renamed
// identity field breaks the cross-service handoff end to end.
func TestPaymentSessionJSONEmitsTrustedDshReadContract(t *testing.T) {
	createdAt := time.Date(2026, 7, 21, 1, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, 7, 21, 1, 2, 3, 0, time.UTC)
	session := PaymentSession{
		ID:                "session-1",
		OperatorContextID: "OperatorContext-1",
		ClientID:          "client-1",
		StoreID:           "store-1",
		PaymentMethod:     "official_wallet",
		Status:            "captured",
		ProviderReference: "WLT-001",
		AmountMinorUnits:  12500,
		Currency:          "YER",
		FinancialPurpose:  "order_payment",
		CreatedAt:         createdAt,
		UpdatedAt:         updatedAt,
	}

	raw, err := json.Marshal(map[string]any{"paymentSession": session})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	body := string(raw)

	required := []string{
		`"clientId":"client-1"`,
		`"storeId":"store-1"`,
		`"paymentMethod":"official_wallet"`,
		`"providerReference":"WLT-001"`,
		`"amountMinorUnits":12500`,
		`"status":"captured"`,
		`"currency":"YER"`,
	}
	for _, want := range required {
		if !strings.Contains(body, want) {
			t.Fatalf("payment-session read contract missing %s in %s", want, body)
		}
	}

	var envelope struct {
		PaymentSession struct {
			ClientID          string    `json:"clientId"`
			ProviderReference string    `json:"providerReference"`
			AmountMinorUnits  int64     `json:"amountMinorUnits"`
			CreatedAt         time.Time `json:"createdAt"`
			UpdatedAt         time.Time `json:"updatedAt"`
		} `json:"paymentSession"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("DSH-side decode of WLT payload failed: %v", err)
	}
	if envelope.PaymentSession.ClientID != "client-1" || envelope.PaymentSession.ProviderReference != "WLT-001" || envelope.PaymentSession.AmountMinorUnits != 12500 {
		t.Fatalf("unexpected decoded session: %#v", envelope.PaymentSession)
	}
	if !envelope.PaymentSession.UpdatedAt.Equal(updatedAt) {
		t.Fatalf("updatedAt=%s, want %s", envelope.PaymentSession.UpdatedAt, updatedAt)
	}
	if !strings.Contains(body, `"createdAt":"2026-07-21T01:00:00Z"`) {
		t.Fatalf("createdAt must serialize as RFC3339 date-time per contract, got %s", body)
	}
	if strings.Contains(body, "actorId") || strings.Contains(body, `"method"`) || strings.Contains(body, `"reference"`) {
		t.Fatalf("payment-session read contract must not emit phantom DSH-invented fields, got %s", body)
	}
}
