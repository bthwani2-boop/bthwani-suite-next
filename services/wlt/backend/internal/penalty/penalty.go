package penalty

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var (
	ErrNotFound          = errors.New("provider penalty not found")
	ErrConflict          = errors.New("provider penalty conflicts with an existing incident posting")
	ErrPolicyUnavailable = errors.New("provider penalty policy is unavailable")
	ErrPolicyVersion     = errors.New("provider penalty policy version conflict")
	ErrWalletUnavailable = errors.New("provider wallet is unavailable")
)

type ProviderPenaltyPolicy struct {
	PolicyID          string    `json:"policyId"`
	PolicyVersion     string    `json:"policyVersion"`
	ProviderActorType string    `json:"providerActorType"`
	AmountMinorUnits  int64     `json:"amountMinorUnits"`
	Currency          string    `json:"currency"`
	Enabled           bool      `json:"enabled"`
	ChangeReason      string    `json:"changeReason"`
	UpdatedByActorID  string    `json:"updatedByActorId"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type UpsertPolicyInput struct {
	ExpectedVersion   int64  `json:"expectedVersion"`
	ProviderActorType string `json:"providerActorType"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	Enabled           bool   `json:"enabled"`
	ChangeReason      string `json:"changeReason"`
	UpdatedByActorID  string `json:"updatedByActorId"`
}

func UpsertPolicy(ctx context.Context, db *sql.DB, policyID string, input UpsertPolicyInput) (ProviderPenaltyPolicy, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	policyID = strings.TrimSpace(policyID)
	input.ProviderActorType = strings.TrimSpace(input.ProviderActorType)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.UpdatedByActorID = strings.TrimSpace(input.UpdatedByActorID)
	if policyID == "" || input.ExpectedVersion < 0 || input.AmountMinorUnits <= 0 ||
		(input.ProviderActorType != "captain" && input.ProviderActorType != "field" && input.ProviderActorType != "any") ||
		len(input.Currency) != 3 || len(input.ChangeReason) < 3 || input.UpdatedByActorID == "" {
		return ProviderPenaltyPolicy{}, fmt.Errorf("policyId, expectedVersion, provider type, positive amount, currency, reason and updatedByActorId are required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "provider-penalty-policy:"+operatorContextID+":"+policyID); err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	var currentVersion int64
	err = tx.QueryRowContext(ctx, `SELECT COALESCE(NULLIF(regexp_replace(policy_version,'^v',''),'')::bigint,0)
		FROM wlt_provider_penalty_policies WHERE operator_context_id=$1 AND policy_id=$2 FOR UPDATE`, operatorContextID, policyID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		currentVersion = 0
	} else if err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return ProviderPenaltyPolicy{}, ErrPolicyVersion
	}
	nextVersion := currentVersion + 1
	var policy ProviderPenaltyPolicy
	err = tx.QueryRowContext(ctx, `INSERT INTO wlt_provider_penalty_policies(
		operator_context_id,policy_id,policy_version,provider_actor_type,amount_minor_units,currency,enabled,change_reason,updated_by_actor_id,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
		ON CONFLICT(operator_context_id,policy_id) DO UPDATE SET
			policy_version=EXCLUDED.policy_version,provider_actor_type=EXCLUDED.provider_actor_type,
			amount_minor_units=EXCLUDED.amount_minor_units,currency=EXCLUDED.currency,
			enabled=EXCLUDED.enabled,change_reason=EXCLUDED.change_reason,
			updated_by_actor_id=EXCLUDED.updated_by_actor_id,updated_at=now()
		RETURNING policy_id,policy_version,provider_actor_type,amount_minor_units,currency,enabled,change_reason,updated_by_actor_id,updated_at`,
		operatorContextID, policyID, fmt.Sprintf("v%d", nextVersion), input.ProviderActorType,
		input.AmountMinorUnits, input.Currency, input.Enabled, input.ChangeReason, input.UpdatedByActorID).
		Scan(&policy.PolicyID, &policy.PolicyVersion, &policy.ProviderActorType, &policy.AmountMinorUnits,
			&policy.Currency, &policy.Enabled, &policy.ChangeReason, &policy.UpdatedByActorID, &policy.UpdatedAt)
	if err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderPenaltyPolicy{}, err
	}
	return policy, nil
}

