package http

import (
	"net/http"
	"testing"
)

func TestPartnerSelfRoutesRegisterOnceOnApplicationRouter(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPartnerSelfRoutes(router, nil, nil, nil, nil)

	request, err := http.NewRequest(http.MethodGet, "/dsh/partner/order-workboard", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, pattern := router.Handler(request)
	if pattern != "GET /dsh/partner/order-workboard" {
		t.Fatal("partner order workboard route is not registered")
	}
}
