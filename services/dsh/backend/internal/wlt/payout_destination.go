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

// PayoutDestinationUpsertInput contains raw payout details only while the
// request is in flight to WLT. DSH must never persist these raw values.
type PayoutDestinationUpsertInput struct {
	BeneficiaryName               string `json:"beneficiaryName"`
	BankName                      string `json:"bankName"`
	BankBranch                    string `json:"bankBranch"`
	AccountNumber                 string `json:"accountNumber"`
	IBAN                          string `json:"iban"`
	PayoutMobileNumber            string `json:"payoutMobileNumber"`
	SettlementPreference          string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
	BankNotes                     string `json:"bankNotes"`
	CreatedByActorID              string `json:"createdByActorId"`
	CorrelationID                 string `json:"-"`
	IdempotencyKey                string `json:"-"`
}

type PayoutDestinationRef struct {
	ID                   string `json:"id"`
	PartnerID            string `json:"partnerId"`
	SettlementPreference string `json:"settlementPreference"`
	MaskedAccountNumber  string `json:"maskedAccountNumber"`
	MaskedIBAN           string `json:"maskedIban"`
	MaskedMobileNumber   string `json:"maskedMobileNumber"`
	BeneficiaryName      string `json:"beneficiaryName"`
	BankName             string `json:"bankName"`
	BankBranch           string `json:"bankBranch"`
	Active               bool   `json:"active"`
	UpdatedAt            string `json:"updatedAt"`
}

func (c *Client) UpsertPayoutDestination(ctx context.Context, partnerID string, input PayoutDestinationUpsertInput) (*PayoutDestinationRef, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payout-destination handoff is not configured")
	}
	partnerID = strings.TrimSpace(partnerID)
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.BankName = strings.TrimSpace(input.BankName)
	input.BankBranch = strings.TrimSpace(input.BankBranch)
	input.AccountNumber = strings.TrimSpace(input.AccountNumber)
	input.IBAN = strings.TrimSpace(input.IBAN)
	input.PayoutMobileNumber = strings.TrimSpace(input.PayoutMobileNumber)
	input.SettlementPreference = strings.TrimSpace(input.SettlementPreference)
	input.BankNotes = strings.TrimSpace(input.BankNotes)
	input.CreatedByActorID = strings.TrimSpace(input.CreatedByActorID)
	if partnerID == "" || input.BeneficiaryName == "" || input.CreatedByActorID == "" {
		return nil, fmt.Errorf("partner, beneficiary, and creating actor are required")
	}

	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT payout destination request: %w", err)
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(partnerID)
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
			input.SettlementPreference,
			input.AccountNumber,
			input.IBAN,
			input.PayoutMobileNumber,
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
	ref, err := decodePayoutDestinationRef(response, partnerID)
	if err != nil {
		return nil, err
	}
	return ref, nil
}

func (c *Client) GetPayoutDestination(ctx context.Context, partnerID string) (*PayoutDestinationRef, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payout-destination readback is not configured")
	}
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return nil, fmt.Errorf("partner is required for payout readback")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(partnerID)
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
	var ref PayoutDestinationRef
	if err := json.NewDecoder(response.Body).Decode(&ref); err != nil {
		return nil, fmt.Errorf("decode WLT payout destination response: %w", err)
	}
	if ref.ID == "" || ref.PartnerID != partnerID || !ref.Active {
		return nil, fmt.Errorf("WLT payout destination response is incomplete")
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
	path := "/wlt/payout-destinations/" + url.PathEscape(partnerID) + "/deactivate"
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
