package settlement

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
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
	IdempotentReplay       bool       `json:"-"`
}

type CreateSettlementBatchInput struct {
	ProviderID     string `json:"providerId"`
	Currency       string `json:"currency"`
	IdempotencyKey string `json:"idempotencyKey"`
}

const settlementBatchCols = `id, provider_id, currency, batch_hash, control_total_minor_units,
	row_count, status, created_at, frozen_at, created_by_operator_id`

func scanSettlementBatch(row *sql.Row) (*SettlementBatch, error) {
	var b SettlementBatch
	err := row.Scan(&b.ID, &b.ProviderID, &b.Currency, &b.BatchHash,
		&b.ControlTotalMinorUnits, &b.RowCount, &b.Status, &b.CreatedAt,
		&b.FrozenAt, &b.CreatedByOperatorID)
	if errors.Is(err, sql.ErrNoRows) { return nil, nil }
	if err != nil { return nil, err }
	return &b, nil
}

func settlementMutationHash(parts ...string) string {
	h := sha256.New()
	for _, part := range parts {
		h.Write([]byte(strings.TrimSpace(part)))
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func settlementReplay(ctx context.Context, tx *sql.Tx, operatorContextID, operation, idempotencyKey, requestHash string) (*SettlementBatch, bool, error) {
	var storedHash, batchID string
	err := tx.QueryRowContext(ctx, `SELECT request_hash, settlement_batch_id
		FROM wlt_settlement_mutation_requests
		WHERE operator_context_id=$1 AND operation=$2 AND idempotency_key=$3`,
		operatorContextID, operation, idempotencyKey).Scan(&storedHash, &batchID)
	if errors.Is(err, sql.ErrNoRows) { return nil, false, nil }
	if err != nil { return nil, false, err }
	if storedHash != requestHash { return nil, false, ErrIdempotencyConflict }
	batch, err := scanSettlementBatch(tx.QueryRowContext(ctx,
		`SELECT `+settlementBatchCols+` FROM wlt_settlement_batches WHERE operator_context_id=$1 AND id=$2`,
		operatorContextID, batchID))
	if err != nil { return nil, false, err }
	if batch == nil { return nil, false, fmt.Errorf("idempotency record points to missing settlement batch") }
	batch.IdempotentReplay = true
	return batch, true, nil
}

func recordSettlementMutation(ctx context.Context, tx *sql.Tx, operatorContextID, operation, idempotencyKey, requestHash, batchID, operatorID, correlationID string) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO wlt_settlement_mutation_requests
		(operator_context_id,operation,idempotency_key,request_hash,settlement_batch_id,acted_by_operator_id,correlation_id)
		VALUES($1,$2,$3,$4,$5,$6,$7)`,
		operatorContextID, operation, idempotencyKey, requestHash, batchID, operatorID, correlationID)
	return err
}

func CreateSettlementBatch(ctx context.Context, db *sql.DB, input CreateSettlementBatchInput, correlationID string) (*SettlementBatch, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil { return nil, err }
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil { return nil, err }
	input.ProviderID = strings.ToLower(strings.TrimSpace(input.ProviderID))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if input.ProviderID == "" || len(input.Currency) != 3 || len(input.IdempotencyKey) < 8 || correlationID == "" {
		return nil, fmt.Errorf("providerId, three-letter currency, Idempotency-Key of at least 8 characters, and X-Correlation-ID are required")
	}
	requestHash := settlementMutationHash(operatorContextID, "batch_create", input.ProviderID, input.Currency, operatorID)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, operatorContextID+"\x1fsettlement-create\x1f"+input.IdempotencyKey); err != nil { return nil, err }
	if replay, ok, err := settlementReplay(ctx, tx, operatorContextID, "batch_create", input.IdempotencyKey, requestHash); err != nil {
		return nil, err
	} else if ok {
		if err := tx.Commit(); err != nil { return nil, err }
		return replay, nil
	}
	// Serialize snapshot selection for a provider/currency so two distinct
	// idempotency keys cannot race the same approved snapshot into two batches.
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, operatorContextID+"\x1f"+input.ProviderID+"\x1f"+input.Currency+"\x1fsettlement-selection"); err != nil { return nil, err }

	rows, err := tx.QueryContext(ctx, `
		SELECT s.id, s.amount_minor_units, s.snapshot_hash
		FROM wlt_approved_payout_snapshots s
		JOIN wlt_payout_requests p
		  ON p.operator_context_id=s.operator_context_id AND p.id=s.payout_request_id AND p.status='approved'
		JOIN wlt_payout_destinations d
		  ON d.operator_context_id=s.operator_context_id AND d.id=s.payout_destination_id
		LEFT JOIN wlt_settlement_batch_rows br ON br.approved_snapshot_id=s.id
		WHERE s.operator_context_id=$1
		  AND s.currency=$2
		  AND d.official_wallet_provider_key=$3
		  AND br.batch_id IS NULL
		ORDER BY s.created_at ASC, s.id ASC
		FOR UPDATE OF s,p
	`, operatorContextID, input.Currency, input.ProviderID)
	if err != nil { return nil, err }
	defer rows.Close()

	var snapshotIDs []string
	var totalAmount int64
	hashData := []string{operatorContextID, input.ProviderID, input.Currency}
	for rows.Next() {
		var id, hash string
		var amount int64
		if err := rows.Scan(&id, &amount, &hash); err != nil { return nil, err }
		if amount <= 0 || totalAmount > math.MaxInt64-amount { return nil, fmt.Errorf("approved snapshot amount is invalid or control total overflows int64") }
		snapshotIDs = append(snapshotIDs, id)
		totalAmount += amount
		hashData = append(hashData, id, fmt.Sprintf("%d", amount), hash)
	}
	if err := rows.Err(); err != nil { return nil, err }
	if len(snapshotIDs) == 0 { return nil, ErrNoApprovedPayoutsFound }

	batchHash := settlementMutationHash(hashData...)
	batch, err := scanSettlementBatch(tx.QueryRowContext(ctx, `INSERT INTO wlt_settlement_batches
		(operator_context_id,provider_id,currency,batch_hash,control_total_minor_units,row_count,created_by_operator_id)
		VALUES($1,$2,$3,$4,$5,$6,$7)
		RETURNING `+settlementBatchCols,
		operatorContextID, input.ProviderID, input.Currency, batchHash, totalAmount, len(snapshotIDs), operatorID))
	if err != nil { return nil, err }
	for _, snapID := range snapshotIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_settlement_batch_rows(batch_id,approved_snapshot_id) VALUES($1,$2)`, batch.ID, snapID); err != nil { return nil, err }
	}
	if err := recordSettlementMutation(ctx, tx, operatorContextID, "batch_create", input.IdempotencyKey, requestHash, batch.ID, operatorID, correlationID); err != nil { return nil, err }
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_finance_audit_events
		(operator_context_id,aggregate_type,aggregate_id,action,actor_id,actor_type,correlation_id,metadata)
		VALUES($1,'settlement_batch',$2,'batch_created',$3,'operator',$4,
		jsonb_build_object('providerId',$5,'currency',$6,'rowCount',$7,'controlTotalMinorUnits',$8,'monetarySource','approved_snapshots'))`,
		operatorContextID, batch.ID, operatorID, correlationID, input.ProviderID, input.Currency, batch.RowCount, batch.ControlTotalMinorUnits); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return batch, nil
}

func FreezeSettlementBatch(ctx context.Context, db *sql.DB, batchID, idempotencyKey, correlationID string) (*SettlementBatch, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil { return nil, err }
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil { return nil, err }
	batchID = strings.TrimSpace(batchID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if batchID == "" || len(idempotencyKey) < 8 || correlationID == "" {
		return nil, fmt.Errorf("batchId, Idempotency-Key of at least 8 characters, and X-Correlation-ID are required")
	}
	requestHash := settlementMutationHash(operatorContextID, "batch_freeze", batchID, operatorID)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, operatorContextID+"\x1fsettlement-freeze\x1f"+idempotencyKey); err != nil { return nil, err }
	if replay, ok, err := settlementReplay(ctx, tx, operatorContextID, "batch_freeze", idempotencyKey, requestHash); err != nil {
		return nil, err
	} else if ok {
		if replay.ID != batchID { return nil, ErrIdempotencyConflict }
		if err := tx.Commit(); err != nil { return nil, err }
		return replay, nil
	}

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlement_batches WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`, batchID, operatorContextID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) { return nil, fmt.Errorf("settlement batch not found") }
		return nil, err
	}
	if status == "frozen" || status == "execution_in_progress" || status == "awaiting_verification" || status == "completed" { return nil, ErrBatchAlreadyFrozen }
	if status == "cancelled" { return nil, fmt.Errorf("cannot freeze a cancelled batch") }

	batch, err := scanSettlementBatch(tx.QueryRowContext(ctx, `UPDATE wlt_settlement_batches SET status='frozen',frozen_at=now()
		WHERE id=$1 AND operator_context_id=$2 RETURNING `+settlementBatchCols, batchID, operatorContextID))
	if err != nil { return nil, err }
	if err := recordSettlementMutation(ctx, tx, operatorContextID, "batch_freeze", idempotencyKey, requestHash, batch.ID, operatorID, correlationID); err != nil { return nil, err }
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_finance_audit_events
		(operator_context_id,aggregate_type,aggregate_id,action,actor_id,actor_type,correlation_id,metadata)
		VALUES($1,'settlement_batch',$2,'batch_frozen',$3,'operator',$4,'{}')`, operatorContextID, batch.ID, operatorID, correlationID); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return batch, nil
}

func HandleCreateSettlementBatch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateSettlementBatchInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid"); return }
		if input.IdempotencyKey == "" { input.IdempotencyKey = r.Header.Get("Idempotency-Key") }
		batch, err := CreateSettlementBatch(r.Context(), db, input, r.Header.Get("X-Correlation-ID"))
		switch {
		case errors.Is(err, ErrNoApprovedPayoutsFound): shared.SendError(w, http.StatusBadRequest, "NO_PAYOUTS", err.Error()); return
		case errors.Is(err, ErrIdempotencyConflict): shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error()); return
		case err != nil: shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()); return
		}
		status := http.StatusCreated
		if batch.IdempotentReplay { status = http.StatusOK }
		shared.SendJSON(w, status, map[string]any{"settlementBatch": batch})
	}
}

func HandleFreezeSettlementBatch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct{}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body must be an empty object"); return }
		batch, err := FreezeSettlementBatch(r.Context(), db, r.PathValue("batchId"), r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"))
		switch {
		case errors.Is(err, ErrBatchAlreadyFrozen): shared.SendError(w, http.StatusConflict, "CONFLICT", err.Error()); return
		case errors.Is(err, ErrIdempotencyConflict): shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error()); return
		case err != nil: shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()); return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlementBatch": batch})
	}
}
