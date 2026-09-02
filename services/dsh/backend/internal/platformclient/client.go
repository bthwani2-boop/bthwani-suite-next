package platformclient

import (
	"context"
	"dsh-api/internal/opctx"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
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
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

type PlatformVariable struct {
	Key           string `json:"variableKey"`
	ValueJSON     any    `json:"valueJson"`
	ScopeType     string `json:"scopeType"`
	ScopeID       string `json:"scopeId"`
	EffectiveFrom string `json:"effectiveFrom"`
	ExpiresAt     string `json:"expiresAt,omitempty"`
	Status        string `json:"status"`
}

func (c *Client) GetVariable(ctx context.Context, key, scopeType, scopeId string) (*PlatformVariable, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("platform-control integration is not configured")
	}

	operatorContextID, ok := opctx.OperatorContextIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("trusted operator context is required for platform-control requests")
	}

	reqURL := fmt.Sprintf("%s/platform/internal/v1/variables/%s?scopeType=%s&scopeId=%s",
		c.baseURL,
		url.PathEscape(key),
		url.QueryEscape(scopeType),
		url.QueryEscape(scopeId),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build platform-control variable request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	// DSH uses service-to-service auth for Platform Control
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Operator-Context-ID", operatorContextID)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call platform-control: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // Variable not found or not active for this scope
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("platform-control returned HTTP %d", resp.StatusCode)
	}

	var envelope struct {
		Variable PlatformVariable `json:"variable"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode platform-control response: %w", err)
	}

	return &envelope.Variable, nil
}
