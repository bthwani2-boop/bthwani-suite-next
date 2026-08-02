package partner

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
)

// TeamMemberAuditedActionInput carries the operational action together with
// the request identity required for durable audit and replay protection.
type TeamMemberAuditedActionInput struct {
	Action         string
	ActorID        string
	Reason         string
	CorrelationID  string
	IdempotencyKey string
}

func (i TeamMemberAuditedActionInput) validate() error {
	if _, ok := teamActionStatusMap[i.Action]; !ok {
		return ErrInvalid
	}
	if strings.TrimSpace(i.ActorID) == "" {
		return fmt.Errorf("%w: actor is required", ErrInvalid)
	}
	if strings.TrimSpace(i.IdempotencyKey) == "" {
		return fmt.Errorf("%w: Idempotency-Key header is required", ErrInvalid)
	}
	return nil
}

type teamMemberAccessDirective struct {
	syncIdentity    bool
	identityEnable  bool
	scopeActive     bool
	issueActivation bool
}

func accessDirectiveForTeamAction(action string) teamMemberAccessDirective {
	switch action {
	case "activate":
		return teamMemberAccessDirective{syncIdentity: true, identityEnable: true, scopeActive: true}
	case "resend-invite":
		return teamMemberAccessDirective{syncIdentity: true, identityEnable: true, scopeActive: false, issueActivation: true}
	case "pause", "block", "cancel-invite":
		return teamMemberAccessDirective{syncIdentity: true, identityEnable: false, scopeActive: false}
	default:
		return teamMemberAccessDirective{}
	}
}

// HandleExecuteStoreTeamMemberActionAudited is the sovereign mutation handler
// for store-team actions. It binds request headers to the transaction instead
// of relying on migration-only audit columns or post-write logging.
func HandleExecuteStoreTeamMemberActionAudited(db *sql.DB, identityClient *auth.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var body struct {
			Action string `json:"action"`
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}

		reason := strings.TrimSpace(body.Reason)
		if reason == "" {
			reason = "partner_team_action:" + strings.TrimSpace(body.Action)
		}
		input := TeamMemberAuditedActionInput{
			Action:         strings.TrimSpace(body.Action),
			ActorID:        actorID,
			Reason:         reason,
			CorrelationID:  strings.TrimSpace(correlationID(r)),
			IdempotencyKey: strings.TrimSpace(idempotencyKey(r)),
		}
		if input.CorrelationID == "" {
			input.CorrelationID = input.IdempotencyKey
		}

		activation, err := ExecuteStoreTeamMemberActionAudited(r.Context(), db, identityClient, r.PathValue("storeId"), r.PathValue("memberId"), input)
		switch {
		case errors.Is(err, ErrInvalid):
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, ErrNotFound):
			sendError(w, http.StatusNotFound, "NOT_FOUND", "team member not found")
		case errors.Is(err, ErrForbidden), errors.Is(err, auth.ErrIdentityRejected):
			sendError(w, http.StatusForbidden, "FORBIDDEN", "team member authority is forbidden")
		case errors.Is(err, ErrConflict), errors.Is(err, auth.ErrIdentityConflict):
			sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "team member action conflicts with existing state")
		case errors.Is(err, auth.ErrIdentityUnavailable):
			sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity authority could not be synchronized")
		case err != nil:
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to execute team member action")
		default:
			response := map[string]any{"success": true}
			if activation != nil {
				response["activation"] = activation
			}
			sendJSON(w, http.StatusOK, response)
		}
	}
}

