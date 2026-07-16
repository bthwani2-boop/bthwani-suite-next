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
	TenantID    string       `json:"tenantId"`
	PhoneE164   string       `json:"phoneE164"`
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

func (i Identity) HasRole(role string) bool {
	for _, current := range i.Roles {
		if current == role {
			return true
		}
	}
	return false
}
