package pricing

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type QuoteInputLine struct {
	MasterProductID     string `json:"masterProductId"`
	ProductName         string `json:"productName"`
	Quantity            int    `json:"quantity"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
}

type CalculateQuoteRequest struct {
	ClientID                   string           `json:"clientId"`
	StoreID                    string           `json:"storeId"`
	Currency                   string           `json:"currency"`
	DeliveryFeeInputMinorUnits int64            `json:"deliveryFeeInputMinorUnits"`
	ServiceFeeInputMinorUnits  int64            `json:"serviceFeeInputMinorUnits"`
	CartVersion                int              `json:"cartVersion"`
	Lines                      []QuoteInputLine `json:"lines"`
}

type QuoteOutputLine struct {
	MasterProductID     string `json:"masterProductId"`
	ProductName         string `json:"productName"`
	Quantity            int    `json:"quantity"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
	TotalMinorUnits     int64  `json:"totalMinorUnits"`
}

type WltPricingQuote struct {
	Lines                 []QuoteOutputLine `json:"lines"`
	SubtotalMinorUnits    int64             `json:"subtotalMinorUnits"`
	DeliveryFeeMinorUnits int64             `json:"deliveryFeeMinorUnits"`
	ServiceFeeMinorUnits  int64             `json:"serviceFeeMinorUnits"`
	TaxMinorUnits         int64             `json:"taxMinorUnits"`
	DiscountMinorUnits    int64             `json:"discountMinorUnits"`
	RoundingMinorUnits    int64             `json:"roundingMinorUnits"`
	TotalMinorUnits       int64             `json:"totalMinorUnits"`
	Currency              string            `json:"currency"`
	FundingRefs           []string          `json:"fundingRefs"`
	Hash                  string            `json:"hash"`
	Version               int               `json:"version"`
	ExpiresAt             *time.Time        `json:"expiresAt"`
}

type PricingQuoteResponse struct {
	Quote WltPricingQuote `json:"quote"`
}

// WLT is the only owner of cart money, so every figure a quote is built from is
// bounded here rather than trusted from the operational caller. Without these
// bounds a negative unit price, a zero or negative quantity, or a quantity large
// enough to overflow int64 produced a signed, hashed quote that looked
// authoritative and that checkout would have charged against.
const (
	// MaxQuoteAmountMinorUnits caps every individual money figure and the total.
	// It is far above any real cart and far below the int64 range, so no
	// accepted combination of bounded inputs can overflow.
	MaxQuoteAmountMinorUnits = int64(1_000_000_000_000)
	MaxQuoteLines            = 500
	MaxQuoteLineQuantity     = 10_000
)

func validateQuoteRequest(req CalculateQuoteRequest) error {
	if strings.TrimSpace(req.ClientID) == "" {
		return fmt.Errorf("clientId is required")
	}
	if strings.TrimSpace(req.StoreID) == "" {
		return fmt.Errorf("storeId is required")
	}
	if len(req.Currency) != 3 {
		return fmt.Errorf("currency must be a three-letter code")
	}
	for _, r := range req.Currency {
		if r < 'A' || r > 'Z' {
			return fmt.Errorf("currency must be a three-letter uppercase code")
		}
	}
	if len(req.Lines) == 0 {
		return fmt.Errorf("quote must have at least one line")
	}
	if len(req.Lines) > MaxQuoteLines {
		return fmt.Errorf("quote cannot exceed %d lines", MaxQuoteLines)
	}
	if req.CartVersion < 0 {
		return fmt.Errorf("cartVersion cannot be negative")
	}
	for _, fee := range []struct {
		name  string
		value int64
	}{
		{"deliveryFeeInputMinorUnits", req.DeliveryFeeInputMinorUnits},
		{"serviceFeeInputMinorUnits", req.ServiceFeeInputMinorUnits},
	} {
		if fee.value < 0 {
			return fmt.Errorf("%s cannot be negative", fee.name)
		}
		if fee.value > MaxQuoteAmountMinorUnits {
			return fmt.Errorf("%s exceeds the maximum quotable amount", fee.name)
		}
	}
	for index, line := range req.Lines {
		if strings.TrimSpace(line.MasterProductID) == "" {
			return fmt.Errorf("line %d requires masterProductId", index)
		}
		if line.Quantity < 1 {
			return fmt.Errorf("line %d quantity must be at least 1", index)
		}
		if line.Quantity > MaxQuoteLineQuantity {
			return fmt.Errorf("line %d quantity exceeds %d", index, MaxQuoteLineQuantity)
		}
		if line.UnitPriceMinorUnits < 0 {
			return fmt.Errorf("line %d unitPriceMinorUnits cannot be negative", index)
		}
		if line.UnitPriceMinorUnits > MaxQuoteAmountMinorUnits {
			return fmt.Errorf("line %d unitPriceMinorUnits exceeds the maximum quotable amount", index)
		}
	}
	return nil
}

func CalculateQuote(req CalculateQuoteRequest) (*WltPricingQuote, error) {
	if err := validateQuoteRequest(req); err != nil {
		return nil, err
	}

	quote := &WltPricingQuote{
		Lines:                 make([]QuoteOutputLine, 0, len(req.Lines)),
		Currency:              req.Currency,
		FundingRefs:           []string{},
		Version:               req.CartVersion,
		DeliveryFeeMinorUnits: req.DeliveryFeeInputMinorUnits,
		ServiceFeeMinorUnits:  req.ServiceFeeInputMinorUnits,
	}

	for index, line := range req.Lines {
		lineTotal := line.UnitPriceMinorUnits * int64(line.Quantity)
		if lineTotal > MaxQuoteAmountMinorUnits {
			return nil, fmt.Errorf("line %d total exceeds the maximum quotable amount", index)
		}
		quote.Lines = append(quote.Lines, QuoteOutputLine{
			MasterProductID:     line.MasterProductID,
			ProductName:         line.ProductName,
			Quantity:            line.Quantity,
			UnitPriceMinorUnits: line.UnitPriceMinorUnits,
			TotalMinorUnits:     lineTotal,
		})
		quote.SubtotalMinorUnits += lineTotal
		if quote.SubtotalMinorUnits > MaxQuoteAmountMinorUnits {
			return nil, fmt.Errorf("quote subtotal exceeds the maximum quotable amount")
		}
	}

	quote.TaxMinorUnits = 0
	quote.DiscountMinorUnits = 0
	quote.RoundingMinorUnits = 0

	quote.TotalMinorUnits = quote.SubtotalMinorUnits + quote.DeliveryFeeMinorUnits + quote.ServiceFeeMinorUnits + quote.TaxMinorUnits - quote.DiscountMinorUnits + quote.RoundingMinorUnits
	if quote.TotalMinorUnits > MaxQuoteAmountMinorUnits {
		return nil, fmt.Errorf("quote total exceeds the maximum quotable amount")
	}

	// The hash is taken before ExpiresAt is stamped, so the same inputs always
	// hash the same way and the value identifies the money, not the moment.
	encoded, err := json.Marshal(quote)
	if err != nil {
		return nil, fmt.Errorf("hash quote: %w", err)
	}
	h := sha256.Sum256(encoded)
	quote.Hash = hex.EncodeToString(h[:])

	expiresAt := time.Now().Add(15 * time.Minute)
	quote.ExpiresAt = &expiresAt

	return quote, nil
}
