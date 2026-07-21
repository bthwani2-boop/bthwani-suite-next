package http

import (
	"net/http"
	"testing"
)

func TestJourneys026To030ExposeGovernedRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPartnerFleetMembershipRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		// JRN-026 — coupons, delivery pricing, and loyalty earning policies.
		{journey: "JRN-026 list coupons", method: http.MethodGet, path: "/dsh/operator/marketing/coupons", pattern: "GET /dsh/operator/marketing/coupons"},
		{journey: "JRN-026 create coupon", method: http.MethodPost, path: "/dsh/operator/marketing/coupons", pattern: "POST /dsh/operator/marketing/coupons"},
		{journey: "JRN-026 update coupon", method: http.MethodPatch, path: "/dsh/operator/marketing/coupons/coupon-1", pattern: "PATCH /dsh/operator/marketing/coupons/{couponId}"},
		{journey: "JRN-026 operator delivery pricing", method: http.MethodPut, path: "/dsh/operator/stores/store-1/delivery-pricing/bthwani_delivery", pattern: "PUT /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{journey: "JRN-026 partner delivery pricing", method: http.MethodPut, path: "/dsh/partner/stores/store-1/delivery-pricing/partner_delivery", pattern: "PUT /dsh/partner/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{journey: "JRN-026 list loyalty policies", method: http.MethodGet, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "GET /dsh/operator/marketing/loyalty-earning-policies"},
		{journey: "JRN-026 create loyalty policy", method: http.MethodPost, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "POST /dsh/operator/marketing/loyalty-earning-policies"},
		{journey: "JRN-026 update loyalty policy", method: http.MethodPatch, path: "/dsh/operator/marketing/loyalty-earning-policies/policy-1", pattern: "PATCH /dsh/operator/marketing/loyalty-earning-policies/{policyId}"},

		// JRN-027 — subscriptions and commercial benefits.
		{journey: "JRN-027 list subscription plans", method: http.MethodGet, path: "/dsh/operator/marketing/subscription-plans", pattern: "GET /dsh/operator/marketing/subscription-plans"},
		{journey: "JRN-027 create subscription plan", method: http.MethodPost, path: "/dsh/operator/marketing/subscription-plans", pattern: "POST /dsh/operator/marketing/subscription-plans"},
		{journey: "JRN-027 update subscription plan", method: http.MethodPatch, path: "/dsh/operator/marketing/subscription-plans/plan-1", pattern: "PATCH /dsh/operator/marketing/subscription-plans/{planId}"},
		{journey: "JRN-027 purchase subscription", method: http.MethodPost, path: "/dsh/client/marketing/subscriptions/purchase", pattern: "POST /dsh/client/marketing/subscriptions/purchase"},
		{journey: "JRN-027 activate subscription", method: http.MethodPost, path: "/dsh/client/marketing/subscriptions/purchase-1/activate", pattern: "POST /dsh/client/marketing/subscriptions/{purchaseId}/activate"},
		{journey: "JRN-027 read client benefits", method: http.MethodGet, path: "/dsh/client/benefits", pattern: "GET /dsh/client/benefits"},

		// JRN-029 — governed service areas and delivery-mode pricing projections.
		{journey: "JRN-029 list service areas", method: http.MethodGet, path: "/dsh/operator/platform/service-areas", pattern: "GET /dsh/operator/platform/service-areas"},
		{journey: "JRN-029 update service area", method: http.MethodPut, path: "/dsh/operator/platform/service-areas/SANAA", pattern: "PUT /dsh/operator/platform/service-areas/{serviceAreaCode}"},
		{journey: "JRN-029 read store coverage", method: http.MethodGet, path: "/dsh/partner/stores/store-1/coverage-zones", pattern: "GET /dsh/partner/stores/{storeId}/coverage-zones"},
		{journey: "JRN-029 read courier mode", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-settings", pattern: "GET /dsh/partner/stores/{storeId}/courier-settings"},

		// JRN-030 — partner fleet connection and captain-owned disconnect.
		{journey: "JRN-030 issue fleet code", method: http.MethodPost, path: "/dsh/partner/stores/store-1/couriers/member-1/connection-code", pattern: "POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code"},
		{journey: "JRN-030 list partner connections", method: http.MethodGet, path: "/dsh/partner/stores/store-1/courier-connections", pattern: "GET /dsh/partner/stores/{storeId}/courier-connections"},
		{journey: "JRN-030 revoke pending connection", method: http.MethodPost, path: "/dsh/partner/stores/store-1/courier-connections/connection-1/revoke", pattern: "POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke"},
		{journey: "JRN-030 connect captain", method: http.MethodPost, path: "/dsh/captain/partner-fleet/connect", pattern: "POST /dsh/captain/partner-fleet/connect"},
		{journey: "JRN-030 list captain memberships", method: http.MethodGet, path: "/dsh/captain/partner-fleet/memberships", pattern: "GET /dsh/captain/partner-fleet/memberships"},
		{journey: "JRN-030 disconnect captain membership", method: http.MethodPost, path: "/dsh/captain/partner-fleet/memberships/member-1/disconnect", pattern: "POST /dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect"},
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
