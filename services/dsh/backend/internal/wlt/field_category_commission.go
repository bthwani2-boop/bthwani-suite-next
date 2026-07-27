package wlt

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type DeliverFieldCategoryCommissionInput struct {
	BeneficiaryActorID string `json:"beneficiaryActorId"`
	VisitID            string `json:"visitId"`
	StoreID            string `json:"storeId"`
	PartnerID          string `json:"partnerId"`
	PartnerCategory    string `json:"partnerCategory"`
	SourceEvidenceHash string `json:"sourceEvidenceHash"`
	IdempotencyKey     string `json:"idempotencyKey"`
	CorrelationID      string `json:"-"`
}

func fieldCommissionEvidenceHash(input DeliverFieldCategoryCommissionInput) string {
	h := sha256.New()
	for _, value := range []string{
		input.VisitID, input.StoreID, input.PartnerID,
		input.PartnerCategory, input.BeneficiaryActorID,
	} {
		_, _ = h.Write([]byte(strings.TrimSpace(value)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

// DeliverFieldCategoryCommission transfers immutable DSH visit/category
// evidence only. WLT selects the category policy and calculates the amount.
func (c *Client) DeliverFieldCategoryCommission(ctx context.Context, input DeliverFieldCategoryCommissionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT field commission handoff is not configured")
	}
	input.BeneficiaryActorID = strings.TrimSpace(input.BeneficiaryActorID)
	input.VisitID = strings.TrimSpace(input.VisitID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.PartnerCategory = strings.TrimSpace(input.PartnerCategory)
	if input.PartnerCategory == "" {
		input.PartnerCategory = "default"
	}
	if input.BeneficiaryActorID == "" || input.VisitID == "" || input.StoreID == "" || input.PartnerID == "" {
		return fmt.Errorf("field actor, visit, store and partner are required")
	}
	if strings.TrimSpace(input.SourceEvidenceHash) == "" {
		input.SourceEvidenceHash = fieldCommissionEvidenceHash(input)
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = deterministicMutationKey("field-category-commission", input.VisitID, input.PartnerCategory, input.BeneficiaryActorID)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = input.VisitID
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT field category commission request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/field-commissions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT field category commission request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setTrustedTenantHeader(req, ""); err != nil {
		return fmt.Errorf("prepare WLT field commission tenant: %w", err)
	}
	if err := setRequiredMutationHeaders(req, correlationID, input.IdempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT field category commission request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT field category commission: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT field category commission returned HTTP %d", response.StatusCode)
	}
	return nil
}
