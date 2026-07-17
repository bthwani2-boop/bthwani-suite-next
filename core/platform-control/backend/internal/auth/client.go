package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

var (
	ErrUnauthenticated     = errors.New("unauthenticated")
	ErrIdentityUnavailable = errors.New("identity unavailable")
)

type Permission struct {
	Service string `json:"service"`
	Surface string `json:"surface"`
	Action  string `json:"action"`
	Scope   string `json:"scope"`
}

type Identity struct {
	Subject     string       `json:"subject"`
	Roles       []string     `json:"roles"`
	Permissions []Permission `json:"permissions"`
	AuthState   string       `json:"authState"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 3 * time.Second},
	}
}

func (c *Client) Resolve(ctx context.Context, authorization string) (Identity, error) {
	if c.baseURL == "" {
		return Identity{}, ErrIdentityUnavailable
	}
	if !strings.HasPrefix(strings.TrimSpace(authorization), "Bearer ") {
		return Identity{}, ErrUnauthenticated
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/auth/session", nil)
	if err != nil {
		return Identity{}, ErrIdentityUnavailable
	}
	req.Header.Set("Authorization", authorization)
	resp, err := c.http.Do(req)
	if err != nil {
		return Identity{}, ErrIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return Identity{}, ErrUnauthenticated
	}
	if resp.StatusCode != http.StatusOK {
		return Identity{}, ErrIdentityUnavailable
	}
	var identity Identity
	if err := json.NewDecoder(resp.Body).Decode(&identity); err != nil {
		return Identity{}, ErrIdentityUnavailable
	}
	if identity.AuthState != "authenticated" || identity.Subject == "" {
		return Identity{}, ErrUnauthenticated
	}
	return identity, nil
}

func (i Identity) HasPermission(service, action, scope string) bool {
	for _, permission := range i.Permissions {
		if permission.Service != service {
			continue
		}
		if permission.Action != action && permission.Action != "*" {
			continue
		}
		if permission.Scope == scope || permission.Scope == "all" || permission.Scope == "*" {
			return true
		}
	}
	return false
}

// HasSurfacePermission enforces the complete permission tuple for sensitive
// surface-bound capabilities. A permission issued for another application
// surface must never authorize the control panel, even when its action and
// scope otherwise match.
func (i Identity) HasSurfacePermission(service, surface, action, scope string) bool {
	for _, permission := range i.Permissions {
		if permission.Service != service {
			continue
		}
		if permission.Surface != surface && permission.Surface != "all" && permission.Surface != "*" {
			continue
		}
		if permission.Action != action && permission.Action != "*" {
			continue
		}
		if permission.Scope == scope || permission.Scope == "all" || permission.Scope == "*" {
			return true
		}
	}
	return false
}
