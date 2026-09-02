package auth

import (
	"context"

	"dsh-api/internal/opctx"
	"strings"
	"sync"

	identityauth "github.com/bthwani2-boop/bthwani-identityauth"
)

var (
	ErrUnauthenticated           = identityauth.ErrUnauthenticated
	ErrIdentityUnavailable       = identityauth.ErrIdentityUnavailable
	ErrRbacSelfGrant             = identityauth.ErrRbacSelfGrant
	ErrRbacRoleNotFound          = identityauth.ErrRbacRoleNotFound
	ErrRbacRoleAlreadyExists     = identityauth.ErrRbacRoleAlreadyExists
	ErrRbacConflict              = identityauth.ErrRbacConflict
	ErrRbacVersionConflict       = identityauth.ErrRbacVersionConflict
	ErrRbacInvalidRoleDefinition = identityauth.ErrRbacInvalidRoleDefinition
)

// These aliases keep DSH's application facade stable while making Identity's
// generated contract types the only wire-model owner.
type Permission = identityauth.Permission
type ActorIdentity = identityauth.ActorIdentity
type PartnerPermissionBundleDescriptor = identityauth.PartnerPermissionBundleDescriptor
type RbacRole = identityauth.RbacRole
type RbacActorRoleAssignment = identityauth.RbacActorRoleAssignment
type RbacStaffActor = identityauth.RbacStaffActor
type RbacPermissionVocabularyEntry = identityauth.PermissionVocabularyEntry
type RbacRoleDefinition = identityauth.RbacRole

type Client struct {
	identity *identityauth.Client

	mu                   sync.RWMutex
	partnerBundles       []PartnerPermissionBundleDescriptor
	partnerBundlesLoaded bool
}

func NewClient(baseURL string) *Client {
	return NewClientWithInternalAccess(baseURL, "", "")
}

// NewClientWithInternalAccess configures the DSH-to-Identity trust boundary.
// The service token is server-owned configuration. Operator context is
// resolved per request from the trusted Identity boundary.
func NewClientWithInternalAccess(baseURL, serviceToken, _ string) *Client {
	return &Client{
		identity: identityauth.NewClientWithInternalAccess(baseURL, serviceToken, "dsh"),
	}
}

func (c *Client) operatorContextID(ctx context.Context) (string, error) {
	if c == nil || c.identity == nil {
		return "", ErrIdentityUnavailable
	}
	operatorContextID, ok := opctx.OperatorContextIDFromContext(ctx)
	if !ok || operatorContextID == "legacy-unscoped" {
		return "", ErrIdentityUnavailable
	}
	return operatorContextID, nil
}

// Resolve accepts only authenticated Identity assertions with an explicit
// operator context. The Identity session is the operator-context authority;
// a process-wide default is never used to select or reject a valid session.
func (c *Client) Resolve(ctx context.Context, authorization string) (identityauth.ActorIdentity, error) {
	if c == nil || c.identity == nil {
		return identityauth.ActorIdentity{}, ErrIdentityUnavailable
	}
	return c.identity.Resolve(ctx, authorization)
}

func clonePartnerPermissionBundles(source []PartnerPermissionBundleDescriptor) []PartnerPermissionBundleDescriptor {
	result := make([]PartnerPermissionBundleDescriptor, len(source))
	for index, descriptor := range source {
		result[index] = descriptor
		result[index].Actions = append([]string(nil), descriptor.Actions...)
	}
	return result
}

// FetchPartnerPermissionBundles retrieves the canonical Identity-owned
// partner permission bundles through the authenticated DSH service boundary.
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
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	bundles, err := c.identity.FetchPartnerPermissionBundles(ctx, operatorContextID)
	if err != nil {
		return nil, err
	}
	c.partnerBundles = clonePartnerPermissionBundles(bundles)
	c.partnerBundlesLoaded = true
	return clonePartnerPermissionBundles(c.partnerBundles), nil
}

// CheckHealth queries the canonical Identity readiness endpoint.
func (c *Client) CheckHealth(ctx context.Context) string {
	if c == nil || c.identity == nil {
		return "NOT_READY"
	}
	return c.identity.CheckHealth(ctx)
}

// IsSessionValid securely queries Identity using the internal service token.
func (c *Client) IsSessionValid(ctx context.Context, actorID, sessionID string) (bool, error) {
	if c == nil || c.identity == nil {
		return false, ErrIdentityUnavailable
	}
	return c.identity.IsSessionValid(ctx, actorID, sessionID)
}

// ResolvePermissions returns the deny-by-default canonical RBAC projection.
func (c *Client) ResolvePermissions(ctx context.Context, actorID string) ([]Permission, error) {
	if strings.TrimSpace(actorID) == "" {
		return nil, ErrIdentityUnavailable
	}
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	return c.identity.ResolvePermissions(ctx, actorID, operatorContextID)
}

func (c *Client) ListRoles(ctx context.Context) ([]RbacRole, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	return c.identity.ListRoles(ctx, operatorContextID)
}

func (c *Client) ListStaff(ctx context.Context) ([]RbacStaffActor, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	return c.identity.ListStaff(ctx, operatorContextID)
}

func (c *Client) ListActorRoleAssignments(ctx context.Context, actorID string) ([]RbacActorRoleAssignment, error) {
	if strings.TrimSpace(actorID) == "" {
		return nil, ErrIdentityUnavailable
	}
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	return c.identity.ListActorRoleAssignments(ctx, actorID, operatorContextID)
}

func (c *Client) GrantRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey string) (RbacActorRoleAssignment, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return RbacActorRoleAssignment{}, err
	}
	return c.identity.GrantRoleWithIdempotency(ctx, operatorContextID, targetActorID, roleName, requestedByActorID, expectedRoleVersion, idempotencyKey)
}

func (c *Client) RevokeRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey string) error {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return err
	}
	return c.identity.RevokeRoleWithIdempotency(ctx, operatorContextID, targetActorID, roleName, requestedByActorID, expectedRoleVersion, idempotencyKey)
}
