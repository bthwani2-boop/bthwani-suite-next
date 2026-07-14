package providers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

var (
	ErrNotFound            = errors.New("provider configuration not found")
	ErrIdempotencyConflict = errors.New("idempotency key reused with different request")
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) DB() *sql.DB { return r.db }

// ---- idempotency ----

func (r *Repository) IdempotentReplay(ctx context.Context, actorID, operation, key, requestHash string) ([]byte, bool, error) {
	if key == "" {
		return nil, false, nil
	}
	var storedHash string
	var response []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT request_hash, response_body FROM providers_idempotency
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		actorID, operation, key).Scan(&storedHash, &response)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if storedHash != requestHash {
		return nil, false, ErrIdempotencyConflict
	}
	return response, true, nil
}

func (r *Repository) StoreIdempotentResponse(ctx context.Context, actorID, operation, key, requestHash string, response []byte) error {
	if key == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO providers_idempotency (actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		ON CONFLICT (actor_id, operation, idempotency_key) DO NOTHING`,
		actorID, operation, key, requestHash, string(response))
	return err
}

// ---- audit ----

func (r *Repository) RecordAudit(ctx context.Context, actorID, actorRole, targetID, action string, fromState, toState any, reason, correlationID string) error {
	fromJSON, err := marshalNullable(fromState)
	if err != nil {
		return err
	}
	toJSON, err := marshalNullable(toState)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO providers_action_audit
			(actor_id, actor_role, target_id, action, from_state, to_state, reason, correlation_id)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5::jsonb, $6::jsonb, NULLIF($7, ''), NULLIF($8, ''))`,
		actorID, actorRole, targetID, action, fromJSON, toJSON, reason, correlationID)
	return err
}

func marshalNullable(state any) (any, error) {
	if state == nil {
		return nil, nil
	}
	encoded, err := json.Marshal(state)
	if err != nil {
		return nil, err
	}
	return string(encoded), nil
}

// ---- providers ----

func (r *Repository) ListProviders(ctx context.Context) ([]ExternalProvider, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT provider_id, kind, code, active, credentials, parameters, updated_at
		FROM external_providers
		ORDER BY kind ASC, code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []ExternalProvider{}
	for rows.Next() {
		var p ExternalProvider
		var creds, params []byte
		if err := rows.Scan(&p.ProviderID, &p.Kind, &p.Code, &p.Active, &creds, &params, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.Credentials = json.RawMessage(creds)
		p.Parameters = json.RawMessage(params)
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *Repository) GetProvider(ctx context.Context, id string) (ExternalProvider, error) {
	var p ExternalProvider
	var creds, params []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT provider_id, kind, code, active, credentials, parameters, updated_at
		FROM external_providers
		WHERE provider_id = $1`, id).Scan(&p.ProviderID, &p.Kind, &p.Code, &p.Active, &creds, &params, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ExternalProvider{}, ErrNotFound
	}
	if err != nil {
		return ExternalProvider{}, err
	}
	p.Credentials = json.RawMessage(creds)
	p.Parameters = json.RawMessage(params)
	return p, nil
}

func (r *Repository) UpdateProvider(ctx context.Context, id string, input UpdateProviderInput) (ExternalProvider, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ExternalProvider{}, err
	}
	defer tx.Rollback()

	var before ExternalProvider
	var beforeCreds, beforeParams []byte
	err = tx.QueryRowContext(ctx, `
		SELECT provider_id, kind, code, active, credentials, parameters, updated_at
		FROM external_providers
		WHERE provider_id = $1 FOR UPDATE`, id).Scan(&before.ProviderID, &before.Kind, &before.Code, &before.Active, &beforeCreds, &beforeParams, &before.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ExternalProvider{}, ErrNotFound
	}
	if err != nil {
		return ExternalProvider{}, err
	}

	activeVal := before.Active
	if input.Active != nil {
		activeVal = *input.Active
	}

	credsVal := beforeCreds
	if input.Credentials != nil {
		credsVal = *input.Credentials
	}

	paramsVal := beforeParams
	if input.Parameters != nil {
		paramsVal = *input.Parameters
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE external_providers
		SET active = $2, credentials = $3::jsonb, parameters = $4::jsonb, updated_at = now()
		WHERE provider_id = $1`, id, activeVal, string(credsVal), string(paramsVal))
	if err != nil {
		return ExternalProvider{}, err
	}

	if err := tx.Commit(); err != nil {
		return ExternalProvider{}, err
	}

	return r.GetProvider(ctx, id)
}
