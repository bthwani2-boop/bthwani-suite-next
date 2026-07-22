package http

import (
	"net/http"
	"strings"
	"testing"
)

func TestJourney030ExposesGovernedPartnerFleetRoutes(t *testing.T) {
	router := http.NewServeMux()
	server := newProtectedStoreServer(nil, nil, nil, nil)

	// Core JRN-030 routes are registered directly from their production handlers
	// so failures in unrelated journeys mounted by NewRouter cannot hide this
	// journey's route ownership. The live API gate separately proves full-router
	// composition and startup.
	router.HandleFunc("POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code", server.handleIssuePartnerCourierConnectionCode)
	router.HandleFunc("GET /dsh/partner/stores/{storeId}/courier-connections", server.handleListPartnerCourierConnections)
	router.HandleFunc("POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke", server.handleRevokePartnerCourierConnection)
	router.HandleFunc("POST /dsh/captain/partner-fleet/connect", server.handleCaptainConnectPartnerFleet)
	router.HandleFunc("GET /dsh/captain/partner-fleet/memberships", server.handleCaptainPartnerFleetMemberships)
	RegisterPartnerFleetMembershipRoutes(router, nil, nil, nil, nil)
	RegisterPartnerFleetOperatorRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name       string
		method     string
		path       string
		routePath  string
	}{
		{name: "issue fleet code", method: http.MethodPost, path: "/dsh/partner/stores/store-1/couriers/member-1/connection-code", routePath: "/dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code"},
		{name: "list partner connections", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-connections", routePath: "/dsh/partner/stores/{storeId}/courier-connections"},
		{name: "revoke pending connection", method: http.MethodPost, path: "/dsh/partner/stores/store-1/courier-connections/connection-1/revoke", routePath: "/dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke"},
		{name: "connect captain", method: http.MethodPost, path: "/dsh/captain/partner-fleet/connect", routePath: "/dsh/captain/partner-fleet/connect"},
		{name: "list captain memberships", method: http.MethodGet, path: "/dsh/captain/partner-fleet/memberships", routePath: "/dsh/captain/partner-fleet/memberships"},
		{name: "disconnect captain membership", method: http.MethodPost, path: "/dsh/captain/partner-fleet/memberships/member-1/disconnect", routePath: "/dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect"},
		{name: "operator fleet readback", method: http.MethodGet, path: "/dsh/operator/stores/store-1/partner-fleet", routePath: "/dsh/operator/stores/{storeId}/partner-fleet"},
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
			// Go's ServeMux may report either the full method-qualified pattern or
			// only its path component depending on the API used to inspect it.
			registeredPath := strings.TrimPrefix(pattern, tc.method+" ")
			if registeredPath != tc.routePath {
				t.Fatalf("expected governed route path %q, got pattern %q", tc.routePath, pattern)
			}
		})
	}
}
