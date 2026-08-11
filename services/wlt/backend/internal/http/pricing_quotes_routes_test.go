package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func pricingQuoteRequest(t *testing.T, body string) *http.Request {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	req := httptest.NewRequest(http.MethodPost, "/wlt/internal/quotes/calculate", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Operator-Context-ID", "pricing-quote-context")
	req.Header.Set("Content-Type", "application/json")
	return req
}

const pricingQuoteBody = `{"clientId":"client-1","storeId":"store-1","currency":"YER",` +
	`"deliveryFeeInputMinorUnits":50000,"serviceFeeInputMinorUnits":0,"cartVersion":1,` +
	`"lines":[{"masterProductId":"product-1","productName":"Rice","quantity":2,"unitPriceMinorUnits":125000}]}`

// DSH already called this exact path for cart pricing while nothing registered
// it, so every quote request answered 404 and checkout lost the sovereign
// quote without any gate noticing.
func TestPricingQuoteRouteIsRegisteredAndPrices(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, pricingQuoteRequest(t, pricingQuoteBody))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Quote struct {
			SubtotalMinorUnits int64  `json:"subtotalMinorUnits"`
			TotalMinorUnits    int64  `json:"totalMinorUnits"`
			Hash               string `json:"hash"`
		} `json:"quote"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode quote: %v", err)
	}
	if response.Quote.SubtotalMinorUnits != 250000 || response.Quote.TotalMinorUnits != 300000 {
		t.Fatalf("unexpected quote money: %+v", response.Quote)
	}
	if response.Quote.Hash == "" {
		t.Fatal("quote must be hashed")
	}
}

func TestPricingQuoteRouteRejectsUnpriceableRequests(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	for name, body := range map[string]string{
		"malformed json":  `{`,
		"unknown field":   strings.Replace(pricingQuoteBody, `"cartVersion":1`, `"totalMinorUnits":1`, 1),
		"negative price":  strings.Replace(pricingQuoteBody, `"unitPriceMinorUnits":125000`, `"unitPriceMinorUnits":-125000`, 1),
		"zero quantity":   strings.Replace(pricingQuoteBody, `"quantity":2`, `"quantity":0`, 1),
		"missing lines":   `{"clientId":"client-1","storeId":"store-1","currency":"YER","lines":[]}`,
		"bad currency":    strings.Replace(pricingQuoteBody, `"currency":"YER"`, `"currency":"yer"`, 1),
	} {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, pricingQuoteRequest(t, body))
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("%s: expected 400, got %d: %s", name, rec.Code, rec.Body.String())
		}
	}
}

func TestPricingQuoteRouteRequiresServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	router := NewRouter(nil, true, openDecisionService{})
	req := httptest.NewRequest(http.MethodPost, "/wlt/internal/quotes/calculate", strings.NewReader(pricingQuoteBody))
	req.Header.Set("X-Operator-Context-ID", "pricing-quote-context")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without service auth, got %d: %s", rec.Code, rec.Body.String())
	}
}
