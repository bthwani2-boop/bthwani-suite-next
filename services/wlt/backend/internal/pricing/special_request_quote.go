package pricing

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

	"github.com/google/uuid"
)

var (
	ErrSpecialRequestQuoteNotFound = errors.New("special-request pricing quote not found")
	ErrSpecialRequestQuoteExpired  = errors.New("special-request pricing quote has expired")
	ErrSpecialRequestQuoteConflict = errors.New("special-request pricing quote conflicts with the request")
)

type SpecialRequestQuoteProposal struct {
	SpecialRequestID         string `json:"specialRequestId"`
	ClientID                 string `json:"clientId"`
	PolicyID                 string `json:"policyId"`
	ProposedAmountMinorUnits int64  `json:"proposedAmountMinorUnits"`
	ProposedCurrency         string `json:"proposedCurrency"`
	ProposalReason           string `json:"proposalReason"`
	IdempotencyKey           string `json:"-"`
	CorrelationID            string `json:"-"`
}

type SpecialRequestQuote struct {
	ID                       string    `json:"id"`
	OperatorContextID        string    `json:"operatorContextId"`
	SpecialRequestID         string    `json:"specialRequestId"`
	ClientID                 string    `json:"clientId"`
	PolicyID                 string    `json:"policyId"`
	PolicyVersion            int       `json:"policyVersion"`
	QuoteVersion             int       `json:"quoteVersion"`
	ProposedAmountMinorUnits int64     `json:"proposedAmountMinorUnits"`
	ProposedCurrency         string    `json:"proposedCurrency"`
	ProposalReason           string    `json:"proposalReason"`
	AmountMinorUnits         int64     `json:"amountMinorUnits"`
	Currency                 string    `json:"currency"`
	QuoteHash                string    `json:"quoteHash"`
	Status                   string    `json:"status"`
	ExpiresAt                time.Time `json:"expiresAt"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

const specialRequestQuoteColumns = `
	id, operator_context_id, special_request_id::text, client_id::text, policy_id,
	policy_version, quote_version, proposed_amount_minor_units, proposed_currency,
	proposal_reason, amount_minor_units, currency, quote_hash, status, expires_at,
	created_at, updated_at`

func scanSpecialRequestQuote(scan func(...any) error) (*SpecialRequestQuote, error) {
	var quote SpecialRequestQuote
	if err := scan(
		&quote.ID, &quote.OperatorContextID, &quote.SpecialRequestID, &quote.ClientID,
		&quote.PolicyID, &quote.PolicyVersion, &quote.QuoteVersion,
		&quote.ProposedAmountMinorUnits, &quote.ProposedCurrency, &quote.ProposalReason,
		&quote.AmountMinorUnits, &quote.Currency, &quote.QuoteHash, &quote.Status,
		&quote.ExpiresAt, &quote.CreatedAt, &quote.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSpecialRequestQuoteNotFound
		}
		return nil, err
	}
	return &quote, nil
}

func normalizeSpecialRequestQuoteProposal(operatorContextID string, input SpecialRequestQuoteProposal) (string, SpecialRequestQuoteProposal, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	input.SpecialRequestID = strings.TrimSpace(input.SpecialRequestID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.ProposedCurrency = strings.ToUpper(strings.TrimSpace(input.ProposedCurrency))
	input.ProposalReason = strings.TrimSpace(input.ProposalReason)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if operatorContextID == "" || input.SpecialRequestID == "" || input.ClientID == "" || input.PolicyID == "" || input.IdempotencyKey == "" || input.CorrelationID == "" {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("operator context, special request, client, policy, idempotency and correlation are required")
	}
	if _, err := uuid.Parse(input.SpecialRequestID); err != nil {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("specialRequestId must be a UUID")
	}
	if _, err := uuid.Parse(input.ClientID); err != nil {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("clientId must be a UUID")
	}
	if input.ProposedAmountMinorUnits <= 0 {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("proposedAmountMinorUnits must be greater than zero")
	}
	if len(input.ProposedCurrency) != 3 {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("proposedCurrency must be a three-letter code")
	}
	for _, r := range input.ProposedCurrency {
		if r < 'A' || r > 'Z' {
			return "", SpecialRequestQuoteProposal{}, fmt.Errorf("proposedCurrency must be uppercase")
		}
	}
	if len(input.ProposalReason) < 5 || len(input.ProposalReason) > 2000 {
		return "", SpecialRequestQuoteProposal{}, fmt.Errorf("proposalReason must contain between 5 and 2000 characters")
	}
	return operatorContextID, input, nil
}

func specialRequestQuoteRequestHash(input SpecialRequestQuoteProposal) string {
	encoded, _ := json.Marshal(struct {
		SpecialRequestID         string `json:"specialRequestId"`
		ClientID                 string `json:"clientId"`
		PolicyID                 string `json:"policyId"`
		ProposedAmountMinorUnits int64  `json:"proposedAmountMinorUnits"`
		ProposedCurrency         string `json:"proposedCurrency"`
		ProposalReason           string `json:"proposalReason"`
	}{input.SpecialRequestID, input.ClientID, input.PolicyID, input.ProposedAmountMinorUnits, input.ProposedCurrency, input.ProposalReason})
	hash := sha256.Sum256(encoded)
	return hex.EncodeToString(hash[:])
}

func specialRequestQuoteHash(quoteID, operatorContextID string, input SpecialRequestQuoteProposal, policyVersion, quoteVersion int, expiresAt time.Time) string {
	encoded, _ := json.Marshal(struct {
		ID                string    `json:"id"`
		OperatorContextID string    `json:"operatorContextId"`
		SpecialRequestID  string    `json:"specialRequestId"`
		ClientID          string    `json:"clientId"`
		PolicyID          string    `json:"policyId"`
		PolicyVersion     int       `json:"policyVersion"`
		QuoteVersion      int       `json:"quoteVersion"`
		AmountMinorUnits  int64     `json:"amountMinorUnits"`
		Currency          string    `json:"currency"`
		ProposalReason    string    `json:"proposalReason"`
		ExpiresAt         time.Time `json:"expiresAt"`
	}{quoteID, operatorContextID, input.SpecialRequestID, input.ClientID, input.PolicyID, policyVersion, quoteVersion, input.ProposedAmountMinorUnits, input.ProposedCurrency, input.ProposalReason, expiresAt.UTC()})
	hash := sha256.Sum256(encoded)
	return hex.EncodeToString(hash[:])
}

func IssueSpecialRequestQuote(ctx context.Context, db *sql.DB, operatorContextID string, input SpecialRequestQuoteProposal) (*SpecialRequestQuote, bool, error) {
	operatorContextID, input, err := normalizeSpecialRequestQuoteProposal(operatorContextID, input)
	if err != nil {
		return nil, false, err
	}
	requestHash := specialRequestQuoteRequestHash(input)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, operatorContextID+"\x1f"+input.SpecialRequestID); err != nil {
		return nil, false, err
	}
	var existingHash string
	var existingID string
	err = tx.QueryRowContext(ctx, `
		SELECT id::text, request_hash
		FROM wlt_special_request_quotes
		WHERE operator_context_id = $1 AND special_request_id = $2::uuid AND idempotency_key = $3`,
		operatorContextID, input.SpecialRequestID, input.IdempotencyKey).Scan(&existingID, &existingHash)
	if err == nil {
		if existingHash != requestHash {
			return nil, false, ErrSpecialRequestQuoteConflict
		}
		quote, readErr := scanSpecialRequestQuote(tx.QueryRowContext(ctx, `SELECT `+specialRequestQuoteColumns+` FROM wlt_special_request_quotes WHERE id = $1::uuid`, existingID).Scan)
		return quote, readErr == nil, readErr
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	var policyVersion int
	var minAmount, maxAmount int64
	var validitySeconds int
	err = tx.QueryRowContext(ctx, `
		SELECT version, min_amount_minor_units, max_amount_minor_units, quote_validity_seconds
		FROM wlt_special_request_quote_policies
		WHERE policy_id = $1 AND active = true`, input.PolicyID).Scan(&policyVersion, &minAmount, &maxAmount, &validitySeconds)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, fmt.Errorf("active special-request quote policy %q was not found", input.PolicyID)
	}
	if err != nil {
		return nil, false, err
	}
	if input.ProposedAmountMinorUnits < minAmount || input.ProposedAmountMinorUnits > maxAmount {
		return nil, false, fmt.Errorf("proposed amount is outside the active WLT policy bounds")
	}

	var quoteVersion int
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(quote_version), 0) + 1
		FROM wlt_special_request_quotes
		WHERE operator_context_id = $1 AND special_request_id = $2::uuid`, operatorContextID, input.SpecialRequestID).Scan(&quoteVersion); err != nil {
		return nil, false, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE wlt_special_request_quotes
		SET status = 'superseded', updated_at = NOW()
		WHERE operator_context_id = $1 AND special_request_id = $2::uuid AND status = 'active'`, operatorContextID, input.SpecialRequestID); err != nil {
		return nil, false, err
	}
	quoteID := uuid.New().String()
	expiresAt := time.Now().UTC().Add(time.Duration(validitySeconds) * time.Second)
	quoteHash := specialRequestQuoteHash(quoteID, operatorContextID, input, policyVersion, quoteVersion, expiresAt)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_special_request_quotes (
			id, operator_context_id, special_request_id, client_id, policy_id, policy_version,
			quote_version, proposed_amount_minor_units, proposed_currency, proposal_reason,
			amount_minor_units, currency, quote_hash, request_hash, status, expires_at,
			idempotency_key, correlation_id
		) VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $8, $9, $11, $12, 'active', $13, $14, $15)`,
		quoteID, operatorContextID, input.SpecialRequestID, input.ClientID, input.PolicyID, policyVersion,
		quoteVersion, input.ProposedAmountMinorUnits, input.ProposedCurrency, input.ProposalReason,
		quoteHash, requestHash, expiresAt, input.IdempotencyKey, input.CorrelationID); err != nil {
		return nil, false, err
	}
	quote, err := scanSpecialRequestQuote(tx.QueryRowContext(ctx, `SELECT `+specialRequestQuoteColumns+` FROM wlt_special_request_quotes WHERE id = $1::uuid`, quoteID).Scan)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return quote, false, nil
}

