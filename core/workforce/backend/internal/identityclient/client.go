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
	"strconv"
	"strings"
	"time"
)

// actorSearchPageSize is the page size requested from identity's keyset-paginated
// actor search. Callers that need every match must follow NextCursor to exhaustion.
const actorSearchPageSize = 100

var (
	ErrUnavailable              = errors.New("identity unavailable")
	ErrPhoneAlreadyBound        = errors.New("phone already bound to another actor")
	ErrUsernameTaken            = errors.New("username already taken")
	ErrActorNotFound            = errors.New("actor not found")
	ErrRateLimited              = errors.New("activation rate limited")
	ErrInvalidActor             = errors.New("actor input invalid")
	ErrOperatorContextForbidden = fmt.Errorf("%w: operator context forbidden", ErrUnavailable)
	ErrActorStateConflict       = errors.New("actor state conflict")
	// ErrProvisionConflict is identity's ACTOR_PROVISION_CONFLICT: an actor
	// already holds this phone under a different username or role, so the
	// provisioning input cannot be replayed idempotently.
	ErrProvisionConflict = errors.New("actor provisioning conflict")
)

type Client struct {
	baseURL           string
	serviceToken      string
	operatorContextID string
	http              *http.Client
}

// NewClient requires an explicit trusted operator context. Runtime callers
// must resolve it once at composition time; individual Workforce operations
// cannot silently substitute or override it.
func NewClient(baseURL, serviceToken, operatorContextID string) *Client {
	return &Client{
		baseURL:           strings.TrimRight(baseURL, "/"),
		serviceToken:      serviceToken,
		operatorContextID: strings.TrimSpace(operatorContextID),
		http:              &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != "" && c.operatorContextID != ""
}

func (c *Client) trustedOperatorContext(requested string) (string, error) {
	if c == nil || c.operatorContextID == "" {
		return "", ErrUnavailable
	}
	requested = strings.TrimSpace(requested)
	if requested != "" && requested != c.operatorContextID {
		return "", ErrOperatorContextForbidden
	}
	return c.operatorContextID, nil
}

type ActorView struct {
	ActorID   string   `json:"actorId"`
	Username  string   `json:"username"`
	PhoneE164 string   `json:"phoneE164"`
	Roles     []string `json:"roles"`
	Version   int      `json:"version"`
	Status    string   `json:"status"`
	// Created is true only when this Provision call created the actor. A
	// replayed provision is intentionally false so callers can compensate only
	// resources they actually created.
	Created bool `json:"created,omitempty"`
}

// IsActive derives lifecycle truth exclusively from Identity's canonical
// status field. Identity does not expose a parallel JSON "active" boolean.
func (a ActorView) IsActive() bool {
	return strings.EqualFold(strings.TrimSpace(a.Status), "ACTIVE")
}

type ActorSearchPage struct {
	Items      []ActorView `json:"items"`
	Limit      int         `json:"limit"`
	NextCursor string      `json:"nextCursor,omitempty"`
	Total      int         `json:"total"`
}

type ProvisionInput struct {
	Username          string `json:"username"`
	PhoneE164         string `json:"phoneE164"`
	Role              string `json:"role"`
	OperatorContextID string `json:"operatorContextId,omitempty"`
}

type ActivationCode struct {
	ActivationID string    `json:"activationId"`
	Code         string    `json:"code"`
	MaskedPhone  string    `json:"maskedPhone"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type ActivationMetadata struct {
	ActivationID string    `json:"activationId"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
	MaskedPhone  string    `json:"maskedPhone"`
}

func (c *Client) Provision(ctx context.Context, input ProvisionInput) (ActorView, error) {
	var view ActorView
	operatorContextID, err := c.trustedOperatorContext(input.OperatorContextID)
	if err != nil {
		return view, err
	}
	input.OperatorContextID = operatorContextID
	err = c.do(ctx, http.MethodPost, "/internal/actors/provision", input, &view, nil)
	return view, err
}

func (c *Client) Actor(ctx context.Context, actorID string) (ActorView, error) {
	var view ActorView
	err := c.do(ctx, http.MethodGet, "/internal/actors/"+url.PathEscape(actorID), nil, &view, nil)
	return view, err
}

// SearchActors performs a keyset-paginated actor search against identity. An empty
// cursor starts at the first page; the returned cursor is empty once the last page
// has been read.
func (c *Client) SearchActors(ctx context.Context, role, q, cursor string) ([]ActorView, string, error) {
	result := ActorSearchPage{Items: []ActorView{}}
	values := url.Values{}
	if role != "" {
		values.Set("role", role)
	}
	if q != "" {
		values.Set("q", q)
	}
	if cursor != "" {
		values.Set("cursor", cursor)
	}
	values.Set("limit", strconv.Itoa(actorSearchPageSize))
	path := "/internal/actors/search?" + values.Encode()
	err := c.do(ctx, http.MethodGet, path, nil, &result, nil)
	if result.Items == nil {
		result.Items = []ActorView{}
	}
	return result.Items, result.NextCursor, err
}

// Deprovision initiates a hard delete of an unactivated actor. This is used exclusively
// for saga compensation when a downstream creation step fails.
func (c *Client) Deprovision(ctx context.Context, actorID string) error {
	return c.do(ctx, http.MethodDelete, "/internal/actors/"+url.PathEscape(actorID), nil, nil, nil)
}

func (c *Client) Deactivate(ctx context.Context, actorID, requestedByActorID, reason, correlationID string) error {
	body := map[string]string{
		"requestedByActorId": requestedByActorID,
		"reason":             reason,
		"correlationId":      correlationID,
	}
	return c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/deactivate", body, nil, nil)
}

func (c *Client) Reactivate(ctx context.Context, actorID, requestedByActorID, reason, correlationID string) error {
	body := map[string]string{
		"requestedByActorId": requestedByActorID,
		"reason":             reason,
		"correlationId":      correlationID,
	}
	return c.do(ctx, http.MethodPost, "/internal/actors/"+url.PathEscape(actorID)+"/reactivate", body, nil, nil)
}

func canonicalActivationSurface(expectedActorType, expectedSurface string) string {
	if strings.TrimSpace(expectedActorType) == "employee" {
		return "control-panel"
	}
	return strings.TrimSpace(expectedSurface)
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
	expectedSurface = canonicalActivationSurface(expectedActorType, expectedSurface)
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

func (c *Client) LatestActivation(ctx context.Context, actorID string) (*ActivationMetadata, error) {
	var meta *ActivationMetadata
	err := c.do(ctx, http.MethodGet, "/internal/actors/"+url.PathEscape(actorID)+"/activations/latest", nil, &meta, nil)
	return meta, err
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
	req.Header.Set("X-Operator-Context-ID", c.operatorContextID)
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
	case "INVALID_REQUEST", "INVALID_ACTOR_INPUT":
		return ErrInvalidActor
	case "OPERATOR_CONTEXT_REQUIRED", "OPERATOR_CONTEXT_FORBIDDEN":
		return ErrOperatorContextForbidden
	case "ACTOR_STATE_CONFLICT":
		return ErrActorStateConflict
	case "ACTOR_PROVISION_CONFLICT":
		return ErrProvisionConflict
	case "INTERNAL_API_UNAVAILABLE", "IDENTITY_DEPENDENCY_TIMEOUT", "SERVICE_UNAVAILABLE":
		return ErrUnavailable
	}
	if response.StatusCode == http.StatusNotFound {
		return ErrActorNotFound
	}
	if response.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimited
	}
	if response.StatusCode == http.StatusServiceUnavailable || response.StatusCode == http.StatusGatewayTimeout {
		return ErrUnavailable
	}
	return fmt.Errorf("identity returned HTTP %d (%s)", response.StatusCode, apiErr.Code)
}