type ProviderPenalty struct {
	ID                            string     `json:"id"`
	OperatorContextID             string     `json:"operatorContextId"`
	IncidentID                    string     `json:"incidentId"`
	ProviderActorID               string     `json:"providerActorId"`
	ProviderActorType             string     `json:"providerActorType"`
	PolicyID                      string     `json:"policyId"`
	PolicyVersion                 string     `json:"policyVersion"`
	DebtID                        string     `json:"debtId,omitempty"`
	AmountMinorUnits              int64      `json:"amountMinorUnits"`
	WalletAppliedAmountMinorUnits int64      `json:"walletAppliedAmountMinorUnits"`
	DebtAmountMinorUnits          int64      `json:"debtAmountMinorUnits"`
	Currency                      string     `json:"currency"`
	Reason                        string     `json:"reason"`
	Status                        string     `json:"status"`
	LedgerTransactionID           string     `json:"ledgerTransactionId"`
	ReversalLedgerTransactionID   string     `json:"reversalLedgerTransactionId,omitempty"`
	PostedByActorID               string     `json:"postedByActorId"`
	ReversedByActorID             string     `json:"reversedByActorId,omitempty"`
	ReversedReason                string     `json:"reversedReason,omitempty"`
	IdempotencyKey                string     `json:"idempotencyKey"`
	PostRequestHash               string     `json:"-"`
	ReversalIdempotencyKey        string     `json:"reversalIdempotencyKey,omitempty"`
	ReversalRequestHash           string     `json:"-"`
	CreatedAt                     time.Time  `json:"createdAt"`
	ReversedAt                    *time.Time `json:"reversedAt,omitempty"`
	UpdatedAt                     time.Time  `json:"updatedAt"`
}

type PostInput struct {
	IncidentID        string `json:"incidentId"`
	ProviderActorID   string `json:"providerActorId"`
	ProviderActorType string `json:"providerActorType"`
	PolicyID          string `json:"policyId"`
	Reason            string `json:"reason"`
	PostedByActorID   string `json:"postedByActorId"`
}

type ReverseInput struct {
	Reason            string `json:"reason"`
	ReversedByActorID string `json:"reversedByActorId"`
}

const columns = `id,operator_context_id,incident_id,provider_actor_id,provider_actor_type,
	policy_id,policy_version,COALESCE(debt_id,''),amount_minor_units,wallet_applied_amount_minor_units,
	debt_amount_minor_units,currency,reason,status,ledger_transaction_id,
	COALESCE(reversal_ledger_transaction_id,''),posted_by_actor_id,
	COALESCE(reversed_by_actor_id,''),COALESCE(reversed_reason,''),idempotency_key,post_request_hash,
	COALESCE(reversal_idempotency_key,''),COALESCE(reversal_request_hash,''),
	created_at,reversed_at,updated_at`

type scanner interface{ Scan(dest ...any) error }

func scan(row scanner) (ProviderPenalty, error) {
	var item ProviderPenalty
	err := row.Scan(
		&item.ID, &item.OperatorContextID, &item.IncidentID, &item.ProviderActorID, &item.ProviderActorType,
		&item.PolicyID, &item.PolicyVersion, &item.DebtID,
		&item.AmountMinorUnits, &item.WalletAppliedAmountMinorUnits, &item.DebtAmountMinorUnits,
		&item.Currency, &item.Reason, &item.Status, &item.LedgerTransactionID,
		&item.ReversalLedgerTransactionID, &item.PostedByActorID, &item.ReversedByActorID,
		&item.ReversedReason, &item.IdempotencyKey, &item.PostRequestHash,
		&item.ReversalIdempotencyKey, &item.ReversalRequestHash,
		&item.CreatedAt, &item.ReversedAt, &item.UpdatedAt,
	)
	return item, err
}

func requestHash(value any) (string, error) {
	payload, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", sha256.Sum256(payload)), nil
}

