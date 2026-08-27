package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/storepolicy"
)

var (
	ErrStoreCreationInvalid            = errors.New("invalid store creation request")
	ErrStoreCreationPartnerNotFound    = errors.New("partner not found in operator context")
	ErrPartnerStoreOwnershipNotAllowed = errors.New("partner state does not allow store ownership")
)

type governedStoreCreationFingerprint struct {
	OperatorContextID string                `json:"operatorContextId"`
	Input             CreateDraftStoreInput `json:"input"`
}

// CreateGovernedStoreForOperatorContextIdempotent is the sole generic branch-
// creation primitive. It is control-panel only at the HTTP boundary and closes
// partner ownership, partner-owner scope, audit, operator-context
// isolation, and retry identity in one transaction.
func CreateGovernedStoreForOperatorContextIdempotent(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	actorID string,
	idempotencyKey string,
	correlationID string,
	input CreateDraftStoreInput,
) (DshStoreRow, bool, error) {
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	actorID = strings.TrimSpace(actorID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	if actorID == "" || input.PartnerID == "" || input.DisplayName == "" {
		return DshStoreRow{}, false, ErrStoreCreationInvalid
	}
	if idempotencyKey == "" {
		return DshStoreRow{}, false, errors.New("idempotency key is required")
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = "store-create:" + idempotencyKey
	}

	requestBytes, err := json.Marshal(governedStoreCreationFingerprint{
		OperatorContextID: operatorContextID,
		Input:             input,
	})
	if err != nil {
		return DshStoreRow{}, false, err
	}
	requestHash := fmt.Sprintf("%x", sha256.Sum256(requestBytes))

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	defer tx.Rollback() //nolint:errcheck

	lockKey := strings.Join([]string{
		"operator-store-create",
		operatorContextID,
		actorID,
		idempotencyKey,
	}, "\x1f")
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		lockKey,
	); err != nil {
		return DshStoreRow{}, false, err
	}

	// Expiry is scoped to the same durable retry identity as replay. Removing
	// only this context/actor/key lets an expired key be reused without touching
	// independent OperatorContexts that happen to use the same actor/key pair.
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM dsh_operator_store_creation_idempotency
		WHERE operator_context_id = $1
		  AND actor_id = $2
		  AND idempotency_key = $3
		  AND expires_at <= NOW()`,
		operatorContextID, actorID, idempotencyKey,
	); err != nil {
		return DshStoreRow{}, false, err
	}

	var replayHash string
	var replayJSON []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_operator_store_creation_idempotency
		WHERE operator_context_id = $1
		  AND actor_id = $2
		  AND idempotency_key = $3
		FOR UPDATE`,
		operatorContextID, actorID, idempotencyKey,
	).Scan(&replayHash, &replayJSON)
	if err == nil {
		if replayHash != requestHash {
			return DshStoreRow{}, false, ErrIdempotencyConflict
		}
		var replay DshStoreRow
		if err := json.Unmarshal(replayJSON, &replay); err != nil {
			return DshStoreRow{}, false, err
		}
		if err := tx.Commit(); err != nil {
			return DshStoreRow{}, false, err
		}
		return replay, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return DshStoreRow{}, false, err
	}

	var partnerStatus string
	var ownerActorID string
	var partnerVerticalID string
	err = tx.QueryRowContext(ctx, `
		SELECT activation_status, COALESCE(owner_actor_id, ''), COALESCE(business_vertical_id, '')
		FROM dsh_partners
		WHERE id = $1
		  AND operator_context_id = $2
		FOR SHARE`,
		input.PartnerID, operatorContextID,
	).Scan(&partnerStatus, &ownerActorID, &partnerVerticalID)
	if errors.Is(err, sql.ErrNoRows) {
		return DshStoreRow{}, false, ErrStoreCreationPartnerNotFound
	}
	if err != nil {
		return DshStoreRow{}, false, err
	}
	if !storepolicy.PartnerStatusAllowsStoreOwnership(partnerStatus) {
		return DshStoreRow{}, false, ErrPartnerStoreOwnershipNotAllowed
	}
	if strings.TrimSpace(input.CatalogDomainID) == "" {
		input.CatalogDomainID = partnerVerticalID
	} else if partnerVerticalID != "" && strings.TrimSpace(input.CatalogDomainID) != partnerVerticalID {
		return DshStoreRow{}, false, ErrStoreCreationInvalid
	}

	storeRow, err := CreateDraftStore(tx, input)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	if _, err = tx.ExecContext(
		ctx,
		`UPDATE dsh_stores SET operator_context_id = $1 WHERE id = $2`,
		operatorContextID, storeRow.ID,
	); err != nil {
		return DshStoreRow{}, false, err
	}
	if err := EnsurePartnerOwnerScopeTx(
		ctx, tx, operatorContextID, storeRow.ID, ownerActorID,
	); err != nil {
		return DshStoreRow{}, false, err
	}

	storeRow.PartnerActivationStatus = partnerStatus
	toStateJSON, _ := json.Marshal(map[string]any{
		"storeId":   storeRow.ID,
		"partnerId": input.PartnerID,
		"status":    string(storeRow.Status),
		"visible":   storeRow.IsVisible,
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_action_audit
			(id, actor_id, actor_role, store_id, action, from_state, to_state,
			 reason, correlation_id, created_at)
		VALUES ($1, $2, 'operator', $3, 'operator_store_created',
		        '{}'::jsonb, $4::jsonb, $5, $6, NOW())`,
		eventID("audit"),
		actorID,
		storeRow.ID,
		string(toStateJSON),
		"governed branch creation for partner "+input.PartnerID,
		correlationID,
	); err != nil {
		return DshStoreRow{}, false, err
	}

	responseJSON, err := json.Marshal(storeRow)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_operator_store_creation_idempotency
			(operator_context_id, actor_id, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		operatorContextID, actorID, idempotencyKey, requestHash, string(responseJSON),
	); err != nil {
		return DshStoreRow{}, false, err
	}

	if err := tx.Commit(); err != nil {
		return DshStoreRow{}, false, err
	}
	return storeRow, false, nil
}
