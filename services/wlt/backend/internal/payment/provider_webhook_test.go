package payment

import "testing"

func validProviderWebhookEnvelope() providerWebhookEnvelope {
	return providerWebhookEnvelope{
		EventID:           "event-1",
		Type:              "payment.authorized",
		OperatorContextID: "operator-1",
		PaymentSessionID:  "session-1",
		Status:            "authorized",
		ProviderReference: "provider-1",
	}
}

func TestValidateProviderWebhookEnvelopeRequiresProviderReferenceForAuthorizedAndCaptured(t *testing.T) {
	for _, status := range []string{"authorized", "captured"} {
		envelope := validProviderWebhookEnvelope()
		envelope.Status = status
		envelope.Type = providerEventTypeForStatus(status)
		envelope.ProviderReference = ""
		if err := validateProviderWebhookEnvelope(envelope); err == nil {
			t.Fatalf("expected provider reference validation for %s event", status)
		}
	}
}

func TestValidateProviderWebhookEnvelopeAllowsReferenceOptionalFailureEvents(t *testing.T) {
	for _, status := range []string{"failed", "expired"} {
		envelope := validProviderWebhookEnvelope()
		envelope.Status = status
		envelope.Type = providerEventTypeForStatus(status)
		envelope.ProviderReference = ""
		if err := validateProviderWebhookEnvelope(envelope); err != nil {
			t.Fatalf("failure event %s should not require provider reference: %v", status, err)
		}
	}
}