func samePostRequest(item ProviderPenalty, key, hash string, input PostInput) bool {
	if item.IdempotencyKey != key || item.IncidentID != input.IncidentID ||
		item.ProviderActorID != input.ProviderActorID || item.ProviderActorType != input.ProviderActorType ||
		item.PolicyID != input.PolicyID || item.Reason != input.Reason || item.PostedByActorID != input.PostedByActorID {
		return false
	}
	return strings.HasPrefix(item.PostRequestHash, "legacy:") || item.PostRequestHash == hash
}

func sameReverseRequest(item ProviderPenalty, key, hash string, input ReverseInput) bool {
	if item.ReversalIdempotencyKey != key || item.ReversedReason != input.Reason || item.ReversedByActorID != input.ReversedByActorID {
		return false
	}
	return strings.HasPrefix(item.ReversalRequestHash, "legacy:") || item.ReversalRequestHash == hash
}

func normalizePost(input *PostInput) error {
	input.IncidentID = strings.TrimSpace(input.IncidentID)
	input.ProviderActorID = strings.TrimSpace(input.ProviderActorID)
	input.ProviderActorType = strings.TrimSpace(input.ProviderActorType)
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.PostedByActorID = strings.TrimSpace(input.PostedByActorID)
	if input.IncidentID == "" || input.ProviderActorID == "" || input.PostedByActorID == "" || input.PolicyID == "" || len(input.Reason) < 3 {
		return fmt.Errorf("incidentId, provider, policyId, reason and postedByActorId are required")
	}
	if input.ProviderActorType != "captain" && input.ProviderActorType != "field" {
		return fmt.Errorf("providerActorType must be captain or field")
	}
	return nil
}

type penaltyPolicy struct {
	Version           string
	ProviderActorType string
	AmountMinorUnits  int64
	Currency          string
}

func loadPenaltyPolicy(ctx context.Context, tx *sql.Tx, operatorContextID string, input PostInput) (penaltyPolicy, error) {
	var policy penaltyPolicy
	err := tx.QueryRowContext(ctx, `
		SELECT policy_version,provider_actor_type,amount_minor_units,currency
		FROM wlt_provider_penalty_policies
		WHERE operator_context_id=$1 AND policy_id=$2 AND enabled
		FOR SHARE`, operatorContextID, input.PolicyID).
		Scan(&policy.Version, &policy.ProviderActorType, &policy.AmountMinorUnits, &policy.Currency)
	if errors.Is(err, sql.ErrNoRows) {
		return penaltyPolicy{}, ErrPolicyUnavailable
	}
	if err != nil {
		return penaltyPolicy{}, err
	}
	if policy.ProviderActorType != "any" && policy.ProviderActorType != input.ProviderActorType {
		return penaltyPolicy{}, ErrPolicyUnavailable
	}
	if policy.AmountMinorUnits <= 0 || len(policy.Currency) != 3 || strings.TrimSpace(policy.Version) == "" {
		return penaltyPolicy{}, ErrPolicyUnavailable
	}
	return policy, nil
}

func existingForIncidentTx(ctx context.Context, tx *sql.Tx, operatorContextID, incidentID string) (*ProviderPenalty, error) {
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND incident_id=$2`, operatorContextID, incidentID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &item, err
}

func existingForPostKeyTx(ctx context.Context, tx *sql.Tx, operatorContextID, idempotencyKey string) (*ProviderPenalty, error) {
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND idempotency_key=$2`, operatorContextID, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &item, err
}

