package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJourney030ExposesGovernedPartnerFleetRoutes(t *testing.T) {
	router := http.NewServeMux()
	server := newProtectedStoreServer(nil, nil, nil, nil)

	// Register the production JRN-030 handlers on an isolated mux. The assertion
	// below uses real HTTP dispatch rather than ServeMux's internal pattern text,
	// whose representation can vary across Go versions.
	router.HandleFunc("POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code", server.handleIssuePartnerCourierConnectionCode)
	router.HandleFunc("GET /dsh/partner/stores/{storeId}/courier-connections", server.handleListPartnerCourierConnections)
	router.HandleFunc("POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke", server.handleRevokePartnerCourierConnection)
	router.HandleFunc("POST /dsh/captain/partner-fleet/connect", server.handleCaptainConnectPartnerFleet)
	router.HandleFunc("GET /dsh/captain/partner-fleet/memberships", server.handleCaptainPartnerFleetMemberships)
	RegisterPartnerFleetMembershipRoutes(router, nil, nil, nil, nil)
	RegisterPartnerFleetOperatorRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{name: "issue fleet code", method: http.MethodPost, path: "/dsh/partner/stores/store-1/couriers/member-1/connection-code"},
		{name: "list partner connections", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-connections"},
		{name: "revoke pending connection", method: http.MethodPost, path: "/dsh/partner/stores/store-1/courier-connections/connection-1/revoke"},
		{name: "connect captain", method: http.MethodPost, path: "/dsh/captain/partner-fleet/connect"},
		{name: "list captain memberships", method: http.MethodGet, path: "/dsh/captain/partner-fleet/memberships"},
		{name: "disconnect captain membership", method: http.MethodPost, path: "/dsh/captain/partner-fleet/memberships/member-1/disconnect"},
		{name: "operator fleet readback", method: http.MethodGet, path: "/dsh/operator/stores/store-1/partner-fleet"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code == http.StatusNotFound {
				t.Fatalf("no governed route registered for %s %s", tc.method, tc.path)
			}
			if response.Code == http.StatusMethodNotAllowed {
				t.Fatalf("governed route rejected its declared method %s %s", tc.method, tc.path)
			}
		})
	}
}
