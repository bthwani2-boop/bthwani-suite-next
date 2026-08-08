package settlement

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

var (
	ErrNoApprovedPayoutsFound = errors.New("no open approved payout snapshots found for provider and currency")
	ErrBatchAlreadyFrozen     = errors.New("settlement batch is already frozen")
	ErrBatchNotFrozen         = errors.New("settlement batch is not frozen")
	ErrBatchFrozen            = errors.New("settlement batch is frozen and cannot be modified")
	ErrIdempotencyConflict    = errors.New("idempotency key conflict")
)

type SettlementBatch struct {
	ID                     string     `json:"id"`
	ProviderID             string     `json:"providerId"`
	Currency               string     `json:"currency"`
	BatchHash              string     `json:"batchHash"`
	ControlTotalMinorUnits int64      `json:"controlTotalMinorUnits"`
	RowCount               int        `json:"rowCount"`
	Status                 string     `json:"status"`
	CreatedAt              time.Time  `json:"createdAt"`
	FrozenAt               *time.Time `json:"frozenAt"`
	CreatedByOperatorID    string     `json:"createdByOperatorId"`
}

type CreateSettlementBatchInput struct {
	ProviderID     string `json:"providerId"`
	Currency       string `json:"currency"`
	OperatorID     string `json:"operatorId"`
	IdempotencyKey string `json:"idempotencyKey"`
}

func scanSettlementBatch(row *sql.Row) (*SettlementBatch, error) {
	var b SettlementBatch
	err := row.Scan(
		&b.ID,
		&b.ProviderID,
		&b.Currency,
		&b.BatchHash,
		&b.ControlTotalMinorUnits,
		&b.RowCount,
		&b.Status,
		&b.CreatedAt,
		&b.FrozenAt,
		&b.CreatedByOperatorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func CreateSettlementBatch(ctx context.Context, db *sql.DB, input CreateSettlementBatchInput, correlationID string) (*SettlementBatch, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input.ProviderID = strings.TrimSpace(input.ProviderID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	correlationID = strings.TrimSpace(correlationID)

	if input.ProviderID == "" || input.Currency == "" || input.OperatorID == "" || input.IdempotencyKey == "" {
		return nil, fmt.Errorf("providerId, currency, operatorId, and idempotencyKey are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	rows, err := tx.QueryContext(ctx, `
		SELECT s.id, s.amount_minor_units, s.snapshot_hash
		FROM wlt_approved_payout_snapshots s
		LEFT JOIN wlt_settlement_batch_rows br ON br.approved_snapshot_id = s.id
		WHERE s.operator_context_id = $1
		  AND s.currency = $2
		  AND br.batch_id IS NULL
		ORDER BY s.created_at ASC
	`, operatorContextID, input.Currency)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshotIDs []string
	var totalAmount int64
	hashData := []string{operatorContextID, input.ProviderID, input.Currency}

	for rows.Next() {
		var id, hash string
		var amount int64
		if err := rows.Scan(&id, &amount, &hash); err != nil {
			return nil, err
		}
		snapshotIDs = append(snapshotIDs, id)
		totalAmount += amount
		hashData = append(hashData, id, fmt.Sprintf("%d", amount), hash)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(snapshotIDs) == 0 {
		return nil, ErrNoApprovedPayoutsFound
	}

	h := sha256.New()
	for _, part := range hashData {
		h.Write([]byte(part))
		h.Write([]byte{0})
	}
	batchHash := hex.EncodeToString(h.Sum(nil))

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_settlement_batches 
		(operator_context_id, provider_id, currency, batch_hash, control_total_minor_units, row_count, created_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, provider_id, currency, batch_hash, control_total_minor_units, row_count, status, created_at, frozen_at, created_by_operator_id
	`, operatorContextID, input.ProviderID, input.Currency, batchHash, totalAmount, len(snapshotIDs), input.OperatorID)

	batch, err := scanSettlementBatch(row)
	if err != nil {
		return nil, err
	}

	for _, snapID := range snapshotIDs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO wlt_settlement_batch_rows (batch_id, approved_snapshot_id)
			VALUES ($1, $2)
		`, batch.ID, snapID); err != nil {
			return nil, err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_finance_audit_events
		(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, correlation_id, metadata)
		VALUES ($1, 'settlement_batch', $2, 'batch_created', $3, 'operator', $4,
		jsonb_build_object('providerId', $5, 'currency', $6, 'rowCount', $7, 'total', $8))
	`, operatorContextID, batch.ID, input.OperatorID, correlationID, input.ProviderID, input.Currency, batch.RowCount, batch.ControlTotalMinorUnits); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return batch, nil
}

func FreezeSettlementBatch(ctx context.Context, db *sql.DB, batchID string, operatorID string, correlationID string) (*SettlementBatch, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	batchID = strings.TrimSpace(batchID)
	operatorID = strings.TrimSpace(operatorID)
	correlationID = strings.TrimSpace(correlationID)

	if batchID == "" || operatorID == "" {
		return nil, fmt.Errorf("batchId and operatorId are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlement_batches WHERE id = $1 AND operator_context_id = $2 FOR UPDATE`, batchID, operatorContextID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("settlement batch not found")
		}
		return nil, err
	}

	if status == "frozen" || status == "completed" {
		return nil, ErrBatchAlreadyFrozen
	}
	if status == "cancelled" {
		return nil, fmt.Errorf("cannot freeze a cancelled batch")
	}

	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_settlement_batches
		SET status = 'frozen', frozen_at = now()
		WHERE id = $1 AND operator_context_id = $2
		RETURNING id, provider_id, currency, batch_hash, control_total_minor_units, row_count, status, created_at, frozen_at, created_by_operator_id
	`, batchID, operatorContextID)
	batch, err := scanSettlementBatch(row)
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_finance_audit_events
		(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, correlation_id, metadata)
		VALUES ($1, 'settlement_batch', $2, 'batch_frozen', $3, 'operator', $4, '{}')
	`, operatorContextID, batch.ID, operatorID, correlationID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return batch, nil
}

func HandleCreateSettlementBatch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateSettlementBatchInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1*1024*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		}
		batch, err := CreateSettlementBatch(r.Context(), db, input, r.Header.Get("X-Correlation-ID"))
		if errors.Is(err, ErrNoApprovedPayoutsFound) {
			shared.SendError(w, http.StatusBadRequest, "NO_PAYOUTS", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"settlementBatch": batch})
	}
}

func HandleFreezeSettlementBatch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID string `json:"operatorId"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		batch, err := FreezeSettlementBatch(r.Context(), db, r.PathValue("batchId"), input.OperatorID, r.Header.Get("X-Correlation-ID"))
		if errors.Is(err, ErrBatchAlreadyFrozen) {
			shared.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlementBatch": batch})
	}
}
