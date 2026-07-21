package supportsession

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrNotConfigured = errors.New("identity support session client is not configured")
	ErrIdentityDenied = errors.New("identity rejected support session action")
	ErrIdentityConflict = errors.New("identity support session conflict")
)

type Permission struct {
	Service string `json:"service"`
	Surface string `json:"surface"`
	Action  string `json:"action"`
	Scope   string `json:"scope"`
}

type Identity struct {
	Subject          string       `json:"subject"`
	TenantID         string       `json:"tenantId"`
	PhoneE164        string       `json:"phoneE164"`
	Roles            []string     `json:"roles"`
	Permissions      []Permission `json:"permissions"`
	AuthState        string       `json:"authState"`
	SessionID        string       `json:"sessionId"`
	SessionKind      string       `json:"sessionKind"`
	InitiatorActorID string       `json:"initiatorActorId"`
	SupportRequestID string       `json:"supportRequestId"`
	ExpiresAt        time.Time    `json:"expiresAt"`
}

type IssuedToken struct {
	AccessToken string   `json:"accessToken"`
	TokenType   string   `json:"tokenType"`
	ExpiresIn   int      `json:"expiresIn"`
	Identity    Identity `json:"identity"`
}

type Client struct {
	baseURL      string
	serviceToken string
	httpClient   *http.Client
}

func NewClient(baseURL string, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		serviceToken: strings.TrimSpace(serviceToken),
		httpClient:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

func (c *Client) do(ctx context.Context, path string, input any, output any) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	payload, err := json.Marshal(input)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Bthwani-Service-Caller", "dsh")
	request.Header.Set("X-Bthwani-Service-Token", c.serviceToken)
	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		switch response.StatusCode {
		case http.StatusForbidden, http.StatusUnauthorized:
			return ErrIdentityDenied
		case http.StatusConflict:
			return ErrIdentityConflict
		default:
			return fmt.Errorf("identity support session status %d", response.StatusCode)
		}
	}
	if output == nil || len(body) == 0 {
		return nil
	}
	return json.Unmarshal(body, output)
}

func (c *Client) Issue(
	ctx context.Context,
	requestID string,
	targetActorID string,
	initiatorActorID string,
	reason string,
	durationMinutes int,
) (IssuedToken, error) {
	var output IssuedToken
	err := c.do(ctx, "/internal/support-sessions", map[string]any{
		"supportRequestId": requestID,
		"targetActorId":    targetActorID,
		"initiatorActorId": initiatorActorID,
		"reason":           reason,
		"durationMinutes":  durationMinutes,
	}, &output)
	return output, err
}

func (c *Client) Resolve(ctx context.Context, accessToken string) (Identity, error) {
	var output Identity
	err := c.do(ctx, "/internal/support-sessions/resolve", map[string]string{
		"accessToken": accessToken,
	}, &output)
	return output, err
}

func (c *Client) Revoke(ctx context.Context, requestID string, reason string) error {
	return c.do(ctx, "/internal/support-sessions/"+requestID+"/revoke", map[string]string{
		"reason": reason,
	}, nil)
}
