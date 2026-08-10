package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
	SessionID         string       `json:"sessionId"`
	SessionSurface    string       `json:"sessionSurface"`
}

type Client struct {
	baseURL              string
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

// CheckHealth queries the Identity service health endpoint to determine if it is
// HEALTHY, DEGRADED, or NOT_READY, returning the status as a string.
func (c *Client) CheckHealth(ctx context.Context) string {
	if c.baseURL == "" {
		return "NOT_READY"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/identity/readiness", nil)
	if err != nil {
		return "NOT_READY"
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return "NOT_READY"
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var healthResp struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&healthResp); err == nil {
			if strings.ToUpper(healthResp.Status) == "DEGRADED" {
				return "DEGRADED"
			}
		}
		return "HEALTHY"
	}

	if resp.StatusCode == http.StatusServiceUnavailable {
		var healthResp struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&healthResp); err == nil {
			if strings.ToUpper(healthResp.Status) == "DEGRADED" {
				return "DEGRADED"
			}
		}
	}

	return "NOT_READY"
}

// IsSessionValid securely queries the Identity backend using the internal service token
// to determine if the given session is active and not compromised.
func (c *Client) IsSessionValid(ctx context.Context, actorID, sessionID string) (bool, error) {
	if c.baseURL == "" || c.internalServiceToken == "" {
		return false, ErrIdentityUnavailable
	}
	if strings.TrimSpace(actorID) == "" || strings.TrimSpace(sessionID) == "" {
		return false, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/actors/"+actorID+"/sessions", nil)
	if err != nil {
		return false, ErrIdentityUnavailable
	}
	req.Header.Set("X-Service-Caller", c.internalServiceToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return false, ErrIdentityUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return false, ErrIdentityUnavailable
	}

	var sessions []struct {
		SessionID     string `json:"sessionId"`
		CompromisedAt string `json:"compromisedAt"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sessions); err != nil {
		return false, ErrIdentityUnavailable
	}

	for _, s := range sessions {
		if s.SessionID == sessionID {
			if s.CompromisedAt != "" {
				return false, nil // Compromised
			}
			return true, nil // Valid
		}
	}
	return false, nil
}

// ResolvePermissions queries the RBAC registry in Identity for the canonical
// permission set of the given operator actor. This is the deny-by-default
// authority: only permissions explicitly granted through the relational RBAC
// schema are returned. A missing or unconfigured internal token returns
// ErrIdentityUnavailable so callers must treat unavailability as a denial.
func (c *Client) ResolvePermissions(ctx context.Context, actorID string) ([]Permission, error) {
	if c.baseURL == "" || c.internalServiceToken == "" {
		return nil, ErrIdentityUnavailable
	}
	if strings.TrimSpace(actorID) == "" {
		return nil, ErrIdentityUnavailable
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/permissions/resolve", nil)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	q := req.URL.Query()
	q.Set("actorId", actorID)
	req.URL.RawQuery = q.Encode()
	req.Header.Set("Authorization", "Bearer "+c.internalServiceToken)
	req.Header.Set("X-Service-Caller", "dsh")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}

	var result struct {
		Permissions []Permission `json:"permissions"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return result.Permissions, nil
}

var (
	// ErrRbacSelfGrant mirrors Identity's self-grant/self-revoke rejection.
	ErrRbacSelfGrant = errors.New("self-grant or self-revoke is prohibited")
	// ErrRbacRoleNotFound mirrors Identity's unknown-role rejection.
	ErrRbacRoleNotFound = errors.New("role does not exist in the Identity vocabulary")
	// ErrRbacRoleAlreadyExists mirrors Identity's duplicate-role rejection.
	ErrRbacRoleAlreadyExists = errors.New("role already exists in Identity")
)

// RbacRole is the canonical Identity role definition, as returned by the
// Identity RBAC internal API.
type RbacRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// RbacActorRoleAssignment is the canonical Identity actor→role grant.
type RbacActorRoleAssignment struct {
	ActorID   string `json:"actorId"`
	RoleID    string `json:"roleId"`
	RoleName  string `json:"roleName"`
	GrantedBy string `json:"grantedBy"`
}

func (c *Client) rbacRequest(ctx context.Context, method, path string, query map[string]string, body any) (*http.Response, error) {
	if c.baseURL == "" || c.internalServiceToken == "" {
		return nil, ErrIdentityUnavailable
	}
	var bodyReader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	if len(query) > 0 {
		q := req.URL.Query()
		for key, value := range query {
			q.Set(key, value)
		}
		req.URL.RawQuery = q.Encode()
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+c.internalServiceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	return resp, nil
}

// ListRoles returns every durable role definition owned by Identity. DSH
// must not maintain a role vocabulary of its own; this call is the only
// legitimate source for "what roles exist."
func (c *Client) ListRoles(ctx context.Context) ([]RbacRole, error) {
	resp, err := c.rbacRequest(ctx, http.MethodGet, "/internal/rbac/roles", nil, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var result struct {
		Roles []RbacRole `json:"roles"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return result.Roles, nil
}

// CreateRole creates a new durable role definition in Identity. This is the
// canonical mutation an approved DSH role-definition request must invoke
// before it may report the role as active; DSH never activates a role name
// in its own storage without this call succeeding first.
func (c *Client) CreateRole(ctx context.Context, name, description string) (RbacRole, error) {
	resp, err := c.rbacRequest(ctx, http.MethodPost, "/internal/rbac/roles", nil, map[string]string{
		"name":        name,
		"description": description,
	})
	if err != nil {
		return RbacRole{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusCreated:
		var role RbacRole
		if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
			return RbacRole{}, ErrIdentityUnavailable
		}
		return role, nil
	case http.StatusConflict:
		return RbacRole{}, ErrRbacRoleAlreadyExists
	case http.StatusBadRequest:
		return RbacRole{}, fmt.Errorf("invalid role definition: %s", name)
	default:
		return RbacRole{}, ErrIdentityUnavailable
	}
}

// RbacStaffActor is an Identity actor holding at least one durable role
// assignment.
type RbacStaffActor struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Roles     []string  `json:"roles"`
	GrantedAt time.Time `json:"grantedAt"`
}

// ListStaff returns every actor Identity has granted at least one durable
// role. DSH must not report a permanently empty staff list; this is the
// canonical source.
func (c *Client) ListStaff(ctx context.Context) ([]RbacStaffActor, error) {
	resp, err := c.rbacRequest(ctx, http.MethodGet, "/internal/rbac/staff", nil, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var result struct {
		Staff []RbacStaffActor `json:"staff"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return result.Staff, nil
}

// GrantRole applies a canonical actor→role assignment in Identity. This is
// the mutation an approved DSH staff-role-assignment request must invoke
// before its approval status may flip to approved; a failure here leaves
// the approval unapplied and must not be overridden by a local write.
func (c *Client) GrantRole(ctx context.Context, targetActorID, roleName, requestedByActorID string) (RbacActorRoleAssignment, error) {
	resp, err := c.rbacRequest(ctx, http.MethodPost, "/internal/rbac/actors/"+targetActorID+"/roles", nil, map[string]string{
		"roleName":           roleName,
		"requestedByActorId": requestedByActorID,
	})
	if err != nil {
		return RbacActorRoleAssignment{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		var assignment RbacActorRoleAssignment
		if err := json.NewDecoder(resp.Body).Decode(&assignment); err != nil {
			return RbacActorRoleAssignment{}, ErrIdentityUnavailable
		}
		return assignment, nil
	case http.StatusNotFound:
		return RbacActorRoleAssignment{}, ErrRbacRoleNotFound
	case http.StatusBadRequest:
		return RbacActorRoleAssignment{}, ErrRbacSelfGrant
	default:
		return RbacActorRoleAssignment{}, ErrIdentityUnavailable
	}
}

// RevokeRole applies the canonical inverse of GrantRole in Identity. This is
// the mutation an approved DSH rollback request must invoke before its
// status may flip to approved.
func (c *Client) RevokeRole(ctx context.Context, targetActorID, roleName, requestedByActorID string) error {
	resp, err := c.rbacRequest(ctx, http.MethodDelete, "/internal/rbac/actors/"+targetActorID+"/roles", map[string]string{
		"roleName":           roleName,
		"requestedByActorId": requestedByActorID,
	}, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusNoContent:
		return nil
	case http.StatusBadRequest:
		return ErrRbacSelfGrant
	default:
		return ErrIdentityUnavailable
	}
}
