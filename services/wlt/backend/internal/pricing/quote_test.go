package pricing

import "testing"

func validQuoteRequest() CalculateQuoteRequest {
	return CalculateQuoteRequest{
		ClientID:                   "client-1",
		StoreID:                    "store-1",
		Currency:                   "YER",
		DeliveryFeeInputMinorUnits: 50000,
		ServiceFeeInputMinorUnits:  1000,
		CartVersion:                3,
		Lines: []QuoteInputLine{
			{MasterProductID: "product-1", ProductName: "Rice", Quantity: 2, UnitPriceMinorUnits: 125000},
			{MasterProductID: "product-2", ProductName: "Oil", Quantity: 1, UnitPriceMinorUnits: 300000},
		},
	}
}

func TestCalculateQuoteSumsExactMinorUnits(t *testing.T) {
	quote, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatalf("calculate quote: %v", err)
	}
	if quote.SubtotalMinorUnits != 550000 {
		t.Fatalf("expected subtotal 550000, got %d", quote.SubtotalMinorUnits)
	}
	if quote.TotalMinorUnits != 601000 {
		t.Fatalf("expected total 601000, got %d", quote.TotalMinorUnits)
	}
	if quote.Lines[0].TotalMinorUnits != 250000 {
		t.Fatalf("expected first line total 250000, got %d", quote.Lines[0].TotalMinorUnits)
	}
	if quote.Hash == "" || quote.ExpiresAt == nil {
		t.Fatal("quote must carry a hash and an expiry")
	}
}

// The hash identifies the money, so it must not move with the clock and must
// move with any input that changes an amount.
func TestCalculateQuoteHashIsStableForEqualInputs(t *testing.T) {
	first, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatalf("calculate first quote: %v", err)
	}
	second, err := CalculateQuote(validQuoteRequest())
	if err != nil {
		t.Fatalf("calculate second quote: %v", err)
	}
	if first.Hash != second.Hash {
		t.Fatalf("equal inputs produced different hashes: %s vs %s", first.Hash, second.Hash)
	}

	changed := validQuoteRequest()
	changed.Lines[0].Quantity = 3
	third, err := CalculateQuote(changed)
	if err != nil {
		t.Fatalf("calculate changed quote: %v", err)
	}
	if third.Hash == first.Hash {
		t.Fatal("a different quantity must change the quote hash")
	}
}

func TestCalculateQuoteRejectsUnpriceableInput(t *testing.T) {
	cases := map[string]func(*CalculateQuoteRequest){
		"no client":          func(r *CalculateQuoteRequest) { r.ClientID = "  " },
		"no store":           func(r *CalculateQuoteRequest) { r.StoreID = "" },
		"short currency":     func(r *CalculateQuoteRequest) { r.Currency = "YE" },
		"lowercase currency": func(r *CalculateQuoteRequest) { r.Currency = "yer" },
		"no lines":           func(r *CalculateQuoteRequest) { r.Lines = nil },
		"zero quantity":      func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = 0 },
		"negative quantity":  func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = -2 },
		"huge quantity":      func(r *CalculateQuoteRequest) { r.Lines[0].Quantity = MaxQuoteLineQuantity + 1 },
		"negative price":     func(r *CalculateQuoteRequest) { r.Lines[0].UnitPriceMinorUnits = -1 },
		"negative delivery":  func(r *CalculateQuoteRequest) { r.DeliveryFeeInputMinorUnits = -1 },
		"negative service":   func(r *CalculateQuoteRequest) { r.ServiceFeeInputMinorUnits = -1 },
		"negative version":   func(r *CalculateQuoteRequest) { r.CartVersion = -1 },
		"no product id":      func(r *CalculateQuoteRequest) { r.Lines[0].MasterProductID = " " },
		"unbounded price": func(r *CalculateQuoteRequest) {
			r.Lines[0].UnitPriceMinorUnits = MaxQuoteAmountMinorUnits + 1
		},
		"overflowing line": func(r *CalculateQuoteRequest) {
			r.Lines[0].Quantity = MaxQuoteLineQuantity
			r.Lines[0].UnitPriceMinorUnits = MaxQuoteAmountMinorUnits
		},
	}
	for name, mutate := range cases {
		req := validQuoteRequest()
		mutate(&req)
		if _, err := CalculateQuote(req); err == nil {
			t.Fatalf("%s: expected the quote to be refused", name)
		}
	}
}

func TestCalculateQuoteAllowsFreeLine(t *testing.T) {
	req := validQuoteRequest()
	req.Lines = []QuoteInputLine{{MasterProductID: "gift", Quantity: 1, UnitPriceMinorUnits: 0}}
	req.DeliveryFeeInputMinorUnits = 0
	req.ServiceFeeInputMinorUnits = 0
	quote, err := CalculateQuote(req)
	if err != nil {
		t.Fatalf("a zero-priced line is priceable: %v", err)
	}
	if quote.TotalMinorUnits != 0 {
		t.Fatalf("expected total 0, got %d", quote.TotalMinorUnits)
	}
}
