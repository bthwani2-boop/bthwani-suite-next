package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
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

// HandleExecuteStoreTeamMemberActionAudited is the sovereign mutation handler
// for store-team actions. It binds request headers to the transaction instead
// of relying on migration-only audit columns or post-write logging.
func HandleExecuteStoreTeamMemberActionAudited(db *sql.DB) http.HandlerFunc {
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

		err := ExecuteStoreTeamMemberActionAudited(db, r.PathValue("storeId"), r.PathValue("memberId"), input)
		switch {
		case errors.Is(err, ErrInvalid):
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, ErrNotFound):
			sendError(w, http.StatusNotFound, "NOT_FOUND", "team member not found")
		case errors.Is(err, ErrForbidden):
			sendError(w, http.StatusForbidden, "FORBIDDEN", "team member does not belong to this store")
		case errors.Is(err, ErrConflict):
			sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different team action")
		case err != nil:
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to execute team member action")
		default:
			sendJSON(w, http.StatusOK, map[string]bool{"success": true})
		}
	}
}

// ExecuteStoreTeamMemberActionAudited performs replay detection, member state
// mutation, and audit insertion in one database transaction.
func ExecuteStoreTeamMemberActionAudited(db *sql.DB, storeID, memberID string, input TeamMemberAuditedActionInput) error {
	if db == nil || strings.TrimSpace(storeID) == "" || strings.TrimSpace(memberID) == "" {
		return ErrInvalid
	}
	if err := input.validate(); err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var replayMemberID, replayAction string
	err = tx.QueryRow(`
		SELECT member_id, action_label
		FROM dsh_store_team_member_actions
		WHERE store_id = $1 AND idempotency_key = $2
		LIMIT 1`, storeID, input.IdempotencyKey).Scan(&replayMemberID, &replayAction)
	if err == nil {
		if replayMemberID == memberID && replayAction == input.Action {
			return nil
		}
		return ErrConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	var currentStoreID, fromStatus string
	err = tx.QueryRow(`
		SELECT store_id, status
		FROM dsh_store_team_members
		WHERE id = $1
		FOR UPDATE`, memberID).Scan(&currentStoreID, &fromStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if currentStoreID != storeID {
		return ErrForbidden
	}

	toStatus := teamActionStatusMap[input.Action]
	if toStatus == "" {
		return ErrInvalid
	}
	if toStatus != fromStatus {
		result, updateErr := tx.Exec(`
			UPDATE dsh_store_team_members
			SET status = $1, version = version + 1, updated_at = NOW()
			WHERE id = $2 AND store_id = $3 AND status = $4`,
			toStatus, memberID, storeID, fromStatus)
		if updateErr != nil {
			return updateErr
		}
		affected, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			return rowsErr
		}
		if affected != 1 {
			return ErrConflict
		}
	}

	var insertedID string
	err = tx.QueryRow(`
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
		// A concurrent request won the unique-key race. Verify that it represents
		// the same mutation before treating it as a safe replay.
		if scanErr := tx.QueryRow(`
			SELECT member_id, action_label
			FROM dsh_store_team_member_actions
			WHERE store_id = $1 AND idempotency_key = $2`,
			storeID, input.IdempotencyKey).Scan(&replayMemberID, &replayAction); scanErr != nil {
			return scanErr
		}
		if replayMemberID != memberID || replayAction != input.Action {
			return ErrConflict
		}
		return nil
	}
	if err != nil {
		return err
	}

	return tx.Commit()
}
