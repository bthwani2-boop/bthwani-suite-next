package http

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func pricingQuoteRequest(t *testing.T, body string) *http.Request {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", "pricing-route-secret")
	req := httptest.NewRequest(http.MethodPost, "/wlt/internal/quotes/calculate", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Delegated-Operator-Context", "pricing-quote-context")
	req.Header.Set("Content-Type", "application/json")
	return req
}

func pricingQuoteBody() string {
	type evidenceLine struct {
		MasterProductID     string `json:"masterProductId"`
		UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
		Currency            string `json:"currency"`
	}
	type pricingEvidence struct {
		Version               int            `json:"version"`
		Lines                 []evidenceLine `json:"lines"`
		DeliveryFeeMinorUnits int64          `json:"deliveryFeeMinorUnits"`
		ServiceFeeMinorUnits  int64          `json:"serviceFeeMinorUnits"`
		DiscountMinorUnits    int64          `json:"discountMinorUnits"`
		Signature             string         `json:"signature"`
	}
	evidence := pricingEvidence{
		Version:               1,
		Lines:                 []evidenceLine{{MasterProductID: "product-1", UnitPriceMinorUnits: 125000, Currency: "YER"}},
		DeliveryFeeMinorUnits: 50000,
		ServiceFeeMinorUnits:  0,
		DiscountMinorUnits:    0,
		Signature:             "",
	}
	unsigned, _ := json.Marshal(evidence)
	mac := hmac.New(sha256.New, []byte("pricing-route-secret"))
	_, _ = mac.Write(unsigned)
	evidence.Signature = hex.EncodeToString(mac.Sum(nil))
	body, _ := json.Marshal(map[string]any{
		"clientId": "client-1", "storeId": "store-1", "currency": "YER", "cartVersion": 1,
		"lines":           []map[string]any{{"masterProductId": "product-1", "productName": "Rice", "quantity": 2}},
		"pricingEvidence": evidence,
	})
	return string(body)
}

// DSH already called this exact path for cart pricing while nothing registered
// it, so every quote request answered 404 and checkout lost the sovereign
// quote without any gate noticing.
func TestPricingQuoteRouteIsRegisteredAndPrices(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, pricingQuoteRequest(t, pricingQuoteBody()))

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
		"malformed json": `{`,
		"unknown field":  strings.Replace(pricingQuoteBody(), `"cartVersion":1`, `"totalMinorUnits":1`, 1),
		"negative price": strings.Replace(pricingQuoteBody(), `"unitPriceMinorUnits":125000`, `"unitPriceMinorUnits":-125000`, 1),
		"zero quantity":  strings.Replace(pricingQuoteBody(), `"quantity":2`, `"quantity":0`, 1),
		"missing lines":  `{"clientId":"client-1","storeId":"store-1","currency":"YER","lines":[]}`,
		"bad currency":   strings.Replace(pricingQuoteBody(), `"currency":"YER"`, `"currency":"yer"`, 1),
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
	req := httptest.NewRequest(http.MethodPost, "/wlt/internal/quotes/calculate", strings.NewReader(pricingQuoteBody()))
	req.Header.Set("X-Delegated-Operator-Context", "pricing-quote-context")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without service auth, got %d: %s", rec.Code, rec.Body.String())
	}
}
