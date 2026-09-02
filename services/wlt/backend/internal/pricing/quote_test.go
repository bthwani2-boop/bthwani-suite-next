package pricing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"testing"
	"time"
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

func TestCheckoutAllocationDerivesOnlyPositiveTenderComponents(t *testing.T) {
	quote := &WltPricingQuote{
		SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, ServiceFeeMinorUnits: 10,
		TaxMinorUnits: 5, DiscountMinorUnits: 50, TotalMinorUnits: 1065,
	}
	allocation, err := checkoutAllocation(quote)
	if err != nil {
		t.Fatalf("checkout allocation: %v", err)
	}
	if len(allocation) != 5 {
		t.Fatalf("allocation length=%d, want 5: %#v", len(allocation), allocation)
	}
	if allocation[0].Component != AllocationGoodsSubtotal || allocation[0].AmountMinorUnits != 1000 {
		t.Fatalf("goods allocation was not preserved: %#v", allocation[0])
	}
	if allocation[4].Component != AllocationDiscount || allocation[4].AmountMinorUnits != -50 {
		t.Fatalf("discount allocation was not represented as a negative line: %#v", allocation[4])
	}

	quote.RoundingMinorUnits = 1
	if _, err := checkoutAllocation(quote); err == nil {
		t.Fatal("rounding without an explicit allocation component was accepted")
	}
	quote.RoundingMinorUnits = 0
	quote.TotalMinorUnits = 999
	if _, err := checkoutAllocation(quote); err == nil {
		t.Fatal("allocation with a mismatched total was accepted")
	}
}

func TestRequireCheckoutQuoteRequestRequiresScopedImmutableInputs(t *testing.T) {
	valid := CalculateQuoteRequest{CheckoutIntentID: "intent-1", CartSnapshotHash: "snapshot-1", CartVersion: 1}
	if err := requireCheckoutQuoteRequest("context-1", valid); err != nil {
		t.Fatalf("valid checkout quote request rejected: %v", err)
	}
	for _, testCase := range []struct {
		name string
		ctx  string
		req  CalculateQuoteRequest
	}{
		{name: "missing context", ctx: " ", req: valid},
		{name: "missing intent", ctx: "context-1", req: CalculateQuoteRequest{CartSnapshotHash: "snapshot-1", CartVersion: 1}},
		{name: "missing snapshot", ctx: "context-1", req: CalculateQuoteRequest{CheckoutIntentID: "intent-1", CartVersion: 1}},
		{name: "zero cart version", ctx: "context-1", req: CalculateQuoteRequest{CheckoutIntentID: "intent-1", CartSnapshotHash: "snapshot-1"}},
		{name: "negative cart version", ctx: "context-1", req: CalculateQuoteRequest{CheckoutIntentID: "intent-1", CartSnapshotHash: "snapshot-1", CartVersion: -1}},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			if err := requireCheckoutQuoteRequest(testCase.ctx, testCase.req); err == nil {
				t.Fatal("invalid checkout quote request was accepted")
			}
		})
	}
}

func TestScanCheckoutQuoteDecodesCanonicalJSON(t *testing.T) {
	expires := time.Now().UTC().Add(time.Hour)
	linesJSON, _ := json.Marshal([]QuoteOutputLine{{MasterProductID: "product-1", Quantity: 1, UnitPriceMinorUnits: 100, TotalMinorUnits: 100}})
	allocationJSON, _ := json.Marshal([]AllocationLine{{Component: AllocationGoodsSubtotal, AmountMinorUnits: 100}})
	row := fakeCheckoutQuoteScanner{values: []any{"quote-1", "context-1", "intent-1", "client-1", "store-1", "snapshot-1", "hash-1", 1, expires, int64(100), int64(0), int64(0), int64(0), int64(0), int64(0), int64(100), "YER", linesJSON, allocationJSON}}
	quote, err := scanCheckoutQuote(row)
	if err != nil {
		t.Fatalf("scan checkout quote: %v", err)
	}
	if quote.ID != "quote-1" || quote.CartSnapshotHash != "snapshot-1" || quote.WltPricingQuote.CartSnapshotHash != "snapshot-1" || len(quote.Lines) != 1 || len(quote.Allocation) != 1 {
		t.Fatalf("decoded quote lost canonical fields: %#v", quote)
	}

	row.values[17] = []byte("not-json")
	if _, err := scanCheckoutQuote(row); err == nil {
		t.Fatal("invalid quote lines JSON was accepted")
	}
}

type fakeCheckoutQuoteScanner struct{ values []any }

func (s fakeCheckoutQuoteScanner) Scan(dest ...any) error {
	for index := range dest {
		switch target := dest[index].(type) {
		case *string:
			*target = s.values[index].(string)
		case *int:
			*target = s.values[index].(int)
		case *int64:
			*target = s.values[index].(int64)
		case **time.Time:
			value := s.values[index].(time.Time)
			*target = &value
		case *[]byte:
			*target = s.values[index].([]byte)
		default:
			return fmt.Errorf("unsupported scanner target %T", dest[index])
		}
	}
	return nil
}
