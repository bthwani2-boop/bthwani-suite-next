package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"time"
)

var ErrRbacInvalidRoleDefinition = errors.New("invalid canonical role definition")

// RbacPermissionVocabularyEntry is one Identity-owned capability that DSH may
// reference when proposing a governed role definition.
type RbacPermissionVocabularyEntry struct {
	ID          string `json:"id"`
	Service     string `json:"service"`
	Surface     string `json:"surface"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

// RbacRoleDefinition is the complete canonical Identity-owned role truth.
type RbacRoleDefinition struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Active      bool         `json:"active"`
	Version     int          `json:"version"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
	Permissions []Permission `json:"permissions"`
}

// ListPermissionVocabulary returns the canonical Identity capability vocabulary.
// DSH uses this before a governed role-definition write so unknown actions fail
// closed without creating a local or implicit capability.
func (c *Client) ListPermissionVocabulary(ctx context.Context, service, surface string) ([]RbacPermissionVocabularyEntry, error) {
	query := map[string]string{}
	if service != "" {
		query["service"] = service
	}
	if surface != "" {
		query["surface"] = surface
	}
	resp, err := c.rbacRequest(ctx, http.MethodGet, "/internal/rbac/permission-vocabulary", query, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrIdentityUnavailable
	}
	var result struct {
		Permissions []RbacPermissionVocabularyEntry `json:"permissions"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, ErrIdentityUnavailable
	}
	return result.Permissions, nil
}

// GetRoleDefinition reads one complete canonical role definition from Identity.
func (c *Client) GetRoleDefinition(ctx context.Context, roleName string) (RbacRoleDefinition, error) {
	resp, err := c.rbacRequest(ctx, http.MethodGet, "/internal/rbac/role-definitions/"+url.PathEscape(roleName), nil, nil)
	if err != nil {
		return RbacRoleDefinition{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		var role RbacRoleDefinition
		if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
			return RbacRoleDefinition{}, ErrIdentityUnavailable
		}
		return role, nil
	case http.StatusNotFound:
		return RbacRoleDefinition{}, ErrRbacRoleNotFound
	default:
		return RbacRoleDefinition{}, ErrIdentityUnavailable
	}
}

// UpsertRoleDefinition makes the Identity-owned role exactly match the supplied
// canonical permission bindings. Identity validates the vocabulary and commits
// the role plus bindings atomically.
func (c *Client) UpsertRoleDefinition(ctx context.Context, roleName, description string, active bool, expectedVersion int, permissions []Permission, idempotencyKey string) (RbacRoleDefinition, error) {
	resp, err := c.rbacRequestWithHeaders(ctx, http.MethodPut, "/internal/rbac/role-definitions/"+url.PathEscape(roleName), nil, map[string]any{
		"description":     description,
		"active":          active,
		"expectedVersion": expectedVersion,
		"permissions":     permissions,
	}, map[string]string{"Idempotency-Key": idempotencyKey, "X-Canonical-Intent-ID": idempotencyKey})
	if err != nil {
		return RbacRoleDefinition{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		var role RbacRoleDefinition
		if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
			return RbacRoleDefinition{}, ErrIdentityUnavailable
		}
		return role, nil
	case http.StatusBadRequest:
		return RbacRoleDefinition{}, ErrRbacInvalidRoleDefinition
	case http.StatusConflict:
		return RbacRoleDefinition{}, ErrRbacVersionConflict
	default:
		return RbacRoleDefinition{}, ErrIdentityUnavailable
	}
}
