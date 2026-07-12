// Package identityclient calls core/identity's internal actor API with the
// shared service token, mirroring the DSH→WLT service-to-service pattern.
package identityclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	ErrPhoneAlreadyBound = errors.New("phone already bound to another actor")
	ErrUsernameTaken     = errors.New("username already taken")
	ErrActorNotFound     = errors.New("actor not found")
	ErrRateLimited       = errors.New("activation rate limited")
	ErrInvalidActor      = errors.New("actor input invalid")
	ErrUnavailable       = errors.New("identity unavailable")
)

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http:         &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

type ActorView struct {
	ActorID   string   `json:"actorId"`
	Username  string   `json:"username"`
	PhoneE164 string   `json:"phoneE164"`
	Roles     []string `json:"roles"`
	Active    bool     `json:"active"`
}

type ProvisionInput struct {
	Username  string `json:"username"`
	PhoneE164 string `json:"phoneE164"`
	Role      string `json:"role"`
	TenantID  string `json:"tenantId,omitempty"`
}

type ActivationCode struct {
	ActivationID string    `json:"activationId"`
	Code         string    `json:"code"`
	MaskedPhone  string    `json:"maskedPhone"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

func (c *Client) Provision(ctx context.Context, input ProvisionInput) (ActorView, error) {
	var view ActorView
	err := c.do(ctx, http.MethodPost, "/internal/actors/provision", input, &view, nil)
	return view, err
}

func (c *Client) Actor(ctx context.Context, actorID string) (ActorView, error) {
	var view ActorView
	err := c.do(ctx, http.MethodGet, "/internal/actors/"+url.PathEscape(actorID), nil, &view, nil)
	return view, err
}

func (c *Client) Deactivate(ctx context.Context, actorID string) error {
	return c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/deactivate", nil, nil, nil)
}

func (c *Client) Reactivate(ctx context.Context, actorID string) error {
	return c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/reactivate", nil, nil, nil)
}

func (c *Client) IssueActivation(ctx context.Context, actorID, issuedByActorID, expectedActorType, expectedSurface, idempotencyKey, correlationID string) (ActivationCode, error) {
	var code ActivationCode
	headers := map[string]string{}
	if idempotencyKey != "" {
		headers["Idempotency-Key"] = idempotencyKey
	}
	if correlationID != "" {
		headers["X-Correlation-ID"] = correlationID
	}
	err := c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/activations",
		map[string]string{
			"issuedByActorId":   issuedByActorID,
			"expectedActorType": expectedActorType,
			"expectedSurface":   expectedSurface,
		}, &code, headers)
	return code, err
}

func (c *Client) RevokeActivations(ctx context.Context, actorID string) error {
	return c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/activations/revoke", nil, nil, nil)
}

func (c *Client) do(ctx context.Context, method, path string, body, target any, headers map[string]string) error {
	if !c.Configured() {
		return ErrUnavailable
	}
	var reader *bytes.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("encode identity request: %w", err)
		}
		reader = bytes.NewReader(encoded)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return fmt.Errorf("build identity request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "workforce")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return ErrUnavailable
	}
	defer response.Body.Close()
	if response.StatusCode >= 200 && response.StatusCode < 300 {
		if target == nil {
			return nil
		}
		if err := json.NewDecoder(response.Body).Decode(target); err != nil {
			return fmt.Errorf("decode identity response: %w", err)
		}
		return nil
	}

	var apiErr struct {
		Code string `json:"code"`
	}
	_ = json.NewDecoder(response.Body).Decode(&apiErr)
	switch apiErr.Code {
	case "PHONE_ALREADY_BOUND":
		return ErrPhoneAlreadyBound
	case "USERNAME_TAKEN":
		return ErrUsernameTaken
	case "ACTOR_NOT_FOUND":
		return ErrActorNotFound
	case "ACTIVATION_RATE_LIMITED":
		return ErrRateLimited
	case "INVALID_ACTOR_INPUT":
		return ErrInvalidActor
	}
	if response.StatusCode == http.StatusNotFound {
		return ErrActorNotFound
	}
	return fmt.Errorf("identity returned HTTP %d (%s)", response.StatusCode, apiErr.Code)
}
