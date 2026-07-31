package http

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestRequiredPaymentPlatformContextUsesAuthenticatedActorContext(t *testing.T) {
	recorder := httptest.NewRecorder()

	platformContextID, ok := requiredPaymentPlatformContext(recorder, "platform-a")
	if !ok {
		t.Fatalf("expected actor platform context to be accepted, status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if platformContextID != "platform-a" {
		t.Fatalf("expected platform-a, got %q", platformContextID)
	}
}

func TestRequiredPaymentPlatformContextRejectsMissingActorContext(t *testing.T) {
	recorder := httptest.NewRecorder()

	if platformContextID, ok := requiredPaymentPlatformContext(recorder, ""); ok || platformContextID != "" {
		t.Fatalf("expected missing actor platform context to fail closed, context=%q", platformContextID)
	}
	if recorder.Code != 400 {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
	var payload struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode platform-context response: %v", err)
	}
	if payload.Code != "MISSING_PLATFORM_CONTEXT_ID" {
		t.Fatalf("expected MISSING_PLATFORM_CONTEXT_ID, got %q", payload.Code)
	}
}
