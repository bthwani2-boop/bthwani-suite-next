package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

var ErrPayoutDestinationNotFound = errors.New("WLT payout destination not found")

// partnerPayoutDestinationPath addresses the canonical WLT typed payout
// destination resource for a partner. WLT retired the partner-only
// /wlt/payout-destinations/{partnerId} shape; the governed contract is keyed by
// {actorType}/{actorId}, and "partner" is one actor type among several.
func partnerPayoutDestinationPath(partnerID string) string {
	return "/wlt/payout-destinations/partner/" + url.PathEscape(partnerID)
}

// PayoutDestinationUpsertInput is intentionally official-wallet-only. DSH may
// relay the unmasked reference to WLT for this request, but must never persist
// or return it. DestinationMethod is WLT-owned and therefore is not caller input.
type PayoutDestinationUpsertInput struct {
	BeneficiaryName           string `json:"beneficiaryName"`
	OfficialWalletProviderKey string `json:"officialWalletProviderKey"`
	DestinationReference      string `json:"destinationReference"`
	CreatedByActorID          string `json:"operatorId"`
	CorrelationID             string `json:"-"`
	IdempotencyKey            string `json:"-"`
}

// PayoutDestinationRef mirrors the canonical WLT PayoutDestination response.
type PayoutDestinationRef struct {
	ID                            string `json:"id"`
	OwnerActorID                  string `json:"ownerActorId"`
	OwnerActorType                string `json:"ownerActorType"`
	OfficialWalletProviderKey     string `json:"officialWalletProviderKey"`
	DestinationVersion            int    `json:"destinationVersion"`
	DestinationMethod             string `json:"destinationMethod"`
	MaskedDestinationReference    string `json:"maskedDestinationReference"`
	DestinationVerificationStatus string `json:"destinationVerificationStatus"`
	BeneficiaryName               string `json:"beneficiaryName"`
	Active                        bool   `json:"active"`
	UpdatedAt                     string `json:"updatedAt"`
}

type payoutDestinationEnvelope struct {
	PayoutDestination PayoutDestinationRef `json:"payoutDestination"`
}

func (c *Client) UpsertPayoutDestination(ctx context.Context, partnerID string, input PayoutDestinationUpsertInput) (*PayoutDestinationRef, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payout-destination handoff is not configured")
	}
	partnerID = strings.TrimSpace(partnerID)
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.OfficialWalletProviderKey = strings.ToLower(strings.TrimSpace(input.OfficialWalletProviderKey))
	input.DestinationReference = strings.TrimSpace(input.DestinationReference)
	input.CreatedByActorID = strings.TrimSpace(input.CreatedByActorID)
	if partnerID == "" || input.BeneficiaryName == "" || input.OfficialWalletProviderKey == "" || input.DestinationReference == "" || input.CreatedByActorID == "" {
		return nil, fmt.Errorf("partner, beneficiary, official wallet provider, destination reference, and creating actor are required")
	}

	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT payout destination request: %w", err)
	}
	path := partnerPayoutDestinationPath(partnerID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT payout destination request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = deterministicMutationKey("partner-payout-correlation", partnerID, input.CreatedByActorID)
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey(
			"partner-payout-destination",
			partnerID,
			input.CreatedByActorID,
			input.OfficialWalletProviderKey,
			input.DestinationReference,
		)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, fmt.Errorf("prepare WLT payout destination request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT payout destination: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT payout destination returned HTTP %d", response.StatusCode)
	}
	return decodePayoutDestinationRef(response, partnerID)
}

func (c *Client) GetPayoutDestination(ctx context.Context, partnerID string) (*PayoutDestinationRef, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payout-destination readback is not configured")
	}
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return nil, fmt.Errorf("partner is required for payout readback")
	}
	path := partnerPayoutDestinationPath(partnerID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, fmt.Errorf("build WLT payout readback request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call WLT payout readback: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return nil, ErrPayoutDestinationNotFound
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("WLT payout readback returned HTTP %d", response.StatusCode)
	}
	return decodePayoutDestinationRef(response, partnerID)
}

func decodePayoutDestinationRef(response *http.Response, partnerID string) (*PayoutDestinationRef, error) {
	var envelope payoutDestinationEnvelope
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode WLT payout destination response: %w", err)
	}
	ref := envelope.PayoutDestination
	if ref.ID == "" ||
		ref.OwnerActorType != "partner" ||
		ref.OwnerActorID != partnerID ||
		ref.OfficialWalletProviderKey == "" ||
		ref.DestinationVersion < 1 ||
		ref.DestinationMethod != "official_wallet" ||
		ref.MaskedDestinationReference == "" ||
		!ref.Active {
		return nil, fmt.Errorf("WLT payout destination response is incomplete or violates the official-wallet contract")
	}
	return &ref, nil
}

func (c *Client) DeactivatePayoutDestination(ctx context.Context, partnerID, actorID, correlationID, idempotencyKey string) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payout-destination handoff is not configured")
	}
	partnerID = strings.TrimSpace(partnerID)
	actorID = strings.TrimSpace(actorID)
	if partnerID == "" || actorID == "" {
		return fmt.Errorf("partner and actor are required to deactivate a payout destination")
	}
	path := partnerPayoutDestinationPath(partnerID) + "/deactivate"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("build WLT payout destination deactivation request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if strings.TrimSpace(correlationID) == "" {
		correlationID = deterministicMutationKey("partner-payout-deactivate-correlation", partnerID, actorID)
	}
	if strings.TrimSpace(idempotencyKey) == "" {
		idempotencyKey = deterministicMutationKey("partner-payout-deactivate", partnerID, actorID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT payout destination deactivation request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT payout destination deactivation: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT payout destination deactivation returned HTTP %d", response.StatusCode)
	}
	return nil
}
