package partner

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"sync"

	"dsh-api/internal/auth"
)

var (
	partnerIdentityClientMu sync.RWMutex
	partnerIdentityClient   *auth.Client
)

// ConfigureIdentityClient binds the process-level DSH Identity client before
// HTTP serving begins. It keeps service credentials in the composition root
// instead of reading environment variables inside business handlers.
func ConfigureIdentityClient(client *auth.Client) {
	if client == nil {
		panic("partner identity client is required")
	}
	partnerIdentityClientMu.Lock()
	defer partnerIdentityClientMu.Unlock()
	if partnerIdentityClient != nil && partnerIdentityClient != client {
		panic("partner identity client is already configured")
	}
	partnerIdentityClient = client
}

func configuredIdentityClient() *auth.Client {
	partnerIdentityClientMu.RLock()
	defer partnerIdentityClientMu.RUnlock()
	return partnerIdentityClient
}

type ProvisionedTeamInvite struct {
	MemberID string
	ActorID  string
	Role     string
	Phone    string
	Replayed bool
}

type TeamInvitationResult struct {
	MemberID       string                        `json:"memberId"`
	ActorID        string                        `json:"actorId"`
	Role           string                        `json:"role"`
	Replayed       bool                          `json:"replayed"`
	Activation     *auth.PartnerActivationResult `json:"activation,omitempty"`
	ActivationState string                       `json:"activationState"`
}

func partnerInviteUsername(phone string) string {
	value := strings.NewReplacer("+", "", " ", "", "-", "", "(", "", ")", "").Replace(strings.TrimSpace(phone))
	return "partner-" + value
}

// UpsertProvisionedStoreTeamInvite binds the DSH membership to the sovereign
// Identity actor. The existing database trigger serializes pending invitations
// by store+phone; this function additionally rejects role or actor drift.
func UpsertProvisionedStoreTeamInvite(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	input InviteTeamMemberInput,
	actorID string,
) (ProvisionedTeamInvite, error) {
	if err := input.Validate(); err != nil {
		return ProvisionedTeamInvite{}, err
	}
	storeID = strings.TrimSpace(storeID)
	phone := strings.TrimSpace(input.Identity)
	actorID = strings.TrimSpace(actorID)
	if storeID == "" || phone == "" || actorID == "" {
		return ProvisionedTeamInvite{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProvisionedTeamInvite{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "dsh-team-invite:"+storeID+":"+strings.ToLower(phone)); err != nil {
		return ProvisionedTeamInvite{}, err
	}

	var existing ProvisionedTeamInvite
	err = tx.QueryRowContext(ctx, `
		SELECT id, COALESCE(identity_actor_id, ''), role, invited_identity
		FROM dsh_store_team_members
		WHERE store_id = $1
		  AND lower(btrim(invited_identity)) = lower(btrim($2))
		  AND status = 'invited'
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, storeID, phone).Scan(&existing.MemberID, &existing.ActorID, &existing.Role, &existing.Phone)
	if err == nil {
		if existing.Role != input.Role || (existing.ActorID != "" && existing.ActorID != actorID) {
			return ProvisionedTeamInvite{}, ErrConflict
		}
		if existing.ActorID == "" {
			if _, err := tx.ExecContext(ctx, `
				UPDATE dsh_store_team_members
				SET identity_actor_id = $2,
				    invite_lifecycle = 'تم ربط الهوية وبانتظار إصدار رمز الدخول',
				    updated_at = now()
				WHERE id = $1`, existing.MemberID, actorID); err != nil {
				return ProvisionedTeamInvite{}, err
			}
			existing.ActorID = actorID
		}
		existing.Replayed = true
		if err := tx.Commit(); err != nil {
			return ProvisionedTeamInvite{}, err
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ProvisionedTeamInvite{}, err
	}

	var memberID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_store_team_members (
			store_id, name, role, status, invite_lifecycle, invited_identity,
			invited_by_actor_id, identity_actor_id
		) VALUES ($1, $2, $3, 'invited', 'تم ربط الهوية وبانتظار إصدار رمز الدخول', $2, $4, $5)
		RETURNING id`, storeID, phone, input.Role, input.InvitedByActorID, actorID).Scan(&memberID)
	if err != nil {
		return ProvisionedTeamInvite{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProvisionedTeamInvite{}, err
	}
	return ProvisionedTeamInvite{
		MemberID: memberID,
		ActorID:  actorID,
		Role:     input.Role,
		Phone:    phone,
	}, nil
}

func recordTeamInviteActivationState(ctx context.Context, db *sql.DB, memberID, lifecycle, activationID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET invite_lifecycle = $2,
		    audit_note = CASE WHEN $3 = '' THEN audit_note ELSE 'identity_activation_id=' || $3 END,
		    updated_at = now()
		WHERE id = $1 AND status = 'invited'`, memberID, lifecycle, strings.TrimSpace(activationID))
	return err
}

// CreateGovernedTeamInvitation provisions the Identity actor, binds the DSH
// membership, then issues a store-scoped app-partner code. Raw codes are never
// persisted by DSH and are returned only by the successful issuance response.
func CreateGovernedTeamInvitation(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	input InviteTeamMemberInput,
	idempotencyKey string,
	correlationID string,
) (TeamInvitationResult, error) {
	client := configuredIdentityClient()
	if client == nil {
		return TeamInvitationResult{}, auth.ErrIdentityUnavailable
	}
	if err := input.Validate(); err != nil {
		return TeamInvitationResult{}, err
	}
	storeID = strings.TrimSpace(storeID)
	if storeID == "" || strings.TrimSpace(input.InvitedByActorID) == "" {
		return TeamInvitationResult{}, ErrInvalid
	}

	actor, err := client.ProvisionPartnerActor(ctx, auth.PartnerActorProvisionInput{
		Username:         partnerInviteUsername(input.Identity),
		PhoneE164:        input.Identity,
		PermissionBundle: input.Role,
		StoreID:          storeID,
	})
	if err != nil {
		return TeamInvitationResult{}, err
	}
	invite, err := UpsertProvisionedStoreTeamInvite(ctx, db, storeID, input, actor.ActorID)
	if err != nil {
		return TeamInvitationResult{}, err
	}

	operationKey := strings.TrimSpace(idempotencyKey)
	if operationKey == "" {
		operationKey = invite.MemberID
	}
	activation, err := client.IssuePartnerActivation(
		ctx,
		invite.ActorID,
		auth.PartnerActivationInput{IssuedByActorID: input.InvitedByActorID, StoreID: storeID},
		operationKey,
		correlationID,
	)
	if err != nil {
		_ = recordTeamInviteActivationState(ctx, db, invite.MemberID, "نتيجة إصدار رمز الدخول غير مؤكدة وتحتاج إعادة محاولة", "")
		return TeamInvitationResult{
			MemberID: invite.MemberID,
			ActorID: invite.ActorID,
			Role: invite.Role,
			Replayed: invite.Replayed,
			ActivationState: "unknown",
		}, err
	}
	if err := recordTeamInviteActivationState(ctx, db, invite.MemberID, "تم إصدار رمز دخول وبانتظار القبول", activation.ActivationID); err != nil {
		return TeamInvitationResult{}, err
	}
	return TeamInvitationResult{
		MemberID: invite.MemberID,
		ActorID: invite.ActorID,
		Role: invite.Role,
		Replayed: invite.Replayed,
		Activation: &activation,
		ActivationState: "issued",
	}, nil
}
