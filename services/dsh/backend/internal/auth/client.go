package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
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
	Subject           string       `json:"subject"`
	OperatorContextID string       `json:"operatorContextId"`
	PhoneE164         string       `json:"phoneE164"`
	Roles             []string     `json:"roles"`
	Permissions       []Permission `json:"permissions"`
	AuthState         string       `json:"authState"`
}

type Client struct {
	baseURL string
	http    *http.Client

	mu             sync.RWMutex
	partnerBundles []PartnerPermissionBundleDescriptor
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 3 * time.Second},
	}
}

// Resolve accepts only authenticated Identity assertions with an explicit
// OperatorContext. The Identity session is the OperatorContext authority; a process-wide default
// OperatorContext is never used to select or reject a valid OperatorContext-scoped session.
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
	if identity.AuthState != "authenticated" || strings.TrimSpace(identity.Subject) == "" || strings.TrimSpace(identity.OperatorContextID) == "" {
		return Identity{}, ErrUnauthenticated
	}
	identity.Subject = strings.TrimSpace(identity.Subject)
	identity.OperatorContextID = strings.TrimSpace(identity.OperatorContextID)
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

type PartnerPermissionBundleDescriptor struct {
	Code    string   `json:"code"`
	NameAr  string   `json:"nameAr"`
	NameEn  string   `json:"nameEn"`
	Actions []string `json:"actions"`
}

type partnerPermissionBundlesResponse struct {
	PermissionBundles []PartnerPermissionBundleDescriptor `json:"permissionBundles"`
}

// FetchPartnerPermissionBundles retrieves the canonical Identity-owned partner permission bundles.
func (c *Client) FetchPartnerPermissionBundles(ctx context.Context) ([]PartnerPermissionBundleDescriptor, error) {
	c.mu.RLock()
	if c.partnerBundles != nil {
		defer c.mu.RUnlock()
		return c.partnerBundles, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock
	if c.partnerBundles != nil {
		return c.partnerBundles, nil
	}

	if c.baseURL == "" {
		return nil, ErrIdentityUnavailable
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/partner/permission-bundles", nil)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	// ServiceCaller must be DSH for internal APIs
	req.Header.Set("X-Service-Caller", "dsh")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var res partnerPermissionBundlesResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, ErrIdentityUnavailable
	}
	c.partnerBundles = res.PermissionBundles
	return res.PermissionBundles, nil
}
