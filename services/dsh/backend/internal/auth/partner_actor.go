package auth

import (
	"context"
	"errors"
	"strings"

	identityauth "github.com/bthwani2-boop/bthwani-identityauth"
)

var (
	ErrIdentityConflict = identityauth.ErrIdentityConflict
	ErrIdentityRejected = identityauth.ErrIdentityRejected
)

type PartnerActorProvisionInput = identityauth.PartnerActorProvisionRequest
type PartnerActorView = identityauth.ActorAdminView
type PartnerActivationInput = identityauth.PartnerActivationRequest
type PartnerStoreAccessInput = identityauth.PartnerStoreAccessRequest
type PartnerActivationResult = identityauth.IssueActivationResponse

func (c *Client) ProvisionPartnerActor(ctx context.Context, input PartnerActorProvisionInput) (PartnerActorView, error) {
	var view PartnerActorView
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	input.PermissionBundle = strings.TrimSpace(input.PermissionBundle)
	input.StoreID = strings.TrimSpace(input.StoreID)
	if input.Username == "" || input.PhoneE164 == "" || input.PermissionBundle == "" || input.StoreID == "" {
		return view, ErrIdentityRejected
	}
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return view, err
	}
	view, err = c.identity.ProvisionPartnerActor(ctx, operatorContextID, input)
	if err != nil {
		if errors.Is(err, identityauth.ErrIdentityRejected) {
			return PartnerActorView{}, ErrIdentityRejected
		}
		if errors.Is(err, identityauth.ErrIdentityConflict) {
			return PartnerActorView{}, ErrIdentityConflict
		}
		return PartnerActorView{}, err
	}
	return view, nil
}

// SetPartnerStoreAccess replaces or revokes one actor's Identity-owned
// executable permissions for a single DSH store.
func (c *Client) SetPartnerStoreAccess(ctx context.Context, actorID string, input PartnerStoreAccessInput) error {
	actorID = strings.TrimSpace(actorID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.PermissionBundle = strings.TrimSpace(input.PermissionBundle)
	if actorID == "" || input.StoreID == "" || (input.Enabled && input.PermissionBundle == "") || (input.Reactivate && !input.Enabled) {
		return ErrIdentityRejected
	}
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return err
	}
	err = c.identity.SetPartnerStoreAccess(ctx, operatorContextID, actorID, input)
	if errors.Is(err, identityauth.ErrIdentityRejected) {
		return ErrIdentityRejected
	}
	if errors.Is(err, identityauth.ErrIdentityConflict) {
		return ErrIdentityConflict
	}
	return err
}

func (c *Client) IssuePartnerActivation(ctx context.Context, actorID string, input PartnerActivationInput, idempotencyKey, correlationID string) (PartnerActivationResult, error) {
	var result PartnerActivationResult
	actorID = strings.TrimSpace(actorID)
	input.IssuedByActorID = strings.TrimSpace(input.IssuedByActorID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	if actorID == "" || input.IssuedByActorID == "" || input.StoreID == "" {
		return result, ErrIdentityRejected
	}
	operatorContextID, err := c.operatorContextID(ctx)
	if err != nil {
		return result, err
	}
	result, err = c.identity.IssuePartnerActivation(ctx, operatorContextID, actorID, input, strings.TrimSpace(idempotencyKey), strings.TrimSpace(correlationID))
	if errors.Is(err, identityauth.ErrIdentityRejected) {
		return PartnerActivationResult{}, ErrIdentityRejected
	}
	if errors.Is(err, identityauth.ErrIdentityConflict) {
		return PartnerActivationResult{}, ErrIdentityConflict
	}
	return result, err
}
