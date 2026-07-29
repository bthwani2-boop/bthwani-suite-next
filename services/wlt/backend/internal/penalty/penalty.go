package penalty

import (
	"context"
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
	ErrWalletUnavailable = errors.New("provider wallet is unavailable")
	ErrInsufficientFunds = errors.New("provider wallet has insufficient available balance")
)

type ProviderPenalty struct {
	ID                          string     `json:"id"`
	OperatorContextID                    string     `json:"operatorContextId"`
	IncidentID                  string     `json:"incidentId"`
	ProviderActorID             string     `json:"providerActorId"`
	ProviderActorType           string     `json:"providerActorType"`
	AmountMinorUnits            int64      `json:"amountMinorUnits"`
	Currency                    string     `json:"currency"`
	Reason                      string     `json:"reason"`
	Status                      string     `json:"status"`
	LedgerTransactionID         string     `json:"ledgerTransactionId"`
	ReversalLedgerTransactionID string     `json:"reversalLedgerTransactionId,omitempty"`
	PostedByActorID             string     `json:"postedByActorId"`
	ReversedByActorID           string     `json:"reversedByActorId,omitempty"`
	ReversedReason              string     `json:"reversedReason,omitempty"`
	IdempotencyKey              string     `json:"idempotencyKey"`
	CreatedAt                   time.Time  `json:"createdAt"`
	ReversedAt                  *time.Time `json:"reversedAt,omitempty"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
}

type PostInput struct {
	IncidentID        string `json:"incidentId"`
	ProviderActorID   string `json:"providerActorId"`
	ProviderActorType string `json:"providerActorType"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	Reason            string `json:"reason"`
	PostedByActorID   string `json:"postedByActorId"`
}

type ReverseInput struct {
	Reason            string `json:"reason"`
	ReversedByActorID string `json:"reversedByActorId"`
}

const columns = `id,tenant_id,incident_id,provider_actor_id,provider_actor_type,
	amount_minor_units,currency,reason,status,ledger_transaction_id,
	COALESCE(reversal_ledger_transaction_id,''),posted_by_actor_id,
	COALESCE(reversed_by_actor_id,''),COALESCE(reversed_reason,''),idempotency_key,
	created_at,reversed_at,updated_at`

type scanner interface{ Scan(dest ...any) error }

func scan(row scanner) (ProviderPenalty, error) {
	var item ProviderPenalty
	err := row.Scan(
		&item.ID, &item.OperatorContextID, &item.IncidentID, &item.ProviderActorID, &item.ProviderActorType,
		&item.AmountMinorUnits, &item.Currency, &item.Reason, &item.Status, &item.LedgerTransactionID,
		&item.ReversalLedgerTransactionID, &item.PostedByActorID, &item.ReversedByActorID,
		&item.ReversedReason, &item.IdempotencyKey, &item.CreatedAt, &item.ReversedAt, &item.UpdatedAt,
	)
	return item, err
}

func normalizePost(input *PostInput) error {
	input.IncidentID = strings.TrimSpace(input.IncidentID)
	input.ProviderActorID = strings.TrimSpace(input.ProviderActorID)
	input.ProviderActorType = strings.TrimSpace(input.ProviderActorType)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Reason = strings.TrimSpace(input.Reason)
	input.PostedByActorID = strings.TrimSpace(input.PostedByActorID)
	if input.IncidentID == "" || input.ProviderActorID == "" || input.PostedByActorID == "" || input.AmountMinorUnits <= 0 || len(input.Reason) < 3 {
		return fmt.Errorf("incidentId, provider, positive amount, reason and postedByActorId are required")
	}
	if input.ProviderActorType != "captain" && input.ProviderActorType != "field" {
		return fmt.Errorf("providerActorType must be captain or field")
	}
	if len(input.Currency) != 3 {
		return fmt.Errorf("currency must be a three-letter code")
	}
	return nil
}

func existingForIncidentTx(ctx context.Context, tx *sql.Tx, operatorContextID, incidentID string) (*ProviderPenalty, error) {
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE tenant_id=$1 AND incident_id=$2`, operatorContextID, incidentID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &item, err
}

func Post(ctx context.Context, db *sql.DB, operatorContextID, idempotencyKey string, input PostInput) (ProviderPenalty, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if operatorContextID == "" || idempotencyKey == "" {
		return ProviderPenalty{}, fmt.Errorf("tenant and idempotency key are required")
	}
	if err := normalizePost(&input); err != nil {
		return ProviderPenalty{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenalty{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, operatorContextID+":"+input.IncidentID); err != nil {
		return ProviderPenalty{}, err
	}
	existing, err := existingForIncidentTx(ctx, tx, operatorContextID, input.IncidentID)
	if err != nil {
		return ProviderPenalty{}, err
	}
	if existing != nil {
		if existing.ProviderActorID != input.ProviderActorID || existing.ProviderActorType != input.ProviderActorType || existing.AmountMinorUnits != input.AmountMinorUnits || existing.Currency != input.Currency {
			return ProviderPenalty{}, ErrConflict
		}
		if err := tx.Commit(); err != nil {
			return ProviderPenalty{}, err
		}
		return *existing, nil
	}

	var walletStatus, walletCurrency string
	var available int64
	err = tx.QueryRowContext(ctx, `SELECT status,currency,available_balance_minor_units
		FROM wlt_wallets WHERE tenant_id=$1 AND actor_type=$2 AND actor_id=$3 FOR UPDATE`,
		operatorContextID, input.ProviderActorType, input.ProviderActorID).Scan(&walletStatus, &walletCurrency, &available)
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenalty{}, ErrWalletUnavailable
	}
	if err != nil {
		return ProviderPenalty{}, err
	}
	if walletStatus != "active" || walletCurrency != input.Currency {
		return ProviderPenalty{}, ErrWalletUnavailable
	}
	if available < input.AmountMinorUnits {
		return ProviderPenalty{}, ErrInsufficientFunds
	}

	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "provider_penalty_posted", "provider_incident", input.IncidentID, []ledger.LedgerLine{
		{AccountType: "wallet", ActorType: input.ProviderActorType, ActorID: input.ProviderActorID, DebitCredit: "debit", AmountMinorUnits: input.AmountMinorUnits, Currency: input.Currency},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: input.AmountMinorUnits, Currency: input.Currency},
	}, ledger.Actor{ID: input.PostedByActorID, Type: "operator"})
	if err != nil {
		return ProviderPenalty{}, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET
		available_balance_minor_units=available_balance_minor_units-$1,
		last_ledger_entry_at=now(),updated_at=now()
		WHERE tenant_id=$2 AND actor_type=$3 AND actor_id=$4`,
		input.AmountMinorUnits, operatorContextID, input.ProviderActorType, input.ProviderActorID); err != nil {
		return ProviderPenalty{}, err
	}
	item, err := scan(tx.QueryRowContext(ctx, `INSERT INTO wlt_provider_penalties(
		tenant_id,incident_id,provider_actor_id,provider_actor_type,amount_minor_units,
		currency,reason,ledger_transaction_id,posted_by_actor_id,idempotency_key)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING `+columns,
		operatorContextID, input.IncidentID, input.ProviderActorID, input.ProviderActorType, input.AmountMinorUnits,
		input.Currency, input.Reason, ledgerID, input.PostedByActorID, idempotencyKey))
	if err != nil {
		return ProviderPenalty{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderPenalty{}, err
	}
	return item, nil
}

