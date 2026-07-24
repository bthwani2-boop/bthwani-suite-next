package http

import (
	"net/http"
	"testing"
)

func TestJRN025MarketingRoutesAreRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodGet, "/dsh/operator/marketing/campaigns", "GET /dsh/operator/marketing/campaigns"},
		{http.MethodPost, "/dsh/operator/marketing/campaigns", "POST /dsh/operator/marketing/campaigns"},
		{http.MethodGet, "/dsh/operator/marketing/campaigns/campaign-1", "GET /dsh/operator/marketing/campaigns/{campaignId}"},
		{http.MethodPatch, "/dsh/operator/marketing/campaigns/campaign-1", "PATCH /dsh/operator/marketing/campaigns/{campaignId}"},
		{http.MethodDelete, "/dsh/operator/marketing/campaigns/campaign-1", "DELETE /dsh/operator/marketing/campaigns/{campaignId}"},
		{http.MethodGet, "/dsh/operator/marketing/tickers", "GET /dsh/operator/marketing/tickers"},
		{http.MethodPost, "/dsh/operator/marketing/tickers", "POST /dsh/operator/marketing/tickers"},
		{http.MethodPatch, "/dsh/operator/marketing/tickers/ticker-1", "PATCH /dsh/operator/marketing/tickers/{tickerId}"},
		{http.MethodDelete, "/dsh/operator/marketing/tickers/ticker-1", "DELETE /dsh/operator/marketing/tickers/{tickerId}"},
		{http.MethodGet, "/dsh/operator/marketing/partner-offers", "GET /dsh/operator/marketing/partner-offers"},
		{http.MethodPatch, "/dsh/operator/marketing/partner-offers/offer-1", "PATCH /dsh/operator/marketing/partner-offers/{offerId}"},
		{http.MethodDelete, "/dsh/operator/marketing/partner-offers/offer-1", "DELETE /dsh/operator/marketing/partner-offers/{offerId}"},
		{http.MethodGet, "/dsh/partner/marketing/offers", "GET /dsh/partner/marketing/offers"},
		{http.MethodPost, "/dsh/partner/marketing/offers", "POST /dsh/partner/marketing/offers"},
		{http.MethodGet, "/dsh/home-discovery", "GET /dsh/home-discovery"},
		{http.MethodPost, "/dsh/home-discovery/events", "POST /dsh/home-discovery/events"},
	}

	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
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
