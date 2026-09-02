package auth

import (
	"context"
	"strings"
)

// ListPermissionVocabulary returns the canonical Identity capability
// vocabulary. DSH uses this before a governed role-definition write so
// unknown actions fail closed without creating a local capability model.
func (c *Client) ListPermissionVocabulary(ctx context.Context, service, surface string) ([]RbacPermissionVocabularyEntry, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	return c.identity.ListPermissionVocabulary(ctx, strings.TrimSpace(service), strings.TrimSpace(surface), operatorContextID)
}

// GetRoleDefinition reads one complete canonical role definition from
// Identity. RbacRoleDefinition is a facade alias for Identity's generated
// RbacRole contract model.
func (c *Client) GetRoleDefinition(ctx context.Context, roleName string) (RbacRoleDefinition, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return RbacRoleDefinition{}, err
	}
	return c.identity.GetRoleDefinition(ctx, strings.TrimSpace(roleName), operatorContextID)
}

// UpsertRoleDefinition makes the Identity-owned role exactly match the
// supplied canonical permission bindings. Identity validates the vocabulary
// and commits the role plus bindings atomically.
func (c *Client) UpsertRoleDefinition(ctx context.Context, roleName, description string, active bool, expectedVersion int, permissions []Permission, idempotencyKey string) (RbacRoleDefinition, error) {
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return RbacRoleDefinition{}, err
	}
	return c.identity.UpsertRoleDefinition(ctx, operatorContextID, strings.TrimSpace(roleName), description, active, expectedVersion, permissions, idempotencyKey)
}