// ExecuteStoreTeamMemberActionAudited synchronizes Identity authority, DSH
// store scope, replay detection, member state, and audit insertion. Restrictive
// actions revoke Identity first; permissive actions remain unusable until the
// DSH scope/state transaction commits.
func ExecuteStoreTeamMemberActionAudited(
	ctx context.Context,
	db *sql.DB,
	identityClient *auth.Client,
	storeID string,
	memberID string,
	input TeamMemberAuditedActionInput,
) (*auth.PartnerActivationResult, error) {
	if db == nil || strings.TrimSpace(storeID) == "" || strings.TrimSpace(memberID) == "" {
		return nil, ErrInvalid
	}
	if err := input.validate(); err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var replayMemberID, replayAction string
	err = tx.QueryRowContext(ctx, `
		SELECT member_id, action_label
		FROM dsh_store_team_member_actions
		WHERE store_id = $1 AND idempotency_key = $2
		LIMIT 1`, storeID, input.IdempotencyKey).Scan(&replayMemberID, &replayAction)
	if err == nil {
		if replayMemberID == memberID && replayAction == input.Action {
			return nil, nil
		}
		return nil, ErrConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var currentStoreID, fromStatus, memberActorID, role, invitedIdentity string
	err = tx.QueryRowContext(ctx, `
		SELECT store_id, status, COALESCE(identity_actor_id, ''), role, COALESCE(invited_identity, '')
		FROM dsh_store_team_members
		WHERE id = $1
		FOR UPDATE`, memberID).Scan(&currentStoreID, &fromStatus, &memberActorID, &role, &invitedIdentity)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if currentStoreID != storeID {
		return nil, ErrForbidden
	}

	toStatus := teamActionStatusMap[input.Action]
	if toStatus == "" {
		return nil, ErrInvalid
	}
	directive := accessDirectiveForTeamAction(input.Action)
	var activation *auth.PartnerActivationResult
	memberActorID = strings.TrimSpace(memberActorID)
	if directive.syncIdentity {
		if identityClient == nil {
			return nil, auth.ErrIdentityUnavailable
		}
		if memberActorID == "" && directive.identityEnable {
			if strings.TrimSpace(invitedIdentity) == "" {
				return nil, ErrInvalid
			}
			actor, provisionErr := identityClient.ProvisionPartnerActor(ctx, auth.PartnerActorProvisionInput{
				Username:         partnerInviteUsername(invitedIdentity),
				PhoneE164:        invitedIdentity,
				PermissionBundle: role,
				StoreID:          storeID,
			})
			if provisionErr != nil {
				return nil, provisionErr
			}
			memberActorID = actor.ActorID
			if _, err := tx.ExecContext(ctx, `
				UPDATE dsh_store_team_members
				SET identity_actor_id = $1, updated_at = NOW()
				WHERE id = $2 AND store_id = $3`, memberActorID, memberID, storeID); err != nil {
				return nil, err
			}
		} else if memberActorID != "" {
			if err := identityClient.SetPartnerStoreAccess(ctx, memberActorID, auth.PartnerStoreAccessInput{
				StoreID:          storeID,
				PermissionBundle: role,
				Enabled:          directive.identityEnable,
			}); err != nil {
				return nil, err
			}
		}
		if directive.issueActivation {
			if memberActorID == "" {
				return nil, ErrInvalid
			}
			issued, issueErr := identityClient.IssuePartnerActivation(
				ctx,
				memberActorID,
				auth.PartnerActivationInput{IssuedByActorID: input.ActorID, StoreID: storeID},
				input.IdempotencyKey+":activation",
				input.CorrelationID,
			)
			if issueErr != nil {
				return nil, issueErr
			}
			activation = &issued
		}
	}

	if memberActorID != "" && directive.syncIdentity {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_store_actor_scopes
				(actor_id, actor_role, store_id, scope_type, active)
			VALUES ($1, 'partner', $2, 'assigned', $3)
			ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE
			SET active = EXCLUDED.active`, memberActorID, storeID, directive.scopeActive); err != nil {
			return nil, err
		}
	}

	if toStatus != fromStatus {
		result, updateErr := tx.ExecContext(ctx, `
			UPDATE dsh_store_team_members
			SET status = $1, version = version + 1, updated_at = NOW()
			WHERE id = $2 AND store_id = $3 AND status = $4`,
			toStatus, memberID, storeID, fromStatus)
		if updateErr != nil {
			return nil, updateErr
		}
		affected, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			return nil, rowsErr
		}
		if affected != 1 {
			return nil, ErrConflict
		}
	}

	var insertedID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_store_team_member_actions (
			member_id, store_id, action_label, from_status, to_status, actor_id,
			reason, correlation_id, idempotency_key
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''), $9)
		ON CONFLICT (store_id, idempotency_key)
		WHERE idempotency_key IS NOT NULL
		DO NOTHING
		RETURNING id`,
		memberID, storeID, input.Action, fromStatus, toStatus, input.ActorID,
		input.Reason, input.CorrelationID, input.IdempotencyKey).Scan(&insertedID)
	if errors.Is(err, sql.ErrNoRows) {
		if scanErr := tx.QueryRowContext(ctx, `
			SELECT member_id, action_label
			FROM dsh_store_team_member_actions
			WHERE store_id = $1 AND idempotency_key = $2`,
			storeID, input.IdempotencyKey).Scan(&replayMemberID, &replayAction); scanErr != nil {
			return nil, scanErr
		}
		if replayMemberID != memberID || replayAction != input.Action {
			return nil, ErrConflict
		}
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return activation, nil
}
