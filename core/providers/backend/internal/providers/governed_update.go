package providers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

type GovernedProviderUpdate struct {
	ActorID        string
	ActorRole      string
	CorrelationID  string
	IdempotencyKey string
	RequestHash    string
}

// UpdateProviderGoverned commits the provider mutation, its secret-safe audit
// record, and the idempotent response in one PostgreSQL transaction.
func (r *Repository) UpdateProviderGoverned(
	ctx context.Context,
	id string,
	input UpdateProviderInput,
	governance GovernedProviderUpdate,
) (ExternalProvider, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ExternalProvider{}, err
	}
	defer tx.Rollback()

	const operation = "provider.update"
	lockKey := governance.ActorID + "|" + operation + "|" + governance.IdempotencyKey
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return ExternalProvider{}, err
	}

	var storedHash string
	var storedResponse []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM providers_idempotency
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		governance.ActorID,
		operation,
		governance.IdempotencyKey,
	).Scan(&storedHash, &storedResponse)
	if err == nil {
		if storedHash != governance.RequestHash {
			return ExternalProvider{}, ErrIdempotencyConflict
		}
		var replay ExternalProvider
		if err := json.Unmarshal(storedResponse, &replay); err != nil {
			return ExternalProvider{}, err
		}
		if err := tx.Commit(); err != nil {
			return ExternalProvider{}, err
		}
		return replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ExternalProvider{}, err
	}

	var before ExternalProvider
	var beforeCreds, beforeParams []byte
	err = tx.QueryRowContext(ctx, `
		SELECT provider_id, kind, code, active, credentials, parameters, updated_at
		FROM external_providers
		WHERE provider_id = $1 FOR UPDATE`, id).Scan(
		&before.ProviderID,
		&before.Kind,
		&before.Code,
		&before.Active,
		&beforeCreds,
		&beforeParams,
		&before.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ExternalProvider{}, ErrNotFound
	}
	if err != nil {
		return ExternalProvider{}, err
	}
	before.Credentials = json.RawMessage(beforeCreds)
	before.Parameters = json.RawMessage(beforeParams)

	activeValue := before.Active
	if input.Active != nil {
		activeValue = *input.Active
	}
	credentialsValue := beforeCreds
	if input.Credentials != nil {
		credentialsValue = *input.Credentials
	}
	parametersValue := beforeParams
	if input.Parameters != nil {
		parametersValue = *input.Parameters
	}

	after := before
	after.Active = activeValue
	after.Credentials = json.RawMessage(credentialsValue)
	after.Parameters = json.RawMessage(parametersValue)
	err = tx.QueryRowContext(ctx, `
		UPDATE external_providers
		SET active = $2, credentials = $3::jsonb, parameters = $4::jsonb, updated_at = now()
		WHERE provider_id = $1
		RETURNING updated_at`,
		id,
		activeValue,
		string(credentialsValue),
		string(parametersValue),
	).Scan(&after.UpdatedAt)
	if err != nil {
		return ExternalProvider{}, err
	}

	safeBefore := providerForRead(before)
	safeAfter := providerForRead(after)
	if err := insertProviderAuditTx(
		ctx,
		tx,
		governance.ActorID,
		governance.ActorRole,
		id,
		"provider.configured",
		safeBefore,
		safeAfter,
		governance.CorrelationID,
	); err != nil {
		return ExternalProvider{}, err
	}

	responseBody, err := json.Marshal(safeAfter)
	if err != nil {
		return ExternalProvider{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO providers_idempotency
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		governance.ActorID,
		operation,
		governance.IdempotencyKey,
		governance.RequestHash,
		string(responseBody),
	); err != nil {
		return ExternalProvider{}, err
	}

	if err := tx.Commit(); err != nil {
		return ExternalProvider{}, err
	}
	return safeAfter, nil
}

func insertProviderAuditTx(
	ctx context.Context,
	tx *sql.Tx,
	actorID string,
	actorRole string,
	targetID string,
	action string,
	fromState any,
	toState any,
	correlationID string,
) error {
	fromJSON, err := marshalNullable(fromState)
	if err != nil {
		return err
	}
	toJSON, err := marshalNullable(toState)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO providers_action_audit
			(actor_id, actor_role, target_id, action, from_state, to_state, correlation_id)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5::jsonb, $6::jsonb, NULLIF($7, ''))`,
		actorID,
		actorRole,
		targetID,
		action,
		fromJSON,
		toJSON,
		correlationID,
	)
	return err
}
