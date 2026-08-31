package clientprofile

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound            = errors.New("client profile not found")
	ErrConflict            = errors.New("client profile version conflict")
	ErrInvalid             = errors.New("client profile mutation is invalid")
	ErrIdempotencyConflict = errors.New("client profile idempotency conflict")
)

type ClientProfile struct {
	ClientID              string    `json:"clientId"`
	Locale                string    `json:"locale"`
	CurrencyPreference    string    `json:"currencyPreference"`
	MarketingConsentEmail bool      `json:"marketingConsentEmail"`
	MarketingConsentSms   bool      `json:"marketingConsentSms"`
	MarketingConsentPush  bool      `json:"marketingConsentPush"`
	Version               int       `json:"version"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

type ClientProfilePreferencesInput struct {
	Locale             string `json:"locale"`
	CurrencyPreference string `json:"currencyPreference"`
	ExpectedVersion    int    `json:"expectedVersion"`
}

type ClientProfileConsentsInput struct {
	MarketingConsentEmail bool `json:"marketingConsentEmail"`
	MarketingConsentSms   bool `json:"marketingConsentSms"`
	MarketingConsentPush  bool `json:"marketingConsentPush"`
	ExpectedVersion       int  `json:"expectedVersion"`
}

type MutationContext struct {
	IdempotencyKey string
	CorrelationID  string
}

type mutationReceipt struct {
	Operation          string
	RequestFingerprint string
	ResultVersion      int
}

const clientProfileSelectSQL = `SELECT client_id, locale, currency_preference, marketing_consent_email,
	marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
	FROM dsh_client_profiles WHERE client_id = $1`

const updateClientProfilePreferencesSQL = `UPDATE dsh_client_profiles
	SET locale = $2, currency_preference = $3, version = version + 1, updated_at = NOW()
	WHERE client_id = $1
	RETURNING client_id, locale, currency_preference, marketing_consent_email,
		marketing_consent_sms, marketing_consent_push, version, created_at, updated_at`

const insertClientProfilePreferencesSQL = `INSERT INTO dsh_client_profiles (client_id, locale, currency_preference, version, created_at, updated_at)
	VALUES ($1, $2, $3, 1, NOW(), NOW())
	RETURNING client_id, locale, currency_preference, marketing_consent_email,
		marketing_consent_sms, marketing_consent_push, version, created_at, updated_at`

const updateClientProfileConsentsSQL = `UPDATE dsh_client_profiles
	SET marketing_consent_email = $2, marketing_consent_sms = $3,
		marketing_consent_push = $4, version = version + 1, updated_at = NOW()
	WHERE client_id = $1
	RETURNING client_id, locale, currency_preference, marketing_consent_email,
		marketing_consent_sms, marketing_consent_push, version, created_at, updated_at`

const insertClientProfileConsentsSQL = `INSERT INTO dsh_client_profiles (
	client_id, marketing_consent_email, marketing_consent_sms, marketing_consent_push,
	version, created_at, updated_at
) VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
	RETURNING client_id, locale, currency_preference, marketing_consent_email,
		marketing_consent_sms, marketing_consent_push, version, created_at, updated_at`

func GetClientProfile(ctx context.Context, db *sql.DB, clientID string) (ClientProfile, error) {
	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return ClientProfile{}, ErrInvalid
	}
	return scanProfile(db.QueryRowContext(ctx, clientProfileSelectSQL, clientID))
}

func UpsertClientProfilePreferences(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	input ClientProfilePreferencesInput,
	mutation MutationContext,
) (ClientProfile, error) {
	fingerprint, err := mutationFingerprint("preferences", input)
	if err != nil {
		return ClientProfile{}, err
	}
	return upsert(ctx, db, clientID, "preferences", input.ExpectedVersion, fingerprint, mutation, func(tx *sql.Tx, profileExists bool) (ClientProfile, error) {
		if profileExists {
			return scanProfile(tx.QueryRowContext(ctx, updateClientProfilePreferencesSQL,
				clientID, input.Locale, input.CurrencyPreference))
		}
		return scanProfile(tx.QueryRowContext(ctx, insertClientProfilePreferencesSQL,
			clientID, input.Locale, input.CurrencyPreference))
	}, input)
}

func UpsertClientProfileConsents(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	input ClientProfileConsentsInput,
	mutation MutationContext,
) (ClientProfile, error) {
	fingerprint, err := mutationFingerprint("consents", input)
	if err != nil {
		return ClientProfile{}, err
	}
	return upsert(ctx, db, clientID, "consents", input.ExpectedVersion, fingerprint, mutation, func(tx *sql.Tx, profileExists bool) (ClientProfile, error) {
		if profileExists {
			return scanProfile(tx.QueryRowContext(ctx, updateClientProfileConsentsSQL,
				clientID, input.MarketingConsentEmail, input.MarketingConsentSms, input.MarketingConsentPush))
		}
		return scanProfile(tx.QueryRowContext(ctx, insertClientProfileConsentsSQL,
			clientID, input.MarketingConsentEmail, input.MarketingConsentSms, input.MarketingConsentPush))
	}, input)
}

func upsert(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	operation string,
	expectedVersion int,
	fingerprint string,
	mutation MutationContext,
	apply func(*sql.Tx, bool) (ClientProfile, error),
	input any,
) (ClientProfile, error) {
	clientID = strings.TrimSpace(clientID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	if clientID == "" || len(mutation.IdempotencyKey) < 8 || len(mutation.IdempotencyKey) > 200 ||
		len(mutation.CorrelationID) < 8 || len(mutation.CorrelationID) > 200 || expectedVersion < 0 {
		return ClientProfile{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ClientProfile{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "dsh-client-profile:"+clientID); err != nil {
		return ClientProfile{}, err
	}

	receipt, found, err := loadReceipt(ctx, tx, clientID, mutation.IdempotencyKey)
	if err != nil {
		return ClientProfile{}, err
	}
	if found {
		if receipt.Operation != operation || receipt.RequestFingerprint != fingerprint {
			return ClientProfile{}, ErrIdempotencyConflict
		}
		profile, err := scanProfile(tx.QueryRowContext(ctx, clientProfileSelectSQL, clientID))
		if err != nil {
			return ClientProfile{}, err
		}
		if err := tx.Commit(); err != nil {
			return ClientProfile{}, err
		}
		return profile, nil
	}

	var currentVersion int
	err = tx.QueryRowContext(ctx, `SELECT version FROM dsh_client_profiles WHERE client_id = $1 FOR UPDATE`, clientID).Scan(&currentVersion)
	profileExists := err == nil
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ClientProfile{}, err
	}
	if profileExists && expectedVersion > 0 && currentVersion != expectedVersion {
		return ClientProfile{}, ErrConflict
	}

	profile, err := apply(tx, profileExists)
	if err != nil {
		return ClientProfile{}, err
	}
	if err := logEvent(ctx, tx, clientID, eventAction(operation, profileExists), profile.Version, mutation.CorrelationID, input); err != nil {
		return ClientProfile{}, err
	}
	if err := saveReceipt(ctx, tx, clientID, mutation, operation, fingerprint, profile.Version); err != nil {
		return ClientProfile{}, err
	}
	if err := tx.Commit(); err != nil {
		return ClientProfile{}, err
	}
	return profile, nil
}

func scanProfile(scanner interface{ Scan(...any) error }) (ClientProfile, error) {
	var profile ClientProfile
	err := scanner.Scan(
		&profile.ClientID, &profile.Locale, &profile.CurrencyPreference,
		&profile.MarketingConsentEmail, &profile.MarketingConsentSms, &profile.MarketingConsentPush,
		&profile.Version, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ClientProfile{}, ErrNotFound
	}
	return profile, err
}

func loadReceipt(ctx context.Context, tx *sql.Tx, clientID, idempotencyKey string) (mutationReceipt, bool, error) {
	var receipt mutationReceipt
	err := tx.QueryRowContext(ctx, `SELECT operation, request_fingerprint, result_version
		FROM dsh_client_profile_mutation_receipts
		WHERE client_id = $1 AND idempotency_key = $2
		FOR UPDATE`, clientID, idempotencyKey).Scan(
		&receipt.Operation, &receipt.RequestFingerprint, &receipt.ResultVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return mutationReceipt{}, false, nil
	}
	if err != nil {
		return mutationReceipt{}, false, err
	}
	return receipt, true, nil
}

func saveReceipt(ctx context.Context, tx *sql.Tx, clientID string, mutation MutationContext, operation, fingerprint string, resultVersion int) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO dsh_client_profile_mutation_receipts
		(client_id, idempotency_key, operation, request_fingerprint, correlation_id, result_version)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		clientID, mutation.IdempotencyKey, operation, fingerprint, mutation.CorrelationID, resultVersion)
	return err
}

func mutationFingerprint(operation string, input any) (string, error) {
	encoded, err := json.Marshal(struct {
		Operation string `json:"operation"`
		Input     any    `json:"input"`
	}{operation, input})
	if err != nil {
		return "", fmt.Errorf("marshal client profile mutation fingerprint: %w", err)
	}
	digest := sha256.Sum256(encoded)
	return hex.EncodeToString(digest[:]), nil
}

func eventAction(operation string, profileExists bool) string {
	if !profileExists {
		return "created"
	}
	return operation + "_updated"
}

func logEvent(ctx context.Context, tx *sql.Tx, clientID, action string, version int, correlationID string, input any) error {
	meta, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("marshal client profile event: %w", err)
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO dsh_client_profile_events
		(client_id, action, version, correlation_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
		clientID, action, version, correlationID, meta)
	return err
}
