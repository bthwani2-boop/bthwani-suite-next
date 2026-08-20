package http

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/store"
)

func financePayoutDestinationRequest(method, body string) *http.Request {
	request := httptest.NewRequest(method, "/dsh/operator/payout-destinations/partner/partner-1", bytes.NewBufferString(body))
	request.SetPathValue("actorType", "partner")
	request.SetPathValue("actorId", "partner-1")
	return partnerRequestWithActor(request, store.StoreActor{
		ID: "operator-1", Role: "operator", OperatorContextID: "operator-context-1", SessionSurface: "control-panel",
	})
}

func TestFinancePayoutDestinationHandlersRejectMalformedOrIncompleteInputs(t *testing.T) {
	validUpsert := `{"beneficiaryName":"Partner One","officialWalletProviderKey":"provider-1","destinationReference":"destination-1","reason":"verified by finance","evidenceReference":"evidence-1"}`
	validDeactivate := `{"reason":"destination retired","evidenceReference":"evidence-1"}`

	tests := []struct {
		name       string
		handler    func(http.ResponseWriter, *http.Request)
		body       string
		wantStatus int
	}{
		{name: "upsert malformed json", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationUpsert, body: "{", wantStatus: http.StatusBadRequest},
		{name: "upsert unknown field", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationUpsert, body: validUpsert[:len(validUpsert)-1] + `,"unexpected":true}`, wantStatus: http.StatusBadRequest},
		{name: "upsert missing evidence", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationUpsert, body: `{"beneficiaryName":"Partner One","officialWalletProviderKey":"provider-1","destinationReference":"destination-1","reason":"verified by finance"}`, wantStatus: http.StatusBadRequest},
		{name: "verify malformed json", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationVerify, body: "{", wantStatus: http.StatusBadRequest},
		{name: "verify invalid decision", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationVerify, body: `{"destinationVersion":1,"decision":"approved","reason":"verified by finance","evidenceReference":"evidence-1"}`, wantStatus: http.StatusBadRequest},
		{name: "verify missing version", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationVerify, body: `{"decision":"verified","reason":"verified by finance","evidenceReference":"evidence-1"}`, wantStatus: http.StatusBadRequest},
		{name: "deactivate malformed json", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationDeactivate, body: "{", wantStatus: http.StatusBadRequest},
		{name: "deactivate missing reason", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationDeactivate, body: `{"evidenceReference":"evidence-1"}`, wantStatus: http.StatusBadRequest},
		{name: "deactivate unknown field", handler: (&protectedStoreServer{}).handleFinancePayoutDestinationDeactivate, body: strings.TrimSuffix(validDeactivate, "}") + `,"unexpected":true}`, wantStatus: http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			request := financePayoutDestinationRequest(http.MethodPost, tc.body)
			response := httptest.NewRecorder()

			tc.handler(response, request)

			if response.Code != tc.wantStatus {
				t.Fatalf("status=%d, want %d, body=%s", response.Code, tc.wantStatus, response.Body.String())
			}
		})
	}
}
