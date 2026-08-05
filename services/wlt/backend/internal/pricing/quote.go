package pricing

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
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

func CalculateQuote(req CalculateQuoteRequest) (*WltPricingQuote, error) {
	if len(req.Lines) == 0 {
		return nil, fmt.Errorf("quote must have at least one line")
	}

	quote := &WltPricingQuote{
		Lines:                 make([]QuoteOutputLine, 0, len(req.Lines)),
		Currency:              req.Currency,
		FundingRefs:           []string{},
		Version:               req.CartVersion,
		DeliveryFeeMinorUnits: req.DeliveryFeeInputMinorUnits,
		ServiceFeeMinorUnits:  req.ServiceFeeInputMinorUnits,
	}

	for _, line := range req.Lines {
		lineTotal := line.UnitPriceMinorUnits * int64(line.Quantity)
		quote.Lines = append(quote.Lines, QuoteOutputLine{
			MasterProductID:     line.MasterProductID,
			ProductName:         line.ProductName,
			Quantity:            line.Quantity,
			UnitPriceMinorUnits: line.UnitPriceMinorUnits,
			TotalMinorUnits:     lineTotal,
		})
		quote.SubtotalMinorUnits += lineTotal
	}

	quote.TaxMinorUnits = 0
	quote.DiscountMinorUnits = 0
	quote.RoundingMinorUnits = 0

	quote.TotalMinorUnits = quote.SubtotalMinorUnits + quote.DeliveryFeeMinorUnits + quote.ServiceFeeMinorUnits + quote.TaxMinorUnits - quote.DiscountMinorUnits + quote.RoundingMinorUnits

	b, _ := json.Marshal(quote)
	h := sha256.Sum256(b)
	quote.Hash = hex.EncodeToString(h[:])

	expiresAt := time.Now().Add(15 * time.Minute)
	quote.ExpiresAt = &expiresAt

	return quote, nil
}
