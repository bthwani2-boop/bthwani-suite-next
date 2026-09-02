// Package identityauth resolves authenticated end-user sessions through the
// canonical Identity service for backend consumers.
package identityauth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrUnauthenticated     = errors.New("unauthenticated")
	ErrIdentityUnavailable = errors.New("identity unavailable")
)

// Permission is the wire representation of the canonical Identity contract's
// Permission schema. Authorization matching is exact; the contract does not
// define wildcard values.
type Permission struct {
	Service string `json:"service"`
	Surface string `json:"surface"`
	Action  string `json:"action"`
	Scope   string `json:"scope"`
}

// ActorIdentity mirrors the canonical Identity contract's ActorIdentity
// schema. Identity owns this response; this package only transports it.
type ActorIdentity struct {
	Subject           string          `json:"subject"`
	SessionID         string          `json:"sessionId"`
	OperatorContextID string          `json:"operatorContextId"`
	PhoneE164         string          `json:"phoneE164"`
	Roles             []string        `json:"roles"`
	Permissions       []Permission    `json:"permissions"`
	AuthState         string          `json:"authState"`
	SurfaceAccess     map[string]bool `json:"surfaceAccess"`
	ServiceAccess     map[string]bool `json:"serviceAccess"`
	SessionSurface    string          `json:"sessionSurface"`
	ExpiresAt         time.Time       `json:"expiresAt"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

const identityResolveAttempts = 3

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 3 * time.Second},
	}
}

// Resolve accepts only an authenticated Identity assertion with an explicit
// operator context. Identity owns context membership and session validity.
func (c *Client) Resolve(ctx context.Context, authorization string) (ActorIdentity, error) {
	if c == nil || c.baseURL == "" {
		return ActorIdentity{}, ErrIdentityUnavailable
	}
	if !strings.HasPrefix(strings.TrimSpace(authorization), "Bearer ") {
		return ActorIdentity{}, ErrUnauthenticated
	}
	for attempt := 1; attempt <= identityResolveAttempts; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/auth/session", nil)
		if err != nil {
			return ActorIdentity{}, ErrIdentityUnavailable
		}
		req.Header.Set("Authorization", authorization)
		resp, err := c.http.Do(req)
		if err != nil {
			if attempt < identityResolveAttempts && ctx.Err() == nil {
				continue
			}
			return ActorIdentity{}, ErrIdentityUnavailable
		}

		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			_ = resp.Body.Close()
			return ActorIdentity{}, ErrUnauthenticated
		}
		if resp.StatusCode != http.StatusOK {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
			if attempt < identityResolveAttempts && (resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= http.StatusInternalServerError) {
				continue
			}
			return ActorIdentity{}, ErrIdentityUnavailable
		}

		var identity ActorIdentity
		decodeErr := json.NewDecoder(resp.Body).Decode(&identity)
		_ = resp.Body.Close()
		if decodeErr != nil {
			if attempt < identityResolveAttempts && ctx.Err() == nil {
				continue
			}
			return ActorIdentity{}, ErrIdentityUnavailable
		}
		identity.Subject = strings.TrimSpace(identity.Subject)
		identity.OperatorContextID = strings.TrimSpace(identity.OperatorContextID)
		if identity.AuthState != "authenticated" || identity.Subject == "" || identity.OperatorContextID == "" {
			return ActorIdentity{}, ErrUnauthenticated
		}
		return identity, nil
	}
	return ActorIdentity{}, ErrIdentityUnavailable
}

func (i ActorIdentity) HasRole(role string) bool {
	for _, current := range i.Roles {
		if current == role {
			return true
		}
	}
	return false
}

func (i ActorIdentity) HasPermission(service, action, scope string) bool {
	for _, permission := range i.Permissions {
		if permission.Service == service && permission.Action == action &&
			(permission.Scope == scope || permission.Scope == "all") {
			return true
		}
	}
	return false
}

// HasSurfacePermission enforces the complete canonical permission tuple.
func (i ActorIdentity) HasSurfacePermission(service, surface, action, scope string) bool {
	for _, permission := range i.Permissions {
		if permission.Service == service && permission.Surface == surface &&
			permission.Action == action &&
			(permission.Scope == scope || permission.Scope == "all") {
			return true
		}
	}
	return false
}
