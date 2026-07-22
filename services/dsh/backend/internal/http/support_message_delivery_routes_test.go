package http

import (
	"net/http"
	"testing"
)

func TestSupportMessageDeliveryRoutesExposeActorAndOperatorBoundaries(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterSupportMessageDeliveryRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodPost, "/dsh/support/tickets/t-1/messages/m-1/attachments", "POST /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments"},
		{http.MethodGet, "/dsh/support/tickets/t-1/messages/m-1/attachments", "GET /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments"},
		{http.MethodPost, "/dsh/support/tickets/t-1/messages/read", "POST /dsh/support/tickets/{ticketId}/messages/read"},
		{http.MethodPost, "/dsh/operator/support/tickets/t-1/messages/m-1/attachments", "POST /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments"},
		{http.MethodGet, "/dsh/operator/support/tickets/t-1/messages/m-1/attachments", "GET /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments"},
		{http.MethodPost, "/dsh/operator/support/tickets/t-1/messages/read", "POST /dsh/operator/support/tickets/{ticketId}/messages/read"},
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
