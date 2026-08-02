package workforceclient

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

type FieldActivationReadiness struct {
	IsReady bool   `json:"isReady"`
	Reason  string `json:"reason,omitempty"`
}

type ActorScopes struct {
	ActorID           string   `json:"actorId"`
	Role              string   `json:"role"`
	OperatorContextID string   `json:"operatorContextId"`
	StoreIDs          []string `json:"storeIds"`
	ServiceAreaCodes  []string `json:"serviceAreaCodes"`
}

type GovernedActivationReadiness struct {
	IsActive bool     `json:"isActive"`
	Missing  []string `json:"missing"`
}

func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

func (c *Client) ActivationReadiness(ctx context.Context, actorID string) (GovernedActivationReadiness, error) {
	return c.getReadiness(ctx, fmt.Sprintf("%s/internal/captains/%s/readiness", c.baseURL, actorID))
}

func (c *Client) FieldActivationReadiness(ctx context.Context, actorID string) (GovernedActivationReadiness, error) {
	return c.getReadiness(ctx, fmt.Sprintf("%s/internal/fields/%s/readiness", c.baseURL, actorID))
}

func (c *Client) getReadiness(ctx context.Context, endpoint string) (GovernedActivationReadiness, error) {
	if !c.Configured() {
		return GovernedActivationReadiness{}, fmt.Errorf("workforce client not configured")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return GovernedActivationReadiness{}, fmt.Errorf("build readiness request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")

	resp, err := c.http.Do(req)
	if err != nil {
		return GovernedActivationReadiness{}, fmt.Errorf("call workforce readiness: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GovernedActivationReadiness{}, fmt.Errorf("workforce readiness returned HTTP %d", resp.StatusCode)
	}

	var data struct {
		ActivationReadiness GovernedActivationReadiness `json:"activationReadiness"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return GovernedActivationReadiness{}, fmt.Errorf("decode workforce readiness: %w", err)
	}
	return data.ActivationReadiness, nil
}

func (c *Client) GetActorScopes(ctx context.Context, actorID, operatorContextID, role string) (*ActorScopes, error) {
	urlStr := fmt.Sprintf("%s/internal/assignments/%s/scopes?role=%s&operatorContextId=%s", c.baseURL, actorID, role, operatorContextID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return nil, fmt.Errorf("create workforce request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.serviceToken)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call workforce scopes: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("workforce scopes returned HTTP %d", resp.StatusCode)
	}

	var scopes ActorScopes
	if err := json.NewDecoder(resp.Body).Decode(&scopes); err != nil {
		return nil, fmt.Errorf("decode workforce scopes: %w", err)
	}
	return &scopes, nil
}
