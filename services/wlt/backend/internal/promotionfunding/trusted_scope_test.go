package promotionfunding

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"wlt-api/internal/shared"
)

// TestPayloadCannotChooseFinancialScope proves promotion funding takes its
// operator context from the authenticated service boundary only.
//
// The previous implementation returned the request body's operatorContextId as
// authoritative and compared it against X-Delegated-Operator-Context only when that
// header was present, so a caller who reached the route could name the
// operator context whose promotion budget it spent.
func TestPayloadCannotChooseFinancialScope(t *testing.T) {
	body, err := json.Marshal(map[string]any{
		"operatorContextId":        "victim-operator-context",
		"externalReference":        "ext-1",
		"checkoutIntentId":         "ci-1",
		"couponRedemptionId":       "cr-1",
		"couponId":                 "c-1",
		"clientId":                 "client-1",
		"platformFundedMinorUnits": 100,
		"partnerFundedMinorUnits":  0,
		"totalDiscountMinorUnits":  100,
		"currency":                 "YER",
	})
	if err != nil {
		t.Fatal(err)
	}

	t.Run("forged payload scope is refused", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPost, "/wlt/promotion-funding/reservations", strings.NewReader(string(body)))
		request = request.WithContext(shared.WithOperatorContext(request.Context(), "authenticated-operator-context"))
		request.Header.Set("Idempotency-Key", "idem-1")
		request.Header.Set("X-Correlation-ID", "corr-1")
		response := httptest.NewRecorder()

		HandleReserve(nil)(response, request)

		if response.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for a payload scope that differs from the trusted scope, got %d: %s",
				response.Code, response.Body.String())
		}
		if !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_MISMATCH") {
			t.Fatalf("expected OPERATOR_CONTEXT_MISMATCH, got %s", response.Body.String())
		}
	})

	t.Run("absent trusted scope fails closed", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPost, "/wlt/promotion-funding/reservations", strings.NewReader(string(body)))
		request.Header.Set("Idempotency-Key", "idem-2")
		request.Header.Set("X-Correlation-ID", "corr-2")
		response := httptest.NewRecorder()

		HandleReserve(nil)(response, request)

		if response.Code != http.StatusForbidden {
			t.Fatalf("expected 403 without a trusted operator context, got %d: %s",
				response.Code, response.Body.String())
		}
		if !strings.Contains(response.Body.String(), "FINANCIAL_SCOPE_REQUIRED") {
			t.Fatalf("expected FINANCIAL_SCOPE_REQUIRED, got %s", response.Body.String())
		}
	})

	t.Run("reads fail closed without a trusted scope", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/wlt/promotion-funding/reservations/pfr_1", nil)
		// A raw header must not stand in for an authenticated scope.
		request.Header.Set("X-Delegated-Operator-Context", "victim-operator-context")
		response := httptest.NewRecorder()

		HandleGet(nil)(response, request)

		if response.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for an unauthenticated read, got %d: %s",
				response.Code, response.Body.String())
		}
	})
}