func Reverse(ctx context.Context, db *sql.DB, operatorContextID, penaltyID string, input ReverseInput) (ProviderPenalty, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	penaltyID = strings.TrimSpace(penaltyID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.ReversedByActorID = strings.TrimSpace(input.ReversedByActorID)
	if operatorContextID == "" || penaltyID == "" || len(input.Reason) < 3 || input.ReversedByActorID == "" {
		return ProviderPenalty{}, fmt.Errorf("tenant, penaltyId, reason and reversedByActorId are required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenalty{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	item, err := scan(tx.QueryRowContext(ctx, `SELECT `+columns+` FROM wlt_provider_penalties WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, operatorContextID, penaltyID))
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenalty{}, ErrNotFound
	}
	if err != nil {
		return ProviderPenalty{}, err
	}
	if item.Status == "reversed" {
		if err := tx.Commit(); err != nil {
			return ProviderPenalty{}, err
		}
		return item, nil
	}
	var walletStatus, walletCurrency string
	if err := tx.QueryRowContext(ctx, `SELECT status,currency FROM wlt_wallets
		WHERE tenant_id=$1 AND actor_type=$2 AND actor_id=$3 FOR UPDATE`,
		operatorContextID, item.ProviderActorType, item.ProviderActorID).Scan(&walletStatus, &walletCurrency); err != nil {
		return ProviderPenalty{}, ErrWalletUnavailable
	}
	if walletStatus != "active" || walletCurrency != item.Currency {
		return ProviderPenalty{}, ErrWalletUnavailable
	}
	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "provider_penalty_reversed", "provider_penalty", item.ID, []ledger.LedgerLine{
		{AccountType: "platform_revenue", DebitCredit: "debit", AmountMinorUnits: item.AmountMinorUnits, Currency: item.Currency},
		{AccountType: "wallet", ActorType: item.ProviderActorType, ActorID: item.ProviderActorID, DebitCredit: "credit", AmountMinorUnits: item.AmountMinorUnits, Currency: item.Currency},
	}, ledger.Actor{ID: input.ReversedByActorID, Type: "operator"})
	if err != nil {
		return ProviderPenalty{}, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET
		available_balance_minor_units=available_balance_minor_units+$1,
		last_ledger_entry_at=now(),updated_at=now()
		WHERE tenant_id=$2 AND actor_type=$3 AND actor_id=$4`,
		item.AmountMinorUnits, operatorContextID, item.ProviderActorType, item.ProviderActorID); err != nil {
		return ProviderPenalty{}, err
	}
	item, err = scan(tx.QueryRowContext(ctx, `UPDATE wlt_provider_penalties SET status='reversed',
		reversal_ledger_transaction_id=$3,reversed_by_actor_id=$4,reversed_reason=$5,
		reversed_at=now(),updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING `+columns,
		operatorContextID, item.ID, ledgerID, input.ReversedByActorID, input.Reason))
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
	case errors.Is(err, ErrNotFound):
		shared.SendError(w, http.StatusNotFound, "PROVIDER_PENALTY_NOT_FOUND", err.Error())
	case errors.Is(err, ErrConflict):
		shared.SendError(w, http.StatusConflict, "PROVIDER_PENALTY_CONFLICT", err.Error())
	case errors.Is(err, ErrWalletUnavailable):
		shared.SendError(w, http.StatusConflict, "PROVIDER_WALLET_UNAVAILABLE", err.Error())
	case errors.Is(err, ErrInsufficientFunds):
		shared.SendError(w, http.StatusConflict, "PROVIDER_WALLET_INSUFFICIENT", err.Error())
	default:
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	}
}

func HandlePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input PostInput
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		item, err := Post(r.Context(), db, r.Header.Get("X-Operator-Context-ID"), r.Header.Get("Idempotency-Key"), input)
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
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		item, err := Reverse(r.Context(), db, r.Header.Get("X-Operator-Context-ID"), r.PathValue("penaltyId"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"providerPenalty": item})
	}
}
