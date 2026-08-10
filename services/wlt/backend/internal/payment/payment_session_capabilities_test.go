package payment

import (
	"encoding/json"
	"testing"
)

func TestCapabilitiesForStatusCoversCanonicalStatuses(t *testing.T) {
	tests := []struct {
		status                 string
		terminal               bool
		retryAllowed           bool
		reconciliationRequired bool
		operationInProgress    bool
	}{
		{"reference_created", false, true, false, false},
		{"pending_provider", false, true, false, false},
		{"authorization_pending", false, false, false, true},
		{"authorized", false, true, false, false},
		{"capture_pending", false, false, false, true},
		{"captured", true, false, false, false},
		{"cod_pending", false, false, false, false},
		{"cod_collected", true, false, false, false},
		{"failed", true, true, false, false},
		{"expired", true, true, false, false},
		{"provider_result_unknown", false, false, true, false},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			got := CapabilitiesForStatus(tt.status)
			if got.Terminal != tt.terminal ||
				got.RetryAllowed != tt.retryAllowed ||
				got.ReconciliationRequired != tt.reconciliationRequired ||
				got.OperationInProgress != tt.operationInProgress {
				t.Fatalf("unexpected capabilities for %s: %+v", tt.status, got)
			}
			if got.NextAllowedActions == nil {
				t.Fatalf("nextAllowedActions must always be a JSON array for %s", tt.status)
			}
		})
	}
}

func TestUnknownPaymentStatusFailsClosed(t *testing.T) {
	got := CapabilitiesForStatus("unexpected_status")
	if got.Terminal || got.RetryAllowed || !got.ReconciliationRequired || got.OperationInProgress {
		t.Fatalf("unknown status did not fail closed: %+v", got)
	}
	if len(got.NextAllowedActions) != 0 {
		t.Fatalf("unknown status must expose no allowed actions: %+v", got.NextAllowedActions)
	}
}

func TestPaymentSessionJSONIncludesCapabilities(t *testing.T) {
	payload, err := json.Marshal(PaymentSession{ID: "ps-1", Status: "provider_result_unknown"})
	if err != nil {
		t.Fatal(err)
	}

	var decoded struct {
		ID           string                     `json:"id"`
		Status       string                     `json:"status"`
		Capabilities PaymentSessionCapabilities `json:"capabilities"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.ID != "ps-1" || decoded.Status != "provider_result_unknown" {
		t.Fatalf("payment-session identity was not preserved: %+v", decoded)
	}
	if !decoded.Capabilities.ReconciliationRequired || decoded.Capabilities.RetryAllowed {
		t.Fatalf("authoritative capabilities missing from JSON: %+v", decoded.Capabilities)
	}
}
