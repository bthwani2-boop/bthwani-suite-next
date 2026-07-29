package http

import (
	"net/http"
	"testing"
)

func TestJourneys026To030ExposeGovernedRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	RegisterPartnerFleetMembershipRoutes(router, nil, nil, nil, nil)
	RegisterPartnerFleetOperatorRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		//  — coupons, delivery pricing, and loyalty earning policies.
		{journey: " list coupons", method: http.MethodGet, path: "/dsh/operator/marketing/coupons", pattern: "GET /dsh/operator/marketing/coupons"},
		{journey: " create coupon", method: http.MethodPost, path: "/dsh/operator/marketing/coupons", pattern: "POST /dsh/operator/marketing/coupons"},
		{journey: " update coupon", method: http.MethodPatch, path: "/dsh/operator/marketing/coupons/coupon-1", pattern: "PATCH /dsh/operator/marketing/coupons/{couponId}"},
		{journey: " operator delivery pricing", method: http.MethodPut, path: "/dsh/operator/stores/store-1/delivery-pricing/bthwani_delivery", pattern: "PUT /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{journey: " partner delivery pricing", method: http.MethodPut, path: "/dsh/partner/stores/store-1/delivery-pricing/partner_delivery", pattern: "PUT /dsh/partner/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{journey: " list loyalty policies", method: http.MethodGet, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "GET /dsh/operator/marketing/loyalty-earning-policies"},
		{journey: " create loyalty policy", method: http.MethodPost, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "POST /dsh/operator/marketing/loyalty-earning-policies"},
		{journey: " update loyalty policy", method: http.MethodPatch, path: "/dsh/operator/marketing/loyalty-earning-policies/policy-1", pattern: "PATCH /dsh/operator/marketing/loyalty-earning-policies/{policyId}"},

		//  — subscriptions and commercial benefits.
		{journey: " list subscription plans", method: http.MethodGet, path: "/dsh/operator/marketing/subscription-plans", pattern: "GET /dsh/operator/marketing/subscription-plans"},
		{journey: " create subscription plan", method: http.MethodPost, path: "/dsh/operator/marketing/subscription-plans", pattern: "POST /dsh/operator/marketing/subscription-plans"},
		{journey: " update subscription plan", method: http.MethodPatch, path: "/dsh/operator/marketing/subscription-plans/plan-1", pattern: "PATCH /dsh/operator/marketing/subscription-plans/{planId}"},
		{journey: " purchase subscription", method: http.MethodPost, path: "/dsh/client/marketing/subscriptions/purchase", pattern: "POST /dsh/client/marketing/subscriptions/purchase"},
		{journey: " activate subscription", method: http.MethodPost, path: "/dsh/client/marketing/subscriptions/purchase-1/activate", pattern: "POST /dsh/client/marketing/subscriptions/{purchaseId}/activate"},
		{journey: " read client benefits", method: http.MethodGet, path: "/dsh/client/benefits", pattern: "GET /dsh/client/benefits"},

		//  — governed service areas and delivery-mode pricing projections.
		{journey: " list service areas", method: http.MethodGet, path: "/dsh/operator/platform/service-areas", pattern: "GET /dsh/operator/platform/service-areas"},
		{journey: " update service area", method: http.MethodPut, path: "/dsh/operator/platform/service-areas/SANAA", pattern: "PUT /dsh/operator/platform/service-areas/{serviceAreaCode}"},
		{journey: " read store coverage", method: http.MethodGet, path: "/dsh/partner/stores/store-1/coverage-zones", pattern: "GET /dsh/partner/stores/{storeId}/coverage-zones"},
		{journey: " read courier mode", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-settings", pattern: "GET /dsh/partner/stores/{storeId}/courier-settings"},

		//  — partner fleet connection, operator readback, and captain-owned disconnect.
		{journey: " issue fleet code", method: http.MethodPost, path: "/dsh/partner/stores/store-1/couriers/member-1/connection-code", pattern: "POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code"},
		{journey: " list partner connections", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-connections", pattern: "GET /dsh/partner/stores/{storeId}/courier-connections"},
		{journey: " revoke pending connection", method: http.MethodPost, path: "/dsh/partner/stores/store-1/courier-connections/connection-1/revoke", pattern: "POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke"},
		{journey: " connect captain", method: http.MethodPost, path: "/dsh/captain/partner-fleet/connect", pattern: "POST /dsh/captain/partner-fleet/connect"},
		{journey: " list captain memberships", method: http.MethodGet, path: "/dsh/captain/partner-fleet/memberships", pattern: "GET /dsh/captain/partner-fleet/memberships"},
		{journey: " disconnect captain membership", method: http.MethodPost, path: "/dsh/captain/partner-fleet/memberships/member-1/disconnect", pattern: "POST /dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect"},
		{journey: " operator fleet readback", method: http.MethodGet, path: "/dsh/operator/stores/store-1/partner-fleet", pattern: "GET /dsh/operator/stores/{storeId}/partner-fleet"},
	}

	for _, tc := range cases {
		t.Run(tc.journey, func(t *testing.T) {
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
