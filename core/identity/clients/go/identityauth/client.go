// Package identityauth resolves authenticated end-user sessions through the
// canonical Identity service for backend consumers.
package identityauth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var (
	ErrUnauthenticated     = errors.New("unauthenticated")
	ErrIdentityUnavailable = errors.New("identity unavailable")

	ErrRbacSelfGrant             = errors.New("self-grant or self-revoke is prohibited")
	ErrRbacRoleNotFound          = errors.New("role does not exist in the Identity vocabulary")
	ErrRbacRoleAlreadyExists     = errors.New("role already exists in Identity")
	ErrRbacConflict              = errors.New("canonical RBAC request conflicted")
	ErrRbacVersionConflict       = errors.New("canonical role version conflicted")
	ErrRbacInvalidRoleDefinition = errors.New("invalid canonical role definition")
	ErrIdentityConflict          = errors.New("identity conflict")
	ErrIdentityRejected          = errors.New("identity request rejected")
)

type Client struct {
	baseURL              string
	http                 *http.Client
	internalServiceToken string
	serviceCaller        string
}

const identityResolveAttempts = 3

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 3 * time.Second},
	}
}

// NewClientWithInternalAccess configures a trusted service-to-Identity
// boundary. The token and service caller are owned by the service process,
// while operator context remains request-scoped and explicit.
func NewClientWithInternalAccess(baseURL, serviceToken, serviceCaller string) *Client {
	return &Client{
		baseURL:              strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		http:                 &http.Client{Timeout: 3 * time.Second},
		internalServiceToken: strings.TrimSpace(serviceToken),
		serviceCaller:        strings.TrimSpace(serviceCaller),
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

func (c *Client) internalRequest(ctx context.Context, method, path string, query map[string]string, body any, operatorContextID string, headers map[string]string) (*http.Response, error) {
	if c == nil || c.baseURL == "" || c.internalServiceToken == "" {
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
		values := req.URL.Query()
		for key, value := range query {
			values.Set(key, value)
		}
		req.URL.RawQuery = values.Encode()
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+c.internalServiceToken)
	if c.serviceCaller != "" {
		req.Header.Set("X-Service-Caller", c.serviceCaller)
	}
	if operatorContextID = strings.TrimSpace(operatorContextID); operatorContextID != "" {
		req.Header.Set("X-Operator-Context-ID", operatorContextID)
	}
	for key, value := range headers {
		if strings.TrimSpace(value) != "" {
			req.Header.Set(key, value)
		}
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	return resp, nil
}

func requireOperatorContext(operatorContextID string) (string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || operatorContextID == "legacy-unscoped" {
		return "", ErrIdentityUnavailable
	}
	return operatorContextID, nil
}

// FetchPartnerPermissionBundles reads the Identity-owned partner permission
// bundle vocabulary for a scoped internal caller.
func (c *Client) FetchPartnerPermissionBundles(ctx context.Context, operatorContextID string) ([]PartnerPermissionBundleDescriptor, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return nil, err
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/partner/permission-bundles", nil, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ListPartnerPermissionBundlesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.PermissionBundles, nil
}

func (c *Client) ProvisionPartnerActor(ctx context.Context, operatorContextID string, request PartnerActorProvisionRequest) (ActorAdminView, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return ActorAdminView{}, err
	}
	resp, err := c.internalRequest(ctx, http.MethodPost, "/internal/partner/actors/provision", nil, request, operatorContextID, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusCreated {
		return ActorAdminView{}, identityMutationError(resp.StatusCode)
	}
	var view ActorAdminView
	if err := json.NewDecoder(resp.Body).Decode(&view); err != nil || strings.TrimSpace(view.ActorID) == "" {
		return ActorAdminView{}, ErrIdentityUnavailable
	}
	return view, nil
}

func (c *Client) SetPartnerStoreAccess(ctx context.Context, operatorContextID, actorID string, request PartnerStoreAccessRequest) error {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return ErrIdentityRejected
	}
	resp, err := c.internalRequest(ctx, http.MethodPut, "/internal/partner/actors/"+url.PathEscape(actorID)+"/store-access", nil, request, operatorContextID, nil)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return identityMutationError(resp.StatusCode)
	}
	return nil
}

func (c *Client) IssuePartnerActivation(ctx context.Context, operatorContextID, actorID string, request PartnerActivationRequest, idempotencyKey, correlationID string) (IssueActivationResponse, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return IssueActivationResponse{}, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return IssueActivationResponse{}, ErrIdentityRejected
	}
	resp, err := c.internalRequest(ctx, http.MethodPost, "/internal/partner/actors/"+url.PathEscape(actorID)+"/activations", nil, request, operatorContextID, map[string]string{
		"Idempotency-Key":  idempotencyKey,
		"X-Correlation-ID": correlationID,
	})
	if err != nil {
		return IssueActivationResponse{}, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusCreated {
		return IssueActivationResponse{}, identityMutationError(resp.StatusCode)
	}
	var result IssueActivationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || strings.TrimSpace(result.ActivationID) == "" || strings.TrimSpace(result.Code) == "" {
		return IssueActivationResponse{}, ErrIdentityUnavailable
	}
	return result, nil
}

// CheckHealth returns the canonical Identity readiness state.
func (c *Client) CheckHealth(ctx context.Context) string {
	if c == nil || c.baseURL == "" {
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
	defer func() { _ = resp.Body.Close() }()

	var healthResp RuntimeStatus
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusServiceUnavailable {
		if err := json.NewDecoder(resp.Body).Decode(&healthResp); err == nil && strings.EqualFold(healthResp.Status, "DEGRADED") {
			return "DEGRADED"
		}
		if resp.StatusCode == http.StatusOK {
			return "HEALTHY"
		}
	}
	return "NOT_READY"
}

func identityMutationError(status int) error {
	switch status {
	case http.StatusBadRequest, http.StatusForbidden, http.StatusNotFound, http.StatusUnprocessableEntity:
		return ErrIdentityRejected
	case http.StatusConflict, http.StatusTooManyRequests:
		return ErrIdentityConflict
	default:
		return ErrIdentityUnavailable
	}
}

// IsSessionValid securely queries Identity using the internal service token.
func (c *Client) IsSessionValid(ctx context.Context, actorID, sessionID string) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	sessionID = strings.TrimSpace(sessionID)
	if actorID == "" || sessionID == "" {
		return false, nil
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/dsh/actors/"+url.PathEscape(actorID)+"/sessions", nil, nil, "", nil)
	if err != nil {
		return false, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return false, ErrIdentityUnavailable
	}

	var sessions []SessionInfo
	if err := json.NewDecoder(resp.Body).Decode(&sessions); err != nil {
		return false, ErrIdentityUnavailable
	}
	for _, session := range sessions {
		if session.SessionID == sessionID {
			return session.CompromisedAt == nil, nil
		}
	}
	return false, nil
}

// ResolvePermissions is the deny-by-default canonical RBAC read.
func (c *Client) ResolvePermissions(ctx context.Context, actorID, operatorContextID string) ([]Permission, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil || strings.TrimSpace(actorID) == "" {
		return nil, ErrIdentityUnavailable
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/permissions/resolve", map[string]string{"actorId": strings.TrimSpace(actorID)}, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ResolveActorPermissionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.Permissions, nil
}

func (c *Client) ListRoles(ctx context.Context, operatorContextID string) ([]RbacRole, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return nil, err
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/rbac/roles", nil, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ListRBACRolesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.Roles, nil
}

func (c *Client) ListStaff(ctx context.Context, operatorContextID string) ([]RbacStaffActor, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return nil, err
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/rbac/staff", nil, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ListRBACStaffResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.Staff, nil
}

func (c *Client) ListActorRoleAssignments(ctx context.Context, actorID, operatorContextID string) ([]RbacActorRoleAssignment, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, ErrIdentityUnavailable
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/rbac/actors/"+url.PathEscape(actorID)+"/roles", nil, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ListRBACActorRoleAssignmentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.Assignments, nil
}

func (c *Client) GrantRoleWithIdempotency(ctx context.Context, operatorContextID, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey string) (RbacActorRoleAssignment, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return RbacActorRoleAssignment{}, err
	}
	targetActorID = strings.TrimSpace(targetActorID)
	if targetActorID == "" {
		return RbacActorRoleAssignment{}, ErrIdentityUnavailable
	}
	request := RbacRoleGrantRequest{
		RoleName:            roleName,
		RequestedByActorID:  requestedByActorID,
		ExpectedRoleVersion: expectedRoleVersion,
	}
	resp, err := c.internalRequest(ctx, http.MethodPost, "/internal/rbac/actors/"+url.PathEscape(targetActorID)+"/roles", nil, request, operatorContextID, map[string]string{
		"Idempotency-Key":       idempotencyKey,
		"X-Canonical-Intent-ID": idempotencyKey,
	})
	if err != nil {
		return RbacActorRoleAssignment{}, err
	}
	defer func() { _ = resp.Body.Close() }()
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
	case http.StatusConflict:
		return RbacActorRoleAssignment{}, rbacConflictError(resp)
	default:
		return RbacActorRoleAssignment{}, ErrIdentityUnavailable
	}
}

func (c *Client) RevokeRoleWithIdempotency(ctx context.Context, operatorContextID, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey string) error {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return err
	}
	targetActorID = strings.TrimSpace(targetActorID)
	if targetActorID == "" {
		return ErrIdentityUnavailable
	}
	resp, err := c.internalRequest(ctx, http.MethodDelete, "/internal/rbac/actors/"+url.PathEscape(targetActorID)+"/roles", map[string]string{
		"roleName":            roleName,
		"requestedByActorId":  requestedByActorID,
		"expectedRoleVersion": strconv.Itoa(expectedRoleVersion),
	}, nil, operatorContextID, map[string]string{
		"Idempotency-Key":       idempotencyKey,
		"X-Canonical-Intent-ID": idempotencyKey,
	})
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	switch resp.StatusCode {
	case http.StatusNoContent:
		return nil
	case http.StatusBadRequest:
		return ErrRbacSelfGrant
	case http.StatusConflict:
		return rbacConflictError(resp)
	default:
		return ErrIdentityUnavailable
	}
}

