package http

import (
	"net/http"
	"testing"
)

func TestJourney030ExposesGovernedPartnerFleetRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPartnerFleetMembershipRoutes(router, nil, nil, nil, nil)
	RegisterPartnerFleetOperatorRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{name: "issue fleet code", method: http.MethodPost, path: "/dsh/partner/stores/store-1/couriers/member-1/connection-code", pattern: "POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code"},
		{name: "list partner connections", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-connections", pattern: "GET /dsh/partner/stores/{storeId}/courier-connections"},
		{name: "revoke pending connection", method: http.MethodPost, path: "/dsh/partner/stores/store-1/courier-connections/connection-1/revoke", pattern: "POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke"},
		{name: "connect captain", method: http.MethodPost, path: "/dsh/captain/partner-fleet/connect", pattern: "POST /dsh/captain/partner-fleet/connect"},
		{name: "list captain memberships", method: http.MethodGet, path: "/dsh/captain/partner-fleet/memberships", pattern: "GET /dsh/captain/partner-fleet/memberships"},
		{name: "disconnect captain membership", method: http.MethodPost, path: "/dsh/captain/partner-fleet/memberships/member-1/disconnect", pattern: "POST /dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect"},
		{name: "operator fleet readback", method: http.MethodGet, path: "/dsh/operator/stores/store-1/partner-fleet", pattern: "GET /dsh/operator/stores/{storeId}/partner-fleet"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request, err := http.NewRequest(tc.method, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern != tc.pattern {
				t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
			}
		})
	}
}
