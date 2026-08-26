package wlt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

var ErrPayoutDestinationNotFound = errors.New("WLT payout destination not found")

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

func (c *Client) GetPayoutDestination(ctx context.Context, partnerID string) (*PayoutDestinationRef, error) {
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return nil, fmt.Errorf("partner is required for payout readback")
	}
	status, body, err := c.ExecuteFinanceRead(
		ctx,
		"finance.payout_destinations.read",
		map[string]string{"actorType": "partner", "actorId": partnerID},
		nil,
		"",
		"",
	)
	if err != nil {
		return nil, err
	}
	if status == http.StatusNotFound {
		return nil, ErrPayoutDestinationNotFound
	}
	if status < 200 || status >= 300 {
		return nil, fmt.Errorf("WLT payout readback returned HTTP %d", status)
	}
	return decodePayoutDestinationRef(body, partnerID)
}

func decodePayoutDestinationRef(body []byte, partnerID string) (*PayoutDestinationRef, error) {
	var envelope payoutDestinationEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
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

func (c *Client) DeactivatePayoutDestination(ctx context.Context, partnerID, actorID, reason, evidenceReference, correlationID, idempotencyKey string) error {
	partnerID = strings.TrimSpace(partnerID)
	actorID = strings.TrimSpace(actorID)
	reason = strings.TrimSpace(reason)
	evidenceReference = strings.TrimSpace(evidenceReference)
	if partnerID == "" || actorID == "" || reason == "" || evidenceReference == "" {
		return fmt.Errorf("partner, actor, reason and evidence reference are required to deactivate a payout destination")
	}
	body, err := json.Marshal(map[string]string{
		"reason":            reason,
		"evidenceReference": evidenceReference,
	})
	if err != nil {
		return fmt.Errorf("encode WLT payout destination deactivation request: %w", err)
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = deterministicMutationKey("partner-payout-deactivate-correlation", partnerID, actorID)
	}
	if strings.TrimSpace(idempotencyKey) == "" {
		idempotencyKey = deterministicMutationKey("partner-payout-deactivate", partnerID, actorID)
	}
	_, _, err = c.ExecuteFinanceWrite(
		ctx,
		"finance.payout_destinations.deactivate",
		map[string]string{"actorType": "partner", "actorId": partnerID},
		body,
		correlationID,
		idempotencyKey,
		"",
		actorID,
	)
	return err
}
