package payout

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

type ExternalProviderAccountInput struct {
	Currency                 string `json:"currency"`
	OpeningBalanceMinorUnits int64  `json:"openingBalanceMinorUnits"`
}

type ExternalProviderAccount struct {
	ID                   string `json:"id"`
	ProviderKey          string `json:"providerKey"`
	AccountReferenceHash string `json:"accountReferenceHash"`
	Currency             string `json:"currency"`
}

type AuthoritativeStatementLineInput struct {
	ExternalTransferReference string         `json:"externalTransferReference"`
	Direction                 string         `json:"direction"`
	AmountMinorUnits          int64          `json:"amountMinorUnits"`
	Currency                  string         `json:"currency"`
	DestinationReferenceHash  string         `json:"destinationReferenceHash"`
	OccurredAt                *time.Time     `json:"occurredAt"`
	SourceRecord              map[string]any `json:"sourceRecord"`
}

type ImportAuthoritativeStatementInput struct {
	ExternalProviderAccountID string                            `json:"externalProviderAccountId"`
	StatementReference        string                            `json:"statementReference"`
	ArtifactSHA256            string                            `json:"artifactSha256"`
	BusinessDate              string                            `json:"businessDate"`
	ClosingBalanceMinorUnits  int64                             `json:"closingBalanceMinorUnits"`
	Currency                  string                            `json:"currency"`
	Lines                     []AuthoritativeStatementLineInput `json:"lines"`
}

type AuthoritativeStatement struct {
	ID                 string `json:"id"`
	StatementReference string `json:"statementReference"`
	ArtifactSHA256     string `json:"artifactSha256"`
}

func isSHA256(value string) bool {
	if len(value) != 64 {
		return false
	}
	for _, runeValue := range value {
		if !((runeValue >= '0' && runeValue <= '9') || (runeValue >= 'a' && runeValue <= 'f')) {
			return false
		}
	}
	return true
}

func RegisterExternalProviderAccount(ctx context.Context, db *sql.DB, providerKey, accountReferenceHash string, input ExternalProviderAccountInput) (*ExternalProviderAccount, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	providerKey = strings.TrimSpace(providerKey)
	accountReferenceHash = strings.ToLower(strings.TrimSpace(accountReferenceHash))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if providerKey == "" || !isSHA256(accountReferenceHash) || input.Currency == "" {
		return nil, fmt.Errorf("providerKey, SHA-256 accountReferenceHash and currency are required")
	}

	row := db.QueryRowContext(ctx, `
		INSERT INTO wlt_external_provider_accounts
			(operator_context_id, provider_key, account_reference_hash, currency,
			 opening_balance_minor_units, created_by_operator_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (operator_context_id, provider_key, account_reference_hash, currency)
		DO UPDATE SET provider_key = EXCLUDED.provider_key
		RETURNING id, provider_key, account_reference_hash, currency`,
		operatorContextID, providerKey, accountReferenceHash, input.Currency, input.OpeningBalanceMinorUnits, operatorID,
	)
	var account ExternalProviderAccount
	if err := row.Scan(&account.ID, &account.ProviderKey, &account.AccountReferenceHash, &account.Currency); err != nil {
		return nil, err
	}
	return &account, nil
}

