package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ──────────────────────────────────────────────────────────────────────────────
// Pricing Quote types mirrored from WLT's internal/pricing/quote.go
// DSH must not own or recompute these; it only passes operational inputs.
// ──────────────────────────────────────────────────────────────────────────────

// QuotePricingInputLine is the per-product line DSH sends to WLT.
type QuotePricingInputLine struct {
	MasterProductID     string `json:"masterProductId"`
	ProductName         string `json:"productName"`
	Quantity            int    `json:"quantity"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
}

// CalculatePricingQuoteRequest is the operational payload DSH sends to WLT.
type CalculatePricingQuoteRequest struct {
	ClientID                   string                  `json:"clientId"`
	StoreID                    string                  `json:"storeId"`
	Currency                   string                  `json:"currency"`
	DeliveryFeeInputMinorUnits int64                   `json:"deliveryFeeInputMinorUnits"`
	ServiceFeeInputMinorUnits  int64                   `json:"serviceFeeInputMinorUnits"`
	CartVersion                int                     `json:"cartVersion"`
	Lines                      []QuotePricingInputLine `json:"lines"`
}

// QuotePricingOutputLine is the per-product line WLT returns with its computed totals.
type QuotePricingOutputLine struct {
	MasterProductID     string `json:"masterProductId"`
	ProductName         string `json:"productName"`
	Quantity            int    `json:"quantity"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
	TotalMinorUnits     int64  `json:"totalMinorUnits"`
}

// WltPricingQuote is the authoritative financial quote owned by WLT.
// DSH attaches this directly to the Cart response — no re-computation allowed.
type WltPricingQuote struct {
	Lines                 []QuotePricingOutputLine `json:"lines"`
	SubtotalMinorUnits    int64                    `json:"subtotalMinorUnits"`
	DeliveryFeeMinorUnits int64                    `json:"deliveryFeeMinorUnits"`
	ServiceFeeMinorUnits  int64                    `json:"serviceFeeMinorUnits"`
	TaxMinorUnits         int64                    `json:"taxMinorUnits"`
	DiscountMinorUnits    int64                    `json:"discountMinorUnits"`
	RoundingMinorUnits    int64                    `json:"roundingMinorUnits"`
	TotalMinorUnits       int64                    `json:"totalMinorUnits"`
	Currency              string                   `json:"currency"`
	FundingRefs           []string                 `json:"fundingRefs"`
	Hash                  string                   `json:"hash"`
	Version               int                      `json:"version"`
	ExpiresAt             *time.Time               `json:"expiresAt"`
}

// CalculateQuote calls the WLT sovereign pricing engine and returns the
// authoritative WltPricingQuote. DSH must use this result as-is — never
// modify, re-sum, or override individual fields.
func (c *Client) CalculateQuote(ctx context.Context, input CalculatePricingQuoteRequest) (*WltPricingQuote, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT pricing handoff is not configured")
	}

	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT pricing quote request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/internal/quotes/calculate", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT pricing quote request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")

	if _, err := c.setTrustedOperatorContextHeader(req, ""); err != nil {
		return nil, fmt.Errorf("prepare WLT pricing OperatorContext: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT pricing quote: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT pricing quote returned HTTP %d", response.StatusCode)
	}

	var envelope struct {
		Quote WltPricingQuote `json:"quote"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT pricing quote response: %w", err)
	}

	return &envelope.Quote, nil
}
