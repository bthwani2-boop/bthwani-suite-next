package pricing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
)

const pricingTestSecret = "pricing-test-secret"

func signedEvidence(lines []QuoteEvidenceLine, delivery, service int64) PricingEvidence {
	evidence := PricingEvidence{Version: 3, Lines: lines, DeliveryFeeMinorUnits: delivery, ServiceFeeMinorUnits: service}
	unsigned := evidence
	unsigned.Signature = ""
	encoded, _ := json.Marshal(unsigned)
	mac := hmac.New(sha256.New, []byte(pricingTestSecret))
	_, _ = mac.Write(encoded)
	evidence.Signature = hex.EncodeToString(mac.Sum(nil))
	return evidence
}

func validQuoteRequest() CalculateQuoteRequest {
	return CalculateQuoteRequest{
		ClientID: "client-1", StoreID: "store-1", Currency: "YER", CartVersion: 3,
		Lines: []QuoteInputLine{
			{MasterProductID: "product-1", ProductName: "Rice", Quantity: 2},
			{MasterProductID: "product-2", ProductName: "Oil", Quantity: 1},
		},
		PricingEvidence: signedEvidence([]QuoteEvidenceLine{
			{MasterProductID: "product-1", UnitPriceMinorUnits: 125000, Currency: "YER"},
			{MasterProductID: "product-2", UnitPriceMinorUnits: 300000, Currency: "YER"},
		}, 50000, 1000),
	}
}

func TestCalculateQuoteSumsExactMinorUnits(t *testing.T) {
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", pricingTestSecret)
	quote, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatalf("calculate quote: %v", err)
	}
	if quote.SubtotalMinorUnits != 550000 || quote.TotalMinorUnits != 601000 {
		t.Fatalf("unexpected quote totals: %+v", quote)
	}
	if quote.Lines[0].TotalMinorUnits != 250000 {
		t.Fatalf("unexpected first line total: %d", quote.Lines[0].TotalMinorUnits)
	}
	if quote.Hash == "" || quote.ExpiresAt == nil {
		t.Fatal("quote must carry a hash and an expiry")
	}
}

func TestCalculateQuoteHashIsStableForEqualInputs(t *testing.T) {
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", pricingTestSecret)
	first, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatal(err)
	}
	second, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatal(err)
	}
	if first.Hash != second.Hash {
		t.Fatalf("equal inputs produced different hashes")
	}
	changed := validQuoteRequest()
	changed.Lines[0].Quantity = 3
	if third, err := CalculateQuote(changed); err != nil || third.Hash == first.Hash {
		t.Fatal("changed quote did not change hash")
	}
}

func TestCalculateQuoteRejectsUnpriceableInput(t *testing.T) {
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", pricingTestSecret)
	cases := map[string]func(*CalculateQuoteRequest){
		"no client":          func(r *CalculateQuoteRequest) { r.ClientID = "  " },
		"no store":           func(r *CalculateQuoteRequest) { r.StoreID = "" },
		"short currency":     func(r *CalculateQuoteRequest) { r.Currency = "YE" },
		"lowercase currency": func(r *CalculateQuoteRequest) { r.Currency = "yer" },
		"no lines":           func(r *CalculateQuoteRequest) { r.Lines = nil },
		"zero quantity":      func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = 0 },
		"negative quantity":  func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = -2 },
		"huge quantity":      func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = MaxQuoteLineQuantity + 1 },
		"negative price":     func(r *CalculateQuoteRequest) { r.PricingEvidence.Lines[0].UnitPriceMinorUnits = -1 },
		"negative delivery":  func(r *CalculateQuoteRequest) { r.PricingEvidence.DeliveryFeeMinorUnits = -1 },
		"negative service":   func(r *CalculateQuoteRequest) { r.PricingEvidence.ServiceFeeMinorUnits = -1 },
		"negative version":   func(r *CalculateQuoteRequest) { r.CartVersion = -1 },
		"no product id":      func(r *CalculateQuoteRequest) { r.Lines[0].MasterProductID = " " },
		"unbounded price": func(r *CalculateQuoteRequest) {
			r.PricingEvidence.Lines[0].UnitPriceMinorUnits = MaxQuoteAmountMinorUnits + 1
		},
		"overflowing line": func(r *CalculateQuoteRequest) {
			r.Lines[0].Quantity = MaxQuoteLineQuantity
			r.PricingEvidence.Lines[0].UnitPriceMinorUnits = MaxQuoteAmountMinorUnits
		},
	}
	for name, mutate := range cases {
		req := validQuoteRequest()
		mutate(&req)
		if _, err := CalculateQuote(req); err == nil {
			t.Fatalf("%s: expected refusal", name)
		}
	}
}

func TestCalculateQuoteRejectsUnsignedEvidence(t *testing.T) {
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", pricingTestSecret)
	req := validQuoteRequest()
	req.PricingEvidence.Signature = "tampered"
	if _, err := CalculateQuote(req); err == nil {
		t.Fatal("unsigned evidence must be rejected")
	}
}

func TestCalculateQuoteAllowsFreeLine(t *testing.T) {
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", pricingTestSecret)
	req := validQuoteRequest()
	req.Lines = []QuoteInputLine{{MasterProductID: "gift", Quantity: 1}}
	req.PricingEvidence = signedEvidence([]QuoteEvidenceLine{{MasterProductID: "gift", UnitPriceMinorUnits: 0, Currency: "YER"}}, 0, 0)
	quote, err := CalculateQuote(req)
	if err != nil {
		t.Fatalf("free line rejected: %v", err)
	}
	if quote.TotalMinorUnits != 0 {
		t.Fatalf("expected total 0, got %d", quote.TotalMinorUnits)
	}
}
