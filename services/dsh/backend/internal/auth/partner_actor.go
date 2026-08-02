package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	ErrIdentityConflict = errors.New("identity conflict")
	ErrIdentityRejected = errors.New("identity request rejected")
)

type PartnerActorProvisionInput struct {
	Username         string `json:"username"`
	PhoneE164        string `json:"phoneE164"`
	PermissionBundle string `json:"permissionBundle"`
	StoreID          string `json:"storeId"`
}

type PartnerActorView struct {
	ActorID   string   `json:"actorId"`
	Username  string   `json:"username"`
	PhoneE164 string   `json:"phoneE164"`
	Roles     []string `json:"roles"`
	Active    bool     `json:"active"`
}

type PartnerActivationInput struct {
	IssuedByActorID string `json:"issuedByActorId"`
	StoreID         string `json:"storeId"`
}

type PartnerActivationResult struct {
	ActivationID string    `json:"activationId"`
	Code         string    `json:"code"`
	MaskedPhone  string    `json:"maskedPhone"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

func (c *Client) newDSHInternalRequest(ctx context.Context, method, path string, body any) (*http.Request, error) {
	if c.baseURL == "" || c.internalServiceToken == "" || c.operatorContextID == "" {
		return nil, ErrIdentityUnavailable
	}
	var encoded []byte
	var err error
	if body != nil {
		encoded, err = json.Marshal(body)
		if err != nil {
			return nil, ErrIdentityRejected
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(encoded))
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+c.internalServiceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Operator-Context-ID", c.operatorContextID)
	return req, nil
}

func identityMutationError(status int) error {
	switch status {
	case http.StatusBadRequest, http.StatusForbidden, http.StatusNotFound, http.StatusUnprocessableEntity:
		return ErrIdentityRejected
	case http.StatusConflict, http.StatusTooManyRequests:
		return ErrIdentityConflict
	default:
		return ErrIdentityUnavailable
	}
}

func (c *Client) ProvisionPartnerActor(ctx context.Context, input PartnerActorProvisionInput) (PartnerActorView, error) {
	var view PartnerActorView
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	input.PermissionBundle = strings.TrimSpace(input.PermissionBundle)
	input.StoreID = strings.TrimSpace(input.StoreID)
	if input.Username == "" || input.PhoneE164 == "" || input.PermissionBundle == "" || input.StoreID == "" {
		return view, ErrIdentityRejected
	}
	req, err := c.newDSHInternalRequest(ctx, http.MethodPost, "/internal/partner/actors/provision", input)
	if err != nil {
		return view, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return view, ErrIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		return view, identityMutationError(resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(&view); err != nil || strings.TrimSpace(view.ActorID) == "" {
		return PartnerActorView{}, ErrIdentityUnavailable
	}
	return view, nil
}

func (c *Client) IssuePartnerActivation(
	ctx context.Context,
	actorID string,
	input PartnerActivationInput,
	idempotencyKey string,
	correlationID string,
) (PartnerActivationResult, error) {
	var result PartnerActivationResult
	actorID = strings.TrimSpace(actorID)
	input.IssuedByActorID = strings.TrimSpace(input.IssuedByActorID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	if actorID == "" || input.IssuedByActorID == "" || input.StoreID == "" {
		return result, ErrIdentityRejected
	}
	path := "/internal/partner/actors/" + url.PathEscape(actorID) + "/activations"
	req, err := c.newDSHInternalRequest(ctx, http.MethodPost, path, input)
	if err != nil {
		return result, err
	}
	if key := strings.TrimSpace(idempotencyKey); key != "" {
		req.Header.Set("Idempotency-Key", key)
	}
	if value := strings.TrimSpace(correlationID); value != "" {
		req.Header.Set("X-Correlation-ID", value)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return result, ErrIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		return result, identityMutationError(resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || strings.TrimSpace(result.ActivationID) == "" || strings.TrimSpace(result.Code) == "" {
		return PartnerActivationResult{}, ErrIdentityUnavailable
	}
	return result, nil
}
