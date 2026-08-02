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
	baseURL             string
	internalServiceToken string
	operatorContextID    string
	http                 *http.Client

	mu                   sync.RWMutex
	partnerBundles       []PartnerPermissionBundleDescriptor
	partnerBundlesLoaded bool
}

func NewClient(baseURL string) *Client {
	return NewClientWithInternalAccess(baseURL, "", "")
}

// NewClientWithInternalAccess configures the DSH-to-Identity trust boundary.
// The service token and operator context are server-owned configuration and are
// never sourced from an application request.
func NewClientWithInternalAccess(baseURL, serviceToken, operatorContextID string) *Client {
	return &Client{
		baseURL:              strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		internalServiceToken: strings.TrimSpace(serviceToken),
		operatorContextID:    strings.TrimSpace(operatorContextID),
		http:                 &http.Client{Timeout: 3 * time.Second},
	}
}

// Resolve accepts only authenticated Identity assertions with an explicit
// operator context. The Identity session is the operator-context authority; a
// process-wide default is never used to select or reject a valid scoped session.
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

func clonePartnerPermissionBundles(source []PartnerPermissionBundleDescriptor) []PartnerPermissionBundleDescriptor {
	result := make([]PartnerPermissionBundleDescriptor, len(source))
	for index, descriptor := range source {
		result[index] = descriptor
		result[index].Actions = append([]string(nil), descriptor.Actions...)
	}
	return result
}

// FetchPartnerPermissionBundles retrieves the canonical Identity-owned partner
// permission bundles through the authenticated DSH service boundary.
func (c *Client) FetchPartnerPermissionBundles(ctx context.Context) ([]PartnerPermissionBundleDescriptor, error) {
	c.mu.RLock()
	if c.partnerBundlesLoaded {
		bundles := clonePartnerPermissionBundles(c.partnerBundles)
		c.mu.RUnlock()
		return bundles, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.partnerBundlesLoaded {
		return clonePartnerPermissionBundles(c.partnerBundles), nil
	}
	if c.baseURL == "" || c.internalServiceToken == "" || c.operatorContextID == "" {
		return nil, ErrIdentityUnavailable
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/partner/permission-bundles", nil)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	req.Header.Set("Authorization", "Bearer "+c.internalServiceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Operator-Context-ID", c.operatorContextID)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response partnerPermissionBundlesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	c.partnerBundles = clonePartnerPermissionBundles(response.PermissionBundles)
	c.partnerBundlesLoaded = true
	return clonePartnerPermissionBundles(c.partnerBundles), nil
}
