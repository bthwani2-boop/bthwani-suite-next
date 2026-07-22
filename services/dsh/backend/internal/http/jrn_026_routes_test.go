package http

import (
	"net/http"
	"testing"
)

func TestJourney026ExposesGovernedCouponPricingAndLoyaltyRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{name: "list coupons", method: http.MethodGet, path: "/dsh/operator/marketing/coupons", pattern: "GET /dsh/operator/marketing/coupons"},
		{name: "create coupon", method: http.MethodPost, path: "/dsh/operator/marketing/coupons", pattern: "POST /dsh/operator/marketing/coupons"},
		{name: "update coupon", method: http.MethodPatch, path: "/dsh/operator/marketing/coupons/coupon-1", pattern: "PATCH /dsh/operator/marketing/coupons/{couponId}"},
		{name: "read operator delivery pricing", method: http.MethodGet, path: "/dsh/operator/stores/store-1/delivery-pricing", pattern: "GET /dsh/operator/stores/{storeId}/delivery-pricing"},
		{name: "write operator delivery pricing", method: http.MethodPut, path: "/dsh/operator/stores/store-1/delivery-pricing/bthwani_delivery", pattern: "PUT /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{name: "read partner delivery pricing", method: http.MethodGet, path: "/dsh/partner/stores/store-1/delivery-pricing", pattern: "GET /dsh/partner/stores/{storeId}/delivery-pricing"},
		{name: "write partner delivery pricing", method: http.MethodPut, path: "/dsh/partner/stores/store-1/delivery-pricing/partner_delivery", pattern: "PUT /dsh/partner/stores/{storeId}/delivery-pricing/{fulfillmentMode}"},
		{name: "list loyalty earning policies", method: http.MethodGet, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "GET /dsh/operator/marketing/loyalty-earning-policies"},
		{name: "create loyalty earning policy", method: http.MethodPost, path: "/dsh/operator/marketing/loyalty-earning-policies", pattern: "POST /dsh/operator/marketing/loyalty-earning-policies"},
		{name: "update loyalty earning policy", method: http.MethodPatch, path: "/dsh/operator/marketing/loyalty-earning-policies/policy-1", pattern: "PATCH /dsh/operator/marketing/loyalty-earning-policies/{policyId}"},
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
