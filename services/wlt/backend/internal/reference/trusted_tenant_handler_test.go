package reference

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGenericPaymentSessionRouteRejectsSubscriptionSource(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-service-token")

	request := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{
		"subscriptionPurchaseId":"subp-1",
		"commercialProductReference":"sub-basic",
		"tenantId":"tenant-1",
		"clientId":"client-1",
		"storeId":"platform-subscriptions",
		"paymentMethod":"official_wallet",
		"amountMinorUnits":1000,
		"currency":"YER",
		"cartSnapshotHash":"subscription:sub-basic"
	}`))
	request.Header.Set("Authorization", "Bearer test-service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("Idempotency-Key", "generic-subscription-source")
	request.Header.Set("X-Correlation-ID", "subp-1")
	response := httptest.NewRecorder()

	HandleCreatePaymentSessionTrustedDsh(nil)(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s, want 400", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "INVALID_PAYMENT_SOURCE") {
		t.Fatalf("body=%s, want INVALID_PAYMENT_SOURCE", response.Body.String())
	}
}
