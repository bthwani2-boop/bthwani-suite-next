package commercial

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode"

	"wlt-api/internal/shared"
)

var (
	ErrInvalidFeePolicy         = errors.New("invalid store onboarding fee policy")
	ErrFeePolicyVersionConflict = errors.New("store onboarding fee policy version conflict")
)

type StoreOnboardingFeePolicy struct {
	Enabled          bool       `json:"enabled"`
	AmountMinorUnits int64      `json:"amountMinorUnits"`
	Currency         string     `json:"currency"`
	AppliesTo        string     `json:"appliesTo"`
	ChargeTiming     string     `json:"chargeTiming"`
	ActorCharged     string     `json:"actorCharged"`
	EffectiveFrom    *time.Time `json:"effectiveFrom"`
	Notes            string     `json:"notes"`
	UpdatedBy        string     `json:"updatedBy"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	Version          int        `json:"version"`
	IsConfigured     bool       `json:"isConfigured"`
	BlockedReason    string     `json:"blockedReason,omitempty"`
}

type StoreOnboardingFeePolicyInput struct {
	Enabled          bool       `json:"enabled"`
	AmountMinorUnits int64      `json:"amountMinorUnits"`
	Currency         string     `json:"currency"`
	AppliesTo        string     `json:"appliesTo"`
	ChargeTiming     string     `json:"chargeTiming"`
	EffectiveFrom    *time.Time `json:"effectiveFrom,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	ExpectedVersion  int        `json:"expectedVersion"`
	Reason           string     `json:"reason"`
	CreatedByActorID string     `json:"createdByActorId"`
}

type onboardingFeeMutationMeta struct {
	IdempotencyKey string
	CorrelationID  string
}

var validAppliesTo = map[string]bool{
	"first_store":      true,
	"additional_store": true,
	"all_stores":       true,
}

var validChargeTiming = map[string]bool{
	"on_approval":    true,
	"on_publication": true,
	"on_first_order": true,
	"manual":         true,
}

const onboardingFeePolicySelectColumns = `
	enabled,
	amount_minor_units,
	currency,
	applies_to,
	charge_timing,
	actor_charged,
	effective_from,
	notes,
	created_by_actor_id,
	created_at,
	version`

type onboardingFeePolicyScanner interface {
	Scan(dest ...any) error
}

func scanStoreOnboardingFeePolicy(row onboardingFeePolicyScanner) (StoreOnboardingFeePolicy, error) {
	var policy StoreOnboardingFeePolicy
	var effectiveFrom sql.NullTime
	if err := row.Scan(
		&policy.Enabled,
		&policy.AmountMinorUnits,
		&policy.Currency,
		&policy.AppliesTo,
		&policy.ChargeTiming,
		&policy.ActorCharged,
		&effectiveFrom,
		&policy.Notes,
		&policy.UpdatedBy,
		&policy.UpdatedAt,
		&policy.Version,
	); err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	if effectiveFrom.Valid {
		value := effectiveFrom.Time.UTC()
		policy.EffectiveFrom = &value
	}
	policy.IsConfigured = true
	return policy, nil
}

func unconfiguredStoreOnboardingFeePolicy() StoreOnboardingFeePolicy {
	return StoreOnboardingFeePolicy{
		Enabled:          false,
		AmountMinorUnits: 0,
		Currency:         "YER",
		AppliesTo:        "first_store",
		ChargeTiming:     "on_approval",
		ActorCharged:     "partner",
		Version:          0,
		IsConfigured:     false,
		BlockedReason:    "POLICY_NOT_CONFIGURED",
	}
}

func GetStoreOnboardingFeePolicy(ctx context.Context, db *sql.DB) (StoreOnboardingFeePolicy, error) {
	if db == nil {
		return StoreOnboardingFeePolicy{}, fmt.Errorf("store onboarding fee database is required")
	}
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	policy, err := scanStoreOnboardingFeePolicy(db.QueryRowContext(ctx, `
		SELECT `+onboardingFeePolicySelectColumns+`
		FROM wlt_store_onboarding_fee_policy_versions
		WHERE operator_context_id = $1
		ORDER BY version DESC
		LIMIT 1`, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return unconfiguredStoreOnboardingFeePolicy(), nil
	}
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	return policy, nil
}

func normalizeStoreOnboardingFeePolicyInput(input StoreOnboardingFeePolicyInput) (StoreOnboardingFeePolicyInput, error) {
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.AppliesTo = strings.TrimSpace(input.AppliesTo)
	input.ChargeTiming = strings.TrimSpace(input.ChargeTiming)
	input.Notes = strings.TrimSpace(input.Notes)
	input.Reason = strings.TrimSpace(input.Reason)
	input.CreatedByActorID = strings.TrimSpace(input.CreatedByActorID)
	if input.EffectiveFrom != nil {
		value := input.EffectiveFrom.UTC()
		input.EffectiveFrom = &value
	}

	validCurrency := len(input.Currency) == 3
	for _, r := range input.Currency {
		if !unicode.IsUpper(r) || !unicode.IsLetter(r) {
			validCurrency = false
			break
		}
	}
	if !validAppliesTo[input.AppliesTo] ||
		!validChargeTiming[input.ChargeTiming] ||
		!validCurrency ||
		input.AmountMinorUnits < 0 ||
		(input.Enabled && input.AmountMinorUnits <= 0) ||
		input.ExpectedVersion < 0 ||
		len(input.Notes) > 1000 ||
		len(input.Reason) < 3 || len(input.Reason) > 1000 ||
		input.CreatedByActorID == "" || len(input.CreatedByActorID) > 200 {
		return StoreOnboardingFeePolicyInput{}, ErrInvalidFeePolicy
	}
	return input, nil
}

func onboardingFeeRequestHash(input StoreOnboardingFeePolicyInput) (string, error) {
	encoded, err := json.Marshal(input)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:]), nil
}

