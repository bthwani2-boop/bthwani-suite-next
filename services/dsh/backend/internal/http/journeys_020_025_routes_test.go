package http

import (
	"net/http"
	"testing"
)

func TestJourneys020To025ExposeGovernedRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	RegisterActorNotificationRoutes(router, nil, nil, nil, nil)
	RegisterFieldReadinessRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		//  — delivery exceptions and return custody.
		{journey: " report exception", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/asg-1/exceptions", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions"},
		{journey: " read captain exception", method: http.MethodGet, path: "/dsh/captain/dispatch/assignments/asg-1/exceptions", pattern: "GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions"},
		{journey: " operator exception queue", method: http.MethodGet, path: "/dsh/operator/delivery-exceptions", pattern: "GET /dsh/operator/delivery-exceptions"},
		{journey: " acknowledge exception", method: http.MethodPost, path: "/dsh/operator/delivery-exceptions/ex-1/acknowledge", pattern: "POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge"},
		{journey: " resolve exception", method: http.MethodPost, path: "/dsh/operator/delivery-exceptions/ex-1/resolve", pattern: "POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve"},
		{journey: " captain return arrival", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/asg-1/return-to-store/arrive", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive"},
		{journey: " partner return read", method: http.MethodGet, path: "/dsh/partner/orders/order-1/return-to-store", pattern: "GET /dsh/partner/orders/{orderId}/return-to-store"},
		{journey: " partner return accept", method: http.MethodPost, path: "/dsh/partner/orders/order-1/return-to-store/accept", pattern: "POST /dsh/partner/orders/{orderId}/return-to-store/accept"},

		//  — actor support conversation and order rescue.
		{journey: " create support ticket", method: http.MethodPost, path: "/dsh/support/tickets", pattern: "POST /dsh/support/tickets"},
		{journey: " list support tickets", method: http.MethodGet, path: "/dsh/support/tickets", pattern: "GET /dsh/support/tickets"},
		{journey: " read support ticket", method: http.MethodGet, path: "/dsh/support/tickets/ticket-1", pattern: "GET /dsh/support/tickets/{ticketId}"},
		{journey: " read support messages", method: http.MethodGet, path: "/dsh/support/tickets/ticket-1/messages", pattern: "GET /dsh/support/tickets/{ticketId}/messages"},
		{journey: " add support message", method: http.MethodPost, path: "/dsh/support/tickets/ticket-1/messages", pattern: "POST /dsh/support/tickets/{ticketId}/messages"},

		//  — Awnak and SHEIN special requests.
		{journey: " create special request", method: http.MethodPost, path: "/dsh/client/special-requests", pattern: "POST /dsh/client/special-requests"},
		{journey: " read special request", method: http.MethodGet, path: "/dsh/client/special-requests/request-1", pattern: "GET /dsh/client/special-requests/{requestId}"},
		{journey: " cancel special request", method: http.MethodPost, path: "/dsh/client/special-requests/request-1/cancel", pattern: "POST /dsh/client/special-requests/{requestId}/cancel"},
		{journey: " approve quote", method: http.MethodPost, path: "/dsh/client/special-requests/request-1/approve-quote", pattern: "POST /dsh/client/special-requests/{requestId}/approve-quote"},
		{journey: " operator update", method: http.MethodPatch, path: "/dsh/operator/special-requests/request-1", pattern: "PATCH /dsh/operator/special-requests/{requestId}"},
		{journey: " dispatch assignment", method: http.MethodPost, path: "/dsh/operator/special-requests/request-1/dispatch", pattern: "POST /dsh/operator/special-requests/{requestId}/dispatch"},

		//  — unified actor notifications.
		{journey: " list notifications", method: http.MethodGet, path: "/dsh/notifications", pattern: "GET /dsh/notifications"},
		{journey: " read preferences", method: http.MethodGet, path: "/dsh/notifications/preferences", pattern: "GET /dsh/notifications/preferences"},
		{journey: " update preferences", method: http.MethodPut, path: "/dsh/notifications/preferences", pattern: "PUT /dsh/notifications/preferences"},
		{journey: " mark all read", method: http.MethodPost, path: "/dsh/notifications/read-all", pattern: "POST /dsh/notifications/read-all"},
		{journey: " mark one read", method: http.MethodPost, path: "/dsh/notifications/notif-1/read", pattern: "POST /dsh/notifications/{notificationId}/read"},
		{journey: " operator config read", method: http.MethodGet, path: "/dsh/operator/notifications/config", pattern: "GET /dsh/operator/notifications/config"},
		{journey: " operator config write", method: http.MethodPut, path: "/dsh/operator/notifications/config", pattern: "PUT /dsh/operator/notifications/config"},

		//  — field visits and readiness.
		{journey: " create visit", method: http.MethodPost, path: "/dsh/field/stores/store-1/visits", pattern: "POST /dsh/field/stores/{storeId}/visits"},
		{journey: " list visits", method: http.MethodGet, path: "/dsh/field/stores/store-1/visits", pattern: "GET /dsh/field/stores/{storeId}/visits"},
		{journey: " work queue", method: http.MethodGet, path: "/dsh/field/work-queue", pattern: "GET /dsh/field/work-queue"},
		{journey: " complete visit", method: http.MethodPost, path: "/dsh/field/visits/visit-1/complete", pattern: "POST /dsh/field/visits/{visitId}/complete"},
		{journey: " write check", method: http.MethodPut, path: "/dsh/field/visits/visit-1/checks", pattern: "PUT /dsh/field/visits/{visitId}/checks"},
		{journey: " read checks", method: http.MethodGet, path: "/dsh/field/visits/visit-1/checks", pattern: "GET /dsh/field/visits/{visitId}/checks"},
		{journey: " create escalation", method: http.MethodPost, path: "/dsh/field/stores/store-1/escalations", pattern: "POST /dsh/field/stores/{storeId}/escalations"},
		{journey: " operator escalation queue", method: http.MethodGet, path: "/dsh/operator/field-readiness/escalations", pattern: "GET /dsh/operator/field-readiness/escalations"},
		{journey: " resolve escalation", method: http.MethodPatch, path: "/dsh/operator/field-readiness/escalations/escalation-1", pattern: "PATCH /dsh/operator/field-readiness/escalations/{escalationId}"},
		{journey: " partner onboarding status", method: http.MethodGet, path: "/dsh/partner/stores/store-1/onboarding-status", pattern: "GET /dsh/partner/stores/{storeId}/onboarding-status"},

		//  — campaigns, tickers, and partner offers.
		{journey: " list campaigns", method: http.MethodGet, path: "/dsh/operator/marketing/campaigns", pattern: "GET /dsh/operator/marketing/campaigns"},
		{journey: " create campaign", method: http.MethodPost, path: "/dsh/operator/marketing/campaigns", pattern: "POST /dsh/operator/marketing/campaigns"},
		{journey: " update campaign", method: http.MethodPatch, path: "/dsh/operator/marketing/campaigns/campaign-1", pattern: "PATCH /dsh/operator/marketing/campaigns/{campaignId}"},
		{journey: " archive campaign", method: http.MethodDelete, path: "/dsh/operator/marketing/campaigns/campaign-1", pattern: "DELETE /dsh/operator/marketing/campaigns/{campaignId}"},
		{journey: " list tickers", method: http.MethodGet, path: "/dsh/operator/marketing/tickers", pattern: "GET /dsh/operator/marketing/tickers"},
		{journey: " create ticker", method: http.MethodPost, path: "/dsh/operator/marketing/tickers", pattern: "POST /dsh/operator/marketing/tickers"},
		{journey: " update ticker", method: http.MethodPatch, path: "/dsh/operator/marketing/tickers/ticker-1", pattern: "PATCH /dsh/operator/marketing/tickers/{tickerId}"},
		{journey: " archive ticker", method: http.MethodDelete, path: "/dsh/operator/marketing/tickers/ticker-1", pattern: "DELETE /dsh/operator/marketing/tickers/{tickerId}"},
		{journey: " operator partner offers", method: http.MethodGet, path: "/dsh/operator/marketing/partner-offers", pattern: "GET /dsh/operator/marketing/partner-offers"},
		{journey: " review partner offer", method: http.MethodPatch, path: "/dsh/operator/marketing/partner-offers/offer-1", pattern: "PATCH /dsh/operator/marketing/partner-offers/{offerId}"},
		{journey: " partner self offers", method: http.MethodGet, path: "/dsh/partner/marketing/offers", pattern: "GET /dsh/partner/marketing/offers"},
		{journey: " submit partner offer", method: http.MethodPost, path: "/dsh/partner/marketing/offers", pattern: "POST /dsh/partner/marketing/offers"},
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
