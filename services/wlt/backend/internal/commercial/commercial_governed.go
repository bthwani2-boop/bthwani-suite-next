package commercial

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

func UpdateProductGoverned(db *sql.DB, reference string, input UpdateProductInput) (*Product, error) {
	before, err := GetProduct(db, reference)
	if err != nil {
		return nil, err
	}
	if before.Status == "archived" {
		return nil, ErrInvalidTransition
	}
	return UpdateProduct(db, reference, input)
}

func HandleUpdateProductGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpdateProductInput
		if !decodeJSON(w, r, &input) {
			return
		}
		product, err := UpdateProductGoverned(db, r.PathValue("productReference"), input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"product": product})
	}
}

func AppendLoyaltyEntryGoverned(ctx context.Context, db *sql.DB, input AppendLoyaltyEntryInput) (*LoyaltyEntry, error) {
	operatorContextID, contextErr := shared.RequireOperatorContext(ctx)
	if contextErr != nil {
		return nil, ErrInvalid
	}
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.SourceID = strings.TrimSpace(input.SourceID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if db == nil || input.ClientID == "" || input.SourceType == "" || input.SourceID == "" || input.IdempotencyKey == "" || input.Points <= 0 {
		return nil, ErrInvalid
	}
	if input.Direction != "earn" && input.Direction != "burn" && input.Direction != "expire" && input.Direction != "reverse" {
		return nil, ErrInvalid
	}
	if input.Direction == "reverse" && strings.TrimSpace(input.ReversalOf) == "" {
		return nil, ErrInvalid
	}
	if input.Direction != "reverse" && strings.TrimSpace(input.ReversalOf) != "" {
		return nil, ErrInvalid
	}
	if input.Metadata == nil {
		input.Metadata = map[string]any{}
	}

	existing, err := GetLoyaltyEntryByIdempotency(ctx, db, input.IdempotencyKey)
	if err == nil {
		if existing.ClientID != input.ClientID || existing.Direction != input.Direction || existing.Points != input.Points || existing.SourceType != input.SourceType || existing.SourceID != input.SourceID || stringValue(existing.ReversalOf) != strings.TrimSpace(input.ReversalOf) {
			return nil, ErrConflict
		}
		return existing, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err = tx.ExecContext(ctx, `INSERT INTO wlt_loyalty_accounts(operator_context_id, client_id) VALUES ($1,$2) ON CONFLICT (operator_context_id, client_id) DO NOTHING`, operatorContextID, input.ClientID); err != nil {
		return nil, err
	}

	var balance, lifetime int64
	if err := tx.QueryRowContext(ctx, `SELECT points_balance, lifetime_points FROM wlt_loyalty_accounts WHERE operator_context_id=$1 AND client_id=$2 FOR UPDATE`, operatorContextID, input.ClientID).Scan(&balance, &lifetime); err != nil {
		return nil, err
	}

	points := input.Points
	var deltaBalance, deltaLifetime int64
	var reversal any
	switch input.Direction {
	case "earn":
		deltaBalance = points
		deltaLifetime = points
	case "burn", "expire":
		deltaBalance = -points
	case "reverse":
		var originalOperatorContext, originalClient, originalDirection string
		var originalPoints int64
		err := tx.QueryRowContext(ctx, `SELECT operator_context_id, client_id, direction, points FROM wlt_loyalty_entries WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`, strings.TrimSpace(input.ReversalOf), operatorContextID).Scan(&originalOperatorContext, &originalClient, &originalDirection, &originalPoints)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		if err != nil {
			return nil, err
		}
		if originalOperatorContext != operatorContextID || originalClient != input.ClientID || originalDirection == "reverse" {
			return nil, ErrInvalid
		}
		var reversalCount int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_loyalty_entries WHERE operator_context_id=$1 AND reversal_of=$2`, operatorContextID, input.ReversalOf).Scan(&reversalCount); err != nil {
			return nil, err
		}
		if reversalCount > 0 {
			return nil, ErrAlreadyReversed
		}
		points = originalPoints
		if originalDirection == "earn" {
			deltaBalance = -points
			deltaLifetime = -points
		} else {
			deltaBalance = points
		}
		reversal = strings.TrimSpace(input.ReversalOf)
	}

	newBalance := balance + deltaBalance
	newLifetime := lifetime + deltaLifetime
	if newBalance < 0 || newLifetime < 0 {
		return nil, ErrInsufficientPoints
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_loyalty_accounts SET points_balance=$3, lifetime_points=$4, updated_at=NOW() WHERE operator_context_id=$1 AND client_id=$2`, operatorContextID, input.ClientID, newBalance, newLifetime); err != nil {
		return nil, err
	}

	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return nil, ErrInvalid
	}
	entry, err := scanLoyaltyEntry(tx.QueryRowContext(ctx, `
			INSERT INTO wlt_loyalty_entries
				(operator_context_id, client_id, direction, points, balance_after, source_type, source_id, reversal_of, idempotency_key, correlation_id, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10,''), $11)
			RETURNING `+loyaltyEntrySelectCols,
		operatorContextID, input.ClientID, input.Direction, points, newBalance, input.SourceType, input.SourceID, reversal, input.IdempotencyKey, input.CorrelationID, metadata,
	))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return entry, nil
}

func HandleAppendLoyaltyEntryGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input AppendLoyaltyEntryInput
		if !decodeJSON(w, r, &input) {
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		}
		if input.CorrelationID == "" {
			input.CorrelationID = r.Header.Get("X-Correlation-ID")
		}
		entry, err := AppendLoyaltyEntryGoverned(r.Context(), db, input)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"entry": entry})
	}
}