func UpsertStoreOnboardingFeePolicy(
	ctx context.Context,
	db *sql.DB,
	input StoreOnboardingFeePolicyInput,
	meta onboardingFeeMutationMeta,
) (StoreOnboardingFeePolicy, bool, error) {
	if db == nil {
		return StoreOnboardingFeePolicy{}, false, fmt.Errorf("store onboarding fee database is required")
	}
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	input, err = normalizeStoreOnboardingFeePolicyInput(input)
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	meta.IdempotencyKey = strings.TrimSpace(meta.IdempotencyKey)
	meta.CorrelationID = strings.TrimSpace(meta.CorrelationID)
	if len(meta.IdempotencyKey) < 8 || len(meta.IdempotencyKey) > 200 ||
		meta.CorrelationID == "" || len(meta.CorrelationID) > 200 {
		return StoreOnboardingFeePolicy{}, false, ErrInvalidFeePolicy
	}
	requestHash, err := onboardingFeeRequestHash(input)
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	defer func() { _ = tx.Rollback() }()

	receipt, replay, err := shared.LoadMutationReceiptTx(ctx, tx, meta.IdempotencyKey, requestHash)
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	if replay {
		var envelope struct {
			Policy StoreOnboardingFeePolicy `json:"policy"`
		}
		if err := json.Unmarshal(receipt, &envelope); err != nil || !envelope.Policy.IsConfigured {
			return StoreOnboardingFeePolicy{}, false, fmt.Errorf("decode onboarding fee mutation receipt")
		}
		if err := tx.Commit(); err != nil {
			return StoreOnboardingFeePolicy{}, false, err
		}
		return envelope.Policy, true, nil
	}

	if _, err := tx.ExecContext(ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"wlt:onboarding-fee:"+operatorContextID,
	); err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}

	currentVersion := 0
	err = tx.QueryRowContext(ctx, `
		SELECT version
		FROM wlt_store_onboarding_fee_policy_versions
		WHERE operator_context_id = $1
		ORDER BY version DESC
		LIMIT 1`, operatorContextID).Scan(&currentVersion)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return StoreOnboardingFeePolicy{}, false, err
	}
	if input.ExpectedVersion != currentVersion {
		return StoreOnboardingFeePolicy{}, false, ErrFeePolicyVersionConflict
	}

	policy, err := scanStoreOnboardingFeePolicy(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_store_onboarding_fee_policy_versions (
			operator_context_id,
			version,
			enabled,
			amount_minor_units,
			currency,
			applies_to,
			charge_timing,
			actor_charged,
			effective_from,
			notes,
			reason,
			correlation_id,
			idempotency_key,
			created_by_actor_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'partner', $8, $9, $10, $11, $12, $13)
		RETURNING `+onboardingFeePolicySelectColumns,
		operatorContextID,
		currentVersion+1,
		input.Enabled,
		input.AmountMinorUnits,
		input.Currency,
		input.AppliesTo,
		input.ChargeTiming,
		input.EffectiveFrom,
		input.Notes,
		input.Reason,
		meta.CorrelationID,
		meta.IdempotencyKey,
		input.CreatedByActorID,
	))
	if err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}

	envelope := map[string]any{"policy": policy}
	if err := shared.StoreMutationReceiptTx(
		ctx,
		tx,
		meta.IdempotencyKey,
		requestHash,
		"store_onboarding_fee_policy_upsert",
		"store-onboarding-fee",
		envelope,
	); err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return StoreOnboardingFeePolicy{}, false, err
	}
	return policy, false, nil
}

func decodeStoreOnboardingFeePolicyInput(w http.ResponseWriter, r *http.Request) (StoreOnboardingFeePolicyInput, bool) {
	var input StoreOnboardingFeePolicyInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_JSON", "request body is invalid")
		return StoreOnboardingFeePolicyInput{}, false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		shared.SendError(w, http.StatusBadRequest, "INVALID_JSON", "request body must contain exactly one JSON object")
		return StoreOnboardingFeePolicyInput{}, false
	}
	return input, true
}

func HandleGetStoreOnboardingFeePolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		policy, err := GetStoreOnboardingFeePolicy(r.Context(), db)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "STORE_ONBOARDING_FEE_READ_FAILED", "failed to read canonical store onboarding fee policy")
			return
		}
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		shared.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
	}
}

func HandleUpsertStoreOnboardingFeePolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input, ok := decodeStoreOnboardingFeePolicyInput(w, r)
		if !ok {
			return
		}
		policy, replay, err := UpsertStoreOnboardingFeePolicy(r.Context(), db, input, onboardingFeeMutationMeta{
			IdempotencyKey: r.Header.Get("Idempotency-Key"),
			CorrelationID:  r.Header.Get("X-Correlation-ID"),
		})
		if err != nil {
			switch {
			case errors.Is(err, ErrInvalidFeePolicy):
				shared.SendError(w, http.StatusBadRequest, "INVALID_STORE_ONBOARDING_FEE_POLICY", err.Error())
			case errors.Is(err, ErrFeePolicyVersionConflict):
				shared.SendError(w, http.StatusConflict, "VERSION_CONFLICT", err.Error())
			case errors.Is(err, shared.ErrMutationIdempotencyConflict):
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			default:
				shared.SendError(w, http.StatusInternalServerError, "STORE_ONBOARDING_FEE_WRITE_FAILED", "failed to write canonical store onboarding fee policy")
			}
			return
		}
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		if replay {
			w.Header().Set("Idempotent-Replay", "true")
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
	}
}