func (c *Client) ListPermissionVocabulary(ctx context.Context, service, surface, operatorContextID string) ([]PermissionVocabularyEntry, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return nil, err
	}
	query := map[string]string{}
	if service != "" {
		query["service"] = service
	}
	if surface != "" {
		query["surface"] = surface
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/rbac/permission-vocabulary", query, nil, operatorContextID, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var response ListRBACPermissionVocabularyResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return response.Permissions, nil
}

func (c *Client) GetRoleDefinition(ctx context.Context, roleName, operatorContextID string) (RbacRole, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return RbacRole{}, err
	}
	resp, err := c.internalRequest(ctx, http.MethodGet, "/internal/rbac/role-definitions/"+url.PathEscape(roleName), nil, nil, operatorContextID, nil)
	if err != nil {
		return RbacRole{}, err
	}
	defer func() { _ = resp.Body.Close() }()
	switch resp.StatusCode {
	case http.StatusOK:
		var role RbacRole
		if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
			return RbacRole{}, ErrIdentityUnavailable
		}
		return role, nil
	case http.StatusNotFound:
		return RbacRole{}, ErrRbacRoleNotFound
	default:
		return RbacRole{}, ErrIdentityUnavailable
	}
}

func (c *Client) UpsertRoleDefinition(ctx context.Context, operatorContextID, roleName, description string, active bool, expectedVersion int, permissions []Permission, idempotencyKey string) (RbacRole, error) {
	var err error
	operatorContextID, err = requireOperatorContext(operatorContextID)
	if err != nil {
		return RbacRole{}, err
	}
	request := RbacRoleDefinitionRequest{
		Description:     description,
		Active:          active,
		ExpectedVersion: expectedVersion,
		Permissions:     permissions,
	}
	resp, err := c.internalRequest(ctx, http.MethodPut, "/internal/rbac/role-definitions/"+url.PathEscape(roleName), nil, request, operatorContextID, map[string]string{
		"Idempotency-Key":       idempotencyKey,
		"X-Canonical-Intent-ID": idempotencyKey,
	})
	if err != nil {
		return RbacRole{}, err
	}
	defer func() { _ = resp.Body.Close() }()
	switch resp.StatusCode {
	case http.StatusOK:
		var role RbacRole
		if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
			return RbacRole{}, ErrIdentityUnavailable
		}
		return role, nil
	case http.StatusBadRequest:
		return RbacRole{}, ErrRbacInvalidRoleDefinition
	case http.StatusConflict:
		return RbacRole{}, ErrRbacVersionConflict
	default:
		return RbacRole{}, ErrIdentityUnavailable
	}
}

func rbacConflictError(resp *http.Response) error {
	var payload ApiError
	if err := json.NewDecoder(resp.Body).Decode(&payload); err == nil && payload.Code == "ROLE_VERSION_CONFLICT" {
		return ErrRbacVersionConflict
	}
	return ErrRbacConflict
}