func existingForReverseKeyTx(ctx context.Context, tx *sql.Tx, operatorContextID, idempotencyKey string) (*ProviderPenalty, error) {
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND reversal_idempotency_key=$2`, operatorContextID, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &item, err
}

// Post records one penalty accounting fact. OperatorContext is resolved only
// from authenticated request context; a raw caller header is never financial
// authority. The canonical ledger posting is the sole economic balance write.
// wlt_wallets is refreshed by the governed ledger projection trigger.
func Post(ctx context.Context, db *sql.DB, idempotencyKey string, input PostInput) (ProviderPenalty, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return ProviderPenalty{}, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return ProviderPenalty{}, fmt.Errorf("idempotency key is required")
	}
	if err := normalizePost(&input); err != nil {
		return ProviderPenalty{}, err
	}
	postRequestHash, err := requestHash(input)
	if err != nil {
		return ProviderPenalty{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenalty{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "provider-penalty-post-key:"+operatorContextID+":"+idempotencyKey); err != nil {
		return ProviderPenalty{}, err
	}
	byKey, err := existingForPostKeyTx(ctx, tx, operatorContextID, idempotencyKey)
	if err != nil {
		return ProviderPenalty{}, err
	}
	if byKey != nil {
		if !samePostRequest(*byKey, idempotencyKey, postRequestHash, input) {
			return ProviderPenalty{}, ErrConflict
		}
		if err := tx.Commit(); err != nil {
			return ProviderPenalty{}, err
		}
		return *byKey, nil
	}
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "provider-penalty-incident:"+operatorContextID+":"+input.IncidentID); err != nil {
		return ProviderPenalty{}, err
	}
	existing, err := existingForIncidentTx(ctx, tx, operatorContextID, input.IncidentID)
	if err != nil {
		return ProviderPenalty{}, err
	}
	if existing != nil {
		if strings.HasPrefix(existing.PolicyID, "legacy:") {
			return ProviderPenalty{}, ErrPolicyUnavailable
		}
		if !samePostRequest(*existing, idempotencyKey, postRequestHash, input) {
			return ProviderPenalty{}, ErrConflict
		}
		if err := tx.Commit(); err != nil {
			return ProviderPenalty{}, err
		}
		return *existing, nil
	}
	policy, err := loadPenaltyPolicy(ctx, tx, operatorContextID, input)
	if err != nil {
		return ProviderPenalty{}, err
	}

	var walletStatus, walletCurrency string
	var available int64
	err = tx.QueryRowContext(ctx, `SELECT status,currency,available_balance_minor_units
		FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type=$2 AND actor_id=$3 FOR UPDATE`,
		operatorContextID, input.ProviderActorType, input.ProviderActorID).Scan(&walletStatus, &walletCurrency, &available)
	if errors.Is(err, sql.ErrNoRows) {
		walletStatus, walletCurrency, available = "", "", 0
	} else if err != nil {
		return ProviderPenalty{}, err
	}
	walletApplied := int64(0)
	if walletStatus == "active" && walletCurrency == policy.Currency && available > 0 {
		walletApplied = available
		if walletApplied > policy.AmountMinorUnits {
			walletApplied = policy.AmountMinorUnits
		}
	}
	debtAmount := policy.AmountMinorUnits - walletApplied

	lines := make([]ledger.LedgerLine, 0, 3)
	if walletApplied > 0 {
		lines = append(lines, ledger.LedgerLine{AccountType: "wallet", ActorType: input.ProviderActorType, ActorID: input.ProviderActorID, DebitCredit: "debit", AmountMinorUnits: walletApplied, Currency: policy.Currency})
	}
	if debtAmount > 0 {
		lines = append(lines, ledger.LedgerLine{AccountType: "provider_receivable", DebitCredit: "debit", AmountMinorUnits: debtAmount, Currency: policy.Currency})
	}
	lines = append(lines, ledger.LedgerLine{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: policy.AmountMinorUnits, Currency: policy.Currency})
	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "provider_penalty_posted", "provider_incident", input.IncidentID, lines, ledger.Actor{ID: input.PostedByActorID, Type: "operator"})
	if err != nil {
		return ProviderPenalty{}, err
	}

	item, err := scan(tx.QueryRowContext(ctx, `INSERT INTO wlt_provider_penalties(
		operator_context_id,incident_id,provider_actor_id,provider_actor_type,amount_minor_units,
		policy_id,policy_version,wallet_applied_amount_minor_units,debt_amount_minor_units,currency,reason,ledger_transaction_id,posted_by_actor_id,idempotency_key,post_request_hash)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING `+columns,
		operatorContextID, input.IncidentID, input.ProviderActorID, input.ProviderActorType, policy.AmountMinorUnits,
		input.PolicyID, policy.Version, walletApplied, debtAmount, policy.Currency, input.Reason, ledgerID, input.PostedByActorID, idempotencyKey, postRequestHash))
	if err != nil {
		return ProviderPenalty{}, err
	}
	if debtAmount > 0 {
		if err := tx.QueryRowContext(ctx, `INSERT INTO wlt_provider_debts(
			operator_context_id,provider_actor_id,provider_actor_type,source_type,source_id,
			policy_id,policy_version,original_amount_minor_units,outstanding_amount_minor_units,
			currency,ledger_transaction_id)
			VALUES($1,$2,$3,'provider_penalty',$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
			operatorContextID, input.ProviderActorID, input.ProviderActorType, item.ID,
			input.PolicyID, policy.Version, policy.AmountMinorUnits, debtAmount, policy.Currency, ledgerID).Scan(&item.DebtID); err != nil {
			return ProviderPenalty{}, err
		}
		item, err = scan(tx.QueryRowContext(ctx, `UPDATE wlt_provider_penalties SET debt_id=$3,updated_at=now()
			WHERE operator_context_id=$1 AND id=$2 RETURNING `+columns, operatorContextID, item.ID, item.DebtID))
		if err != nil {
			return ProviderPenalty{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return ProviderPenalty{}, err
	}
	return item, nil
}

// Reverse posts a compensating ledger transaction; it never rewrites the
// original penalty or writes an economic balance directly to wlt_wallets.
func Reverse(ctx context.Context, db *sql.DB, penaltyID, idempotencyKey string, input ReverseInput) (ProviderPenalty, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return ProviderPenalty{}, err
	}
	penaltyID = strings.TrimSpace(penaltyID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	input.Reason = strings.TrimSpace(input.Reason)
	input.ReversedByActorID = strings.TrimSpace(input.ReversedByActorID)
	if penaltyID == "" || idempotencyKey == "" || len(input.Reason) < 3 || input.ReversedByActorID == "" {
		return ProviderPenalty{}, fmt.Errorf("penaltyId, idempotency key, reason and reversedByActorId are required")
	}
	reversalRequestHash, err := requestHash(input)
	if err != nil {
		return ProviderPenalty{}, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenalty{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "provider-penalty-reverse-key:"+operatorContextID+":"+idempotencyKey); err != nil {
		return ProviderPenalty{}, err
	}
	byKey, err := existingForReverseKeyTx(ctx, tx, operatorContextID, idempotencyKey)
	if err != nil {
		return ProviderPenalty{}, err
	}
	if byKey != nil {
		if byKey.ID != penaltyID || !sameReverseRequest(*byKey, idempotencyKey, reversalRequestHash, input) {
			return ProviderPenalty{}, ErrConflict
		}
		if err := tx.Commit(); err != nil {
			return ProviderPenalty{}, err
		}
		return *byKey, nil
	}
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND id=$2 FOR UPDATE`, operatorContextID, penaltyID))
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenalty{}, ErrNotFound
	}
	if err != nil {
		return ProviderPenalty{}, err
	}
	if item.Status == "reversed" {
		return ProviderPenalty{}, ErrConflict
	}
	lines := []ledger.LedgerLine{{AccountType: "platform_revenue", DebitCredit: "debit", AmountMinorUnits: item.AmountMinorUnits, Currency: item.Currency}}
	if item.WalletAppliedAmountMinorUnits > 0 {
		lines = append(lines, ledger.LedgerLine{AccountType: "wallet", ActorType: item.ProviderActorType, ActorID: item.ProviderActorID, DebitCredit: "credit", AmountMinorUnits: item.WalletAppliedAmountMinorUnits, Currency: item.Currency})
	}
	if item.DebtAmountMinorUnits > 0 {
		lines = append(lines, ledger.LedgerLine{AccountType: "provider_receivable", DebitCredit: "credit", AmountMinorUnits: item.DebtAmountMinorUnits, Currency: item.Currency})
	}
	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "provider_penalty_reversed", "provider_penalty", item.ID, lines, ledger.Actor{ID: input.ReversedByActorID, Type: "operator"})
	if err != nil {
		return ProviderPenalty{}, err
	}
	if item.DebtID != "" {
		if _, err := tx.ExecContext(ctx, `UPDATE wlt_provider_debts SET status='reversed',outstanding_amount_minor_units=0,reversed_at=now(),updated_at=now()
			WHERE operator_context_id=$1 AND id=$2 AND status IN ('open','partially_settled')`, operatorContextID, item.DebtID); err != nil {
			return ProviderPenalty{}, err
		}
	}
	item, err = scan(tx.QueryRowContext(ctx, `UPDATE wlt_provider_penalties SET status='reversed',
		reversal_ledger_transaction_id=$3,reversed_by_actor_id=$4,reversed_reason=$5,
		reversal_idempotency_key=$6,reversal_request_hash=$7,
		reversed_at=now(),updated_at=now() WHERE operator_context_id=$1 AND id=$2 RETURNING `+columns,
		operatorContextID, item.ID, ledgerID, input.ReversedByActorID, input.Reason, idempotencyKey, reversalRequestHash))
	if err != nil {
		return ProviderPenalty{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderPenalty{}, err
	}
	return item, nil
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrPolicyVersion):
		shared.SendError(w, http.StatusConflict, "PROVIDER_PENALTY_POLICY_VERSION_CONFLICT", err.Error())
	case errors.Is(err, ErrNotFound):
		shared.SendError(w, http.StatusNotFound, "PROVIDER_PENALTY_NOT_FOUND", err.Error())
	case errors.Is(err, ErrConflict):
		shared.SendError(w, http.StatusConflict, "PROVIDER_PENALTY_CONFLICT", err.Error())
	case errors.Is(err, ErrPolicyUnavailable):
		shared.SendError(w, http.StatusConflict, "PROVIDER_PENALTY_POLICY_UNAVAILABLE", err.Error())
	case errors.Is(err, ErrWalletUnavailable):
		shared.SendError(w, http.StatusConflict, "PROVIDER_WALLET_UNAVAILABLE", err.Error())
	default:
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	}
}

func HandleUpsertPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertPolicy(r.Context(), db, r.PathValue("policyId"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"providerPenaltyPolicy": policy})
	}
}

func HandlePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input PostInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		item, err := Post(r.Context(), db, r.Header.Get("Idempotency-Key"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"providerPenalty": item})
	}
}

func HandleReverse(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ReverseInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		item, err := Reverse(r.Context(), db, r.PathValue("penaltyId"), r.Header.Get("Idempotency-Key"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"providerPenalty": item})
	}
}

func GetByID(ctx context.Context, db *sql.DB, penaltyID string) (ProviderPenalty, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return ProviderPenalty{}, err
	}
	item, err := scan(db.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND id=$2`, operatorContextID, strings.TrimSpace(penaltyID)))
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenalty{}, ErrNotFound
	}
	return item, err
}

