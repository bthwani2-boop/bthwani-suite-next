package http

import (
	"net/http"
	"testing"
)

func TestJourneys020To025ExposeGovernedRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterActorNotificationRoutes(router, nil, nil, nil, nil)
	RegisterFieldReadinessRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		// JRN-020 — delivery exceptions and return custody.
		{journey: "JRN-020 report exception", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/asg-1/exceptions", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions"},
		{journey: "JRN-020 read captain exception", method: http.MethodGet, path: "/dsh/captain/dispatch/assignments/asg-1/exceptions", pattern: "GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions"},
		{journey: "JRN-020 operator exception queue", method: http.MethodGet, path: "/dsh/operator/delivery-exceptions", pattern: "GET /dsh/operator/delivery-exceptions"},
		{journey: "JRN-020 acknowledge exception", method: http.MethodPost, path: "/dsh/operator/delivery-exceptions/ex-1/acknowledge", pattern: "POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge"},
		{journey: "JRN-020 resolve exception", method: http.MethodPost, path: "/dsh/operator/delivery-exceptions/ex-1/resolve", pattern: "POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve"},
		{journey: "JRN-020 captain return arrival", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/asg-1/return-to-store/arrive", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive"},
		{journey: "JRN-020 partner return read", method: http.MethodGet, path: "/dsh/partner/orders/order-1/return-to-store", pattern: "GET /dsh/partner/orders/{orderId}/return-to-store"},
		{journey: "JRN-020 partner return accept", method: http.MethodPost, path: "/dsh/partner/orders/order-1/return-to-store/accept", pattern: "POST /dsh/partner/orders/{orderId}/return-to-store/accept"},

		// JRN-021 — actor support conversation and order rescue.
		{journey: "JRN-021 create support ticket", method: http.MethodPost, path: "/dsh/support/tickets", pattern: "POST /dsh/support/tickets"},
		{journey: "JRN-021 list support tickets", method: http.MethodGet, path: "/dsh/support/tickets", pattern: "GET /dsh/support/tickets"},
		{journey: "JRN-021 read support ticket", method: http.MethodGet, path: "/dsh/support/tickets/ticket-1", pattern: "GET /dsh/support/tickets/{ticketId}"},
		{journey: "JRN-021 read support messages", method: http.MethodGet, path: "/dsh/support/tickets/ticket-1/messages", pattern: "GET /dsh/support/tickets/{ticketId}/messages"},
		{journey: "JRN-021 add support message", method: http.MethodPost, path: "/dsh/support/tickets/ticket-1/messages", pattern: "POST /dsh/support/tickets/{ticketId}/messages"},

		// JRN-022 — Awnak and SHEIN special requests.
		{journey: "JRN-022 create special request", method: http.MethodPost, path: "/dsh/client/special-requests", pattern: "POST /dsh/client/special-requests"},
		{journey: "JRN-022 read special request", method: http.MethodGet, path: "/dsh/client/special-requests/request-1", pattern: "GET /dsh/client/special-requests/{requestId}"},
		{journey: "JRN-022 cancel special request", method: http.MethodPost, path: "/dsh/client/special-requests/request-1/cancel", pattern: "POST /dsh/client/special-requests/{requestId}/cancel"},
		{journey: "JRN-022 approve quote", method: http.MethodPost, path: "/dsh/client/special-requests/request-1/approve-quote", pattern: "POST /dsh/client/special-requests/{requestId}/approve-quote"},
		{journey: "JRN-022 operator update", method: http.MethodPatch, path: "/dsh/operator/special-requests/request-1", pattern: "PATCH /dsh/operator/special-requests/{requestId}"},
		{journey: "JRN-022 dispatch assignment", method: http.MethodPost, path: "/dsh/operator/special-requests/request-1/dispatch", pattern: "POST /dsh/operator/special-requests/{requestId}/dispatch"},

		// JRN-023 — unified actor notifications.
		{journey: "JRN-023 list notifications", method: http.MethodGet, path: "/dsh/notifications", pattern: "GET /dsh/notifications"},
		{journey: "JRN-023 read preferences", method: http.MethodGet, path: "/dsh/notifications/preferences", pattern: "GET /dsh/notifications/preferences"},
		{journey: "JRN-023 update preferences", method: http.MethodPut, path: "/dsh/notifications/preferences", pattern: "PUT /dsh/notifications/preferences"},
		{journey: "JRN-023 mark all read", method: http.MethodPost, path: "/dsh/notifications/read-all", pattern: "POST /dsh/notifications/read-all"},
		{journey: "JRN-023 mark one read", method: http.MethodPost, path: "/dsh/notifications/notif-1/read", pattern: "POST /dsh/notifications/{notificationId}/read"},
		{journey: "JRN-023 operator config read", method: http.MethodGet, path: "/dsh/operator/notifications/config", pattern: "GET /dsh/operator/notifications/config"},
		{journey: "JRN-023 operator config write", method: http.MethodPut, path: "/dsh/operator/notifications/config", pattern: "PUT /dsh/operator/notifications/config"},

		// JRN-024 — field visits and readiness.
		{journey: "JRN-024 create visit", method: http.MethodPost, path: "/dsh/field/stores/store-1/visits", pattern: "POST /dsh/field/stores/{storeId}/visits"},
		{journey: "JRN-024 list visits", method: http.MethodGet, path: "/dsh/field/stores/store-1/visits", pattern: "GET /dsh/field/stores/{storeId}/visits"},
		{journey: "JRN-024 work queue", method: http.MethodGet, path: "/dsh/field/work-queue", pattern: "GET /dsh/field/work-queue"},
		{journey: "JRN-024 complete visit", method: http.MethodPost, path: "/dsh/field/visits/visit-1/complete", pattern: "POST /dsh/field/visits/{visitId}/complete"},
		{journey: "JRN-024 write check", method: http.MethodPut, path: "/dsh/field/visits/visit-1/checks", pattern: "PUT /dsh/field/visits/{visitId}/checks"},
		{journey: "JRN-024 read checks", method: http.MethodGet, path: "/dsh/field/visits/visit-1/checks", pattern: "GET /dsh/field/visits/{visitId}/checks"},
		{journey: "JRN-024 create escalation", method: http.MethodPost, path: "/dsh/field/stores/store-1/escalations", pattern: "POST /dsh/field/stores/{storeId}/escalations"},
		{journey: "JRN-024 operator escalation queue", method: http.MethodGet, path: "/dsh/operator/field-readiness/escalations", pattern: "GET /dsh/operator/field-readiness/escalations"},
		{journey: "JRN-024 resolve escalation", method: http.MethodPatch, path: "/dsh/operator/field-readiness/escalations/escalation-1", pattern: "PATCH /dsh/operator/field-readiness/escalations/{escalationId}"},
		{journey: "JRN-024 partner onboarding status", method: http.MethodGet, path: "/dsh/partner/stores/store-1/onboarding-status", pattern: "GET /dsh/partner/stores/{storeId}/onboarding-status"},

		// JRN-025 — campaigns, tickers, and partner offers.
		{journey: "JRN-025 list campaigns", method: http.MethodGet, path: "/dsh/operator/marketing/campaigns", pattern: "GET /dsh/operator/marketing/campaigns"},
		{journey: "JRN-025 create campaign", method: http.MethodPost, path: "/dsh/operator/marketing/campaigns", pattern: "POST /dsh/operator/marketing/campaigns"},
		{journey: "JRN-025 update campaign", method: http.MethodPatch, path: "/dsh/operator/marketing/campaigns/campaign-1", pattern: "PATCH /dsh/operator/marketing/campaigns/{campaignId}"},
		{journey: "JRN-025 archive campaign", method: http.MethodDelete, path: "/dsh/operator/marketing/campaigns/campaign-1", pattern: "DELETE /dsh/operator/marketing/campaigns/{campaignId}"},
		{journey: "JRN-025 list tickers", method: http.MethodGet, path: "/dsh/operator/marketing/tickers", pattern: "GET /dsh/operator/marketing/tickers"},
		{journey: "JRN-025 create ticker", method: http.MethodPost, path: "/dsh/operator/marketing/tickers", pattern: "POST /dsh/operator/marketing/tickers"},
		{journey: "JRN-025 update ticker", method: http.MethodPatch, path: "/dsh/operator/marketing/tickers/ticker-1", pattern: "PATCH /dsh/operator/marketing/tickers/{tickerId}"},
		{journey: "JRN-025 archive ticker", method: http.MethodDelete, path: "/dsh/operator/marketing/tickers/ticker-1", pattern: "DELETE /dsh/operator/marketing/tickers/{tickerId}"},
		{journey: "JRN-025 operator partner offers", method: http.MethodGet, path: "/dsh/operator/marketing/partner-offers", pattern: "GET /dsh/operator/marketing/partner-offers"},
		{journey: "JRN-025 review partner offer", method: http.MethodPatch, path: "/dsh/operator/marketing/partner-offers/offer-1", pattern: "PATCH /dsh/operator/marketing/partner-offers/{offerId}"},
		{journey: "JRN-025 partner self offers", method: http.MethodGet, path: "/dsh/partner/marketing/offers", pattern: "GET /dsh/partner/marketing/offers"},
		{journey: "JRN-025 submit partner offer", method: http.MethodPost, path: "/dsh/partner/marketing/offers", pattern: "POST /dsh/partner/marketing/offers"},
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
