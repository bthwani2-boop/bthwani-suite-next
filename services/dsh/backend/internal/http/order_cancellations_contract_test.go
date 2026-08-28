package http

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeCancellationBodyRejectsLegacyPayload(t *testing.T) {
	req := httptest.NewRequest(
		"POST",
		"/dsh/operator/orders/order-1/cancellation",
		strings.NewReader(`{"reason":"تعذر تنفيذ الطلب"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	if _, ok := decodeCancellationBody(response, req); ok {
		t.Fatal("legacy cancellation payload was accepted")
	}
	if response.Code != 400 {
		t.Fatalf("legacy cancellation payload status=%d want 400", response.Code)
	}
}

func TestDecodeCancellationBodyPreservesCanonicalCommand(t *testing.T) {
	req := httptest.NewRequest(
		"POST",
		"/dsh/operator/orders/order-1/cancellation",
		strings.NewReader(`{"reasonCode":"customer_request","reasonNote":"طلب العميل","commandId":"cancel-command-2","correlationId":"cancel-correlation-2","ticketReference":"OPS-42"}`),
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
	if body.TicketReference != "OPS-42" {
		t.Fatalf("ticket reference changed: %q", body.TicketReference)
	}
	if cancellationCorrelation(req, body) != "cancel-correlation-2" {
		t.Fatalf("explicit correlation was not preserved")
	}
}
