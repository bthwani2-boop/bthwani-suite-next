package wlt

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
	UnitPriceMinorUnits int64  `json:"-"`
}

type QuotePricingEvidenceLine struct {
	MasterProductID     string `json:"masterProductId"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
	Currency            string `json:"currency"`
}

type PricingEvidence struct {
	Version               int                        `json:"version"`
	Lines                 []QuotePricingEvidenceLine `json:"lines"`
	DeliveryFeeMinorUnits int64                      `json:"deliveryFeeMinorUnits"`
	ServiceFeeMinorUnits  int64                      `json:"serviceFeeMinorUnits"`
	Signature             string                     `json:"signature"`
}

// CalculatePricingQuoteRequest is the operational payload DSH sends to WLT.
type CalculatePricingQuoteRequest struct {
	ClientID        string                  `json:"clientId"`
	StoreID         string                  `json:"storeId"`
	Currency        string                  `json:"currency"`
	CartVersion     int                     `json:"cartVersion"`
	Lines           []QuotePricingInputLine `json:"lines"`
	PricingEvidence PricingEvidence         `json:"pricingEvidence"`
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

	secret := os.Getenv("DSH_WLT_PRICING_EVIDENCE_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("DSH pricing evidence signer is not configured")
	}
	evidence := PricingEvidence{
		Version:               input.CartVersion,
		DeliveryFeeMinorUnits: input.PricingEvidence.DeliveryFeeMinorUnits,
		ServiceFeeMinorUnits:  input.PricingEvidence.ServiceFeeMinorUnits,
		Lines:                 make([]QuotePricingEvidenceLine, 0, len(input.Lines)),
	}
	for _, line := range input.Lines {
		evidence.Lines = append(evidence.Lines, QuotePricingEvidenceLine{
			MasterProductID: line.MasterProductID, UnitPriceMinorUnits: line.UnitPriceMinorUnits, Currency: input.Currency,
		})
	}
	unsigned := evidence
	unsigned.Signature = ""
	encoded, err := json.Marshal(unsigned)
	if err != nil {
		return nil, fmt.Errorf("encode DSH pricing evidence: %w", err)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(encoded)
	evidence.Signature = hex.EncodeToString(mac.Sum(nil))
	input.PricingEvidence = evidence

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
