package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDeliveryCollectionMutationAliasesRequireSovereignEvidence(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-token")
	mux := http.NewServeMux()
	RegisterDeliveryCollectionRoutes(mux, nil, true)

	for _, path := range []string{
		"/wlt/delivery-collections/cod-1/collect",
		"/wlt/delivery-collections/cod-1/remit",
	} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{}`))
			request.Header.Set("Authorization", "Bearer test-token")
			request.Header.Set("X-Service-Caller", "dsh")
			request.Header.Set("X-Correlation-ID", "correlation-1")
			request.Header.Set("Idempotency-Key", "idempotency-1")
			response := httptest.NewRecorder()

			mux.ServeHTTP(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("expected evidence validation before database access, got status %d body %s", response.Code, response.Body.String())
			}
			if !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
				t.Fatalf("expected sovereign evidence validation error, got %s", response.Body.String())
			}
		})
	}
}

func TestDeliveryCollectionMutationsRemainFailClosedByDefault(t *testing.T) {
	mux := http.NewServeMux()
	RegisterDeliveryCollectionRoutes(mux, nil, false)

	request := httptest.NewRequest(http.MethodPost, "/wlt/delivery-collections/cod-1/collect", strings.NewReader(`{}`))
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("expected disabled mutation gate, got status %d body %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "FEATURE_NOT_ENABLED") {
		t.Fatalf("expected FEATURE_NOT_ENABLED, got %s", response.Body.String())
	}
}
