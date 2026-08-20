package payout

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"wlt-api/internal/shared"
)

func TestHandleListPayoutRequestsRejectsInvalidFiltersBeforeDatabase(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "actor id without type", path: "/payouts?beneficiaryActorId=actor-1"},
		{name: "actor type without id", path: "/payouts?beneficiaryActorType=partner"},
		{name: "unsupported actor type", path: "/payouts?beneficiaryActorId=actor-1&beneficiaryActorType=unknown"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
			request = request.WithContext(shared.WithOperatorContext(request.Context(), "operator-context-1"))
			response := httptest.NewRecorder()

			HandleListPayoutRequests(nil)(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status=%d, want 400, body=%s", response.Code, response.Body.String())
			}
		})
	}
}

func TestHandleGetPayoutRequestRequiresOperatorContextAndID(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/payouts/", nil)
	response := httptest.NewRecorder()
	HandleGetPayoutRequest(nil)(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("without operator context status=%d, want 400", response.Code)
	}

	request = httptest.NewRequest(http.MethodGet, "/payouts/", nil)
	request = request.WithContext(shared.WithOperatorContext(request.Context(), "operator-context-1"))
	response = httptest.NewRecorder()
	HandleGetPayoutRequest(nil)(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("without payout id status=%d, want 400", response.Code)
	}
}