func GetByIncident(ctx context.Context, db *sql.DB, incidentID string) (ProviderPenalty, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return ProviderPenalty{}, err
	}
	item, err := scan(db.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE operator_context_id=$1 AND incident_id=$2`, operatorContextID, strings.TrimSpace(incidentID)))
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenalty{}, ErrNotFound
	}
	return item, err
}

func handleGet(loader func(context.Context, *sql.DB, string) (ProviderPenalty, error), pathValue string, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		item, err := loader(r.Context(), db, r.PathValue(pathValue))
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"providerPenalty": item})
	}
}

func HandleGetByID(db *sql.DB) http.HandlerFunc {
	return handleGet(GetByID, "penaltyId", db)
}

func HandleGetByIncident(db *sql.DB) http.HandlerFunc {
	return handleGet(GetByIncident, "incidentId", db)
}

// HandleReservedPathSegment closes the URI ambiguity between
// /wlt/provider-penalties/{penaltyId} and the by-incident lookup cone
// (root #9): the literal reserved segment must never be captured as an
// identifier, it fails fast with an explicit 400 instead of a misleading
// not-found or cast error deeper in the stack.
func HandleReservedPathSegment(segment string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shared.SendError(w, http.StatusBadRequest, "RESERVED_PATH_SEGMENT",
			segment+" is a reserved path segment; provide the identifier segment")
	}
}
