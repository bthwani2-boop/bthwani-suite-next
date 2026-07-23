// Package auth resolves end-user sessions against core/identity by
// forwarding the caller's bearer token, mirroring the DSH auth client.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
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
	TenantID    string       `json:"tenantId"`
	Roles       []string     `json:"roles"`
	Permissions []Permission `json:"permissions"`
	AuthState   string       `json:"authState"`
}

type Client struct {
	baseURL         string
	defaultTenantID string
	saasActive      bool
	http            *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:         strings.TrimRight(baseURL, "/"),
		defaultTenantID: strings.TrimSpace(os.Getenv("BTHWANI_DEFAULT_TENANT_ID")),
		saasActive:      strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")), "active"),
		http:            &http.Client{Timeout: 3 * time.Second},
	}
}

func (c *Client) Resolve(ctx context.Context, authorization string) (Identity, error) {
	if c.baseURL == "" || (c.saasActive && c.defaultTenantID == "") {
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
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
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
	if c.saasActive && strings.TrimSpace(identity.TenantID) != c.defaultTenantID {
		return Identity{}, ErrUnauthenticated
	}
	return identity, nil
}

func (i Identity) HasRole(role string) bool {
	for _, current := range i.Roles {
		if current == role {
			return true
		}
	}
	return false
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
