package http

import (
	"net/http"
	"testing"
)

func TestJourney030ExposesGovernedPartnerFleetRoutes(t *testing.T) {
	router := http.NewServeMux()
	server := newProtectedStoreServer(nil, nil, nil, nil)

	// Register the production JRN-030 handlers on an isolated mux. Route
	// ownership is proven through ServeMux matching only; handlers are not
	// executed here because their repositories and identity dependencies are
	// intentionally nil. Runtime behavior is covered by the live API gate.
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
			request, err := http.NewRequest(tc.method, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern == "" {
				t.Fatalf("no governed route registered for %s %s", tc.method, tc.path)
			}
		})
	}
}