func LoadSpecialRequestQuote(ctx context.Context, db *sql.DB, operatorContextID, quoteID string) (*SpecialRequestQuote, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	quoteID = strings.TrimSpace(quoteID)
	if operatorContextID == "" || quoteID == "" {
		return nil, fmt.Errorf("operator context and quote id are required")
	}
	quote, err := scanSpecialRequestQuote(db.QueryRowContext(ctx, `SELECT `+specialRequestQuoteColumns+` FROM wlt_special_request_quotes WHERE operator_context_id = $1 AND id = $2::uuid`, operatorContextID, quoteID).Scan)
	if err != nil {
		return nil, err
	}
	if quote.Status != "active" || !time.Now().UTC().Before(quote.ExpiresAt) {
		return nil, ErrSpecialRequestQuoteExpired
	}
	return quote, nil
}

// LoadSpecialRequestQuoteForSession re-reads and locks the immutable quote
// immediately before a payment session is inserted. The preflight read gives
// callers fast validation; this transaction-bound read closes the supersede
// race between preflight and persistence.
func LoadSpecialRequestQuoteForSession(ctx context.Context, tx *sql.Tx, operatorContextID, quoteID string) (*SpecialRequestQuote, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	quoteID = strings.TrimSpace(quoteID)
	if tx == nil || operatorContextID == "" || quoteID == "" {
		return nil, ErrSpecialRequestQuoteNotFound
	}
	quote, err := scanSpecialRequestQuote(tx.QueryRowContext(ctx, `
		SELECT `+specialRequestQuoteColumns+`
		FROM wlt_special_request_quotes
		WHERE operator_context_id = $1 AND id = $2::uuid AND status = 'active'
		FOR SHARE`, operatorContextID, quoteID).Scan)
	if err != nil {
		return nil, err
	}
	if !time.Now().UTC().Before(quote.ExpiresAt) {
		return nil, ErrSpecialRequestQuoteExpired
	}
	return quote, nil
}

func LoadActiveSpecialRequestQuote(ctx context.Context, db *sql.DB, operatorContextID, specialRequestID string) (*SpecialRequestQuote, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	specialRequestID = strings.TrimSpace(specialRequestID)
	if operatorContextID == "" || specialRequestID == "" {
		return nil, fmt.Errorf("operator context and special request id are required")
	}
	quote, err := scanSpecialRequestQuote(db.QueryRowContext(ctx, `
		SELECT `+specialRequestQuoteColumns+`
		FROM wlt_special_request_quotes
		WHERE operator_context_id = $1 AND special_request_id = $2::uuid AND status = 'active'
		ORDER BY quote_version DESC LIMIT 1`, operatorContextID, specialRequestID).Scan)
	if err != nil {
		return nil, err
	}
	if !time.Now().UTC().Before(quote.ExpiresAt) {
		return nil, ErrSpecialRequestQuoteExpired
	}
	return quote, nil
}
