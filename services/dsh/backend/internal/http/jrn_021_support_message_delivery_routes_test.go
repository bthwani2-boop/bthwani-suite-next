package http

import (
	"net/http"
	"testing"
)

func TestJRN021SupportMessageDeliveryRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterSupportMessageDeliveryRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{
			name:    "actor attaches media",
			method:  http.MethodPost,
			path:    "/dsh/support/tickets/ticket-1/messages/message-1/attachments",
			pattern: "POST /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments",
		},
		{
			name:    "actor lists media",
			method:  http.MethodGet,
			path:    "/dsh/support/tickets/ticket-1/messages/message-1/attachments",
			pattern: "GET /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments",
		},
		{
			name:    "actor marks messages read",
			method:  http.MethodPost,
			path:    "/dsh/support/tickets/ticket-1/messages/read",
			pattern: "POST /dsh/support/tickets/{ticketId}/messages/read",
		},
		{
			name:    "operator attaches media",
			method:  http.MethodPost,
			path:    "/dsh/operator/support/tickets/ticket-1/messages/message-1/attachments",
			pattern: "POST /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments",
		},
		{
			name:    "operator lists media",
			method:  http.MethodGet,
			path:    "/dsh/operator/support/tickets/ticket-1/messages/message-1/attachments",
			pattern: "GET /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments",
		},
		{
			name:    "operator marks messages read",
			method:  http.MethodPost,
			path:    "/dsh/operator/support/tickets/ticket-1/messages/read",
			pattern: "POST /dsh/operator/support/tickets/{ticketId}/messages/read",
		},
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
