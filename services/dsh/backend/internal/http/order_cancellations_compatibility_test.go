package http

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeCancellationBodyNormalizesLegacyOperatorPayload(t *testing.T) {
	req := httptest.NewRequest(
		"POST",
		"/dsh/operator/orders/order-1/cancel",
		strings.NewReader(`{"reason":"تعذر تنفيذ الطلب"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-ID", "legacy-cancel-command-1")
	response := httptest.NewRecorder()

	body, ok := decodeCancellationBody(response, req)
	if !ok {
		t.Fatalf("legacy cancellation payload was rejected: status=%d body=%s", response.Code, response.Body.String())
	}
	if body.ReasonCode != "other" {
		t.Fatalf("reasonCode=%q want other", body.ReasonCode)
	}
	if body.ReasonNote != "تعذر تنفيذ الطلب" {
		t.Fatalf("reasonNote=%q", body.ReasonNote)
	}
	if body.CommandID != "legacy-cancel-command-1" {
		t.Fatalf("commandId=%q want correlation-backed compatibility command", body.CommandID)
	}
	if cancellationCorrelation(req, body) != "legacy-cancel-command-1" {
		t.Fatalf("canonical correlation did not preserve the legacy command identity")
	}
}

func TestDecodeCancellationBodyPreservesCanonicalCommand(t *testing.T) {
	req := httptest.NewRequest(
		"POST",
		"/dsh/operator/orders/order-1/cancellation",
		strings.NewReader(`{"reasonCode":"customer_request","reasonNote":"طلب العميل","commandId":"cancel-command-2","correlationId":"cancel-correlation-2"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	body, ok := decodeCancellationBody(response, req)
	if !ok {
		t.Fatalf("canonical cancellation payload was rejected: status=%d body=%s", response.Code, response.Body.String())
	}
	if body.ReasonCode != "customer_request" || body.CommandID != "cancel-command-2" {
		t.Fatalf("canonical command changed: %+v", body)
	}
	if cancellationCorrelation(req, body) != "cancel-correlation-2" {
		t.Fatalf("explicit correlation was not preserved")
	}
}