func ImportAuthoritativeStatement(ctx context.Context, db *sql.DB, input ImportAuthoritativeStatementInput) (*AuthoritativeStatement, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	input.ExternalProviderAccountID = strings.TrimSpace(input.ExternalProviderAccountID)
	input.StatementReference = strings.TrimSpace(input.StatementReference)
	input.ArtifactSHA256 = strings.ToLower(strings.TrimSpace(input.ArtifactSHA256))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	businessDate, err := time.Parse(time.DateOnly, strings.TrimSpace(input.BusinessDate))
	if err != nil || input.ExternalProviderAccountID == "" || input.StatementReference == "" || !isSHA256(input.ArtifactSHA256) || input.Currency == "" || len(input.Lines) == 0 {
		return nil, fmt.Errorf("account, statementReference, SHA-256 artifact, businessDate, currency and statement lines are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	var accountCurrency string
	if err := tx.QueryRowContext(ctx, `
		SELECT currency FROM wlt_external_provider_accounts
		WHERE id=$1 AND operator_context_id=$2 AND active=true
		FOR UPDATE`, input.ExternalProviderAccountID, operatorContextID,
	).Scan(&accountCurrency); err != nil {
		return nil, fmt.Errorf("active external provider account not found: %w", err)
	}
	if accountCurrency != input.Currency {
		return nil, fmt.Errorf("statement currency must match external provider account currency")
	}

	var statement AuthoritativeStatement
	err = tx.QueryRowContext(ctx, `
		INSERT INTO wlt_external_provider_statements
			(operator_context_id, external_provider_account_id, statement_reference,
			 artifact_sha256, business_date, closing_balance_minor_units, currency, imported_by_operator_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (operator_context_id, artifact_sha256) DO NOTHING
		RETURNING id, statement_reference, artifact_sha256`,
		operatorContextID, input.ExternalProviderAccountID, input.StatementReference,
		input.ArtifactSHA256, businessDate, input.ClosingBalanceMinorUnits, input.Currency, operatorID,
	).Scan(&statement.ID, &statement.StatementReference, &statement.ArtifactSHA256)
	if err == sql.ErrNoRows {
		err = tx.QueryRowContext(ctx, `
			SELECT id, statement_reference, artifact_sha256
			FROM wlt_external_provider_statements
			WHERE operator_context_id=$1 AND artifact_sha256=$2`, operatorContextID, input.ArtifactSHA256,
		).Scan(&statement.ID, &statement.StatementReference, &statement.ArtifactSHA256)
		if err != nil {
			return nil, err
		}
		if statement.StatementReference != input.StatementReference {
			return nil, fmt.Errorf("statement artifact hash is already bound to a different statement reference")
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &statement, nil
	}
	if err != nil {
		return nil, err
	}

	for _, line := range input.Lines {
		line.ExternalTransferReference = strings.TrimSpace(line.ExternalTransferReference)
		line.Direction = strings.ToLower(strings.TrimSpace(line.Direction))
		line.Currency = strings.ToUpper(strings.TrimSpace(line.Currency))
		line.DestinationReferenceHash = strings.ToLower(strings.TrimSpace(line.DestinationReferenceHash))
		if line.ExternalTransferReference == "" || (line.Direction != "incoming" && line.Direction != "outgoing") ||
			line.AmountMinorUnits <= 0 || line.Currency != input.Currency || !isSHA256(line.DestinationReferenceHash) {
			return nil, fmt.Errorf("every statement line needs a unique reference, direction, positive amount, account currency and SHA-256 destination fingerprint")
		}
		sourceRecord, err := json.Marshal(line.SourceRecord)
		if err != nil {
			return nil, fmt.Errorf("encode statement source record: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO wlt_external_provider_statement_lines
				(operator_context_id, statement_id, external_transfer_reference, direction,
				 amount_minor_units, currency, destination_reference_hash, occurred_at, source_record)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
			operatorContextID, statement.ID, line.ExternalTransferReference, line.Direction,
			line.AmountMinorUnits, line.Currency, line.DestinationReferenceHash, line.OccurredAt, sourceRecord,
		); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &statement, nil
}

func HandleRegisterExternalProviderAccount(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ExternalProviderAccountInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		account, err := RegisterExternalProviderAccount(r.Context(), db, r.PathValue("providerKey"), r.PathValue("accountReferenceHash"), input)
		if err != nil {
			shared.SendError(w, http.StatusConflict, "EXTERNAL_PROVIDER_ACCOUNT_INVALID", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"externalProviderAccount": account})
	}
}

func HandleImportAuthoritativeStatement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ImportAuthoritativeStatementInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		statement, err := ImportAuthoritativeStatement(r.Context(), db, input)
		if err != nil {
			shared.SendError(w, http.StatusConflict, "AUTHORITATIVE_STATEMENT_INVALID", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"authoritativeStatement": statement})
	}
}
