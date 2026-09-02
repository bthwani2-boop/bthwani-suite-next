package payout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

var (
	ErrDuplicateExternalReference = errors.New("external transfer reference is already used")
	ErrEvidenceAlreadySubmitted   = errors.New("evidence already submitted for this snapshot")
	ErrEvidenceAlreadyVerified    = errors.New("evidence is already verified")
	ErrSeparationOfDuties         = errors.New("separation of duties violation")
	ErrBatchNotExecutable         = errors.New("evidence can only be recorded against a frozen batch")
	ErrSnapshotNotInBatch         = errors.New("snapshot is not part of this settlement batch")
	ErrPayoutNotAwaitingExecution = errors.New("payout is not awaiting external execution")
)

type ManualTransferEvidence struct {
	ID                        string     `json:"id"`
	BatchID                   string     `json:"batchId"`
	ApprovedSnapshotID        string     `json:"approvedSnapshotId"`
	ExternalTransferReference string     `json:"externalTransferReference"`
	EvidenceReference         string     `json:"evidenceReference"`
	AmountMinorUnits          int64      `json:"amountMinorUnits"`
	Currency                  string     `json:"currency"`
	ExecutedByOperatorID      string     `json:"executedByOperatorId"`
	ExecutedAt                time.Time  `json:"executedAt"`
	VerifiedByOperatorID      string     `json:"verifiedByOperatorId"`
	VerifiedAt                *time.Time `json:"verifiedAt"`
}

const manualEvidenceCols = `id, batch_id, approved_snapshot_id, external_transfer_reference,
	COALESCE(evidence_reference, ''), amount_minor_units, currency,
	executed_by_operator_id, executed_at, COALESCE(verified_by_operator_id, ''), verified_at`

func scanManualTransferEvidence(row *sql.Row) (*ManualTransferEvidence, error) {
	var evidence ManualTransferEvidence
	var verifiedAt sql.NullTime
	if err := row.Scan(&evidence.ID, &evidence.BatchID, &evidence.ApprovedSnapshotID,
		&evidence.ExternalTransferReference, &evidence.EvidenceReference,
		&evidence.AmountMinorUnits, &evidence.Currency, &evidence.ExecutedByOperatorID,
		&evidence.ExecutedAt, &evidence.VerifiedByOperatorID, &verifiedAt); err != nil {
		return nil, err
	}
	if verifiedAt.Valid {
		evidence.VerifiedAt = &verifiedAt.Time
	}
	return &evidence, nil
}

type RecordManualExecutionInput struct {
	ApprovedSnapshotID        string `json:"approvedSnapshotId"`
	ExternalTransferReference string `json:"externalTransferReference"`
	EvidenceReference         string `json:"evidenceReference"`
	OperatorID                string `json:"-"`
}

type VerifyManualExecutionInput struct {
	OperatorID string `json:"-"`
}

type batchSnapshotFacts struct {
	PayoutRequestID      string
	AmountMinorUnits     int64
	Currency             string
	ApprovedByOperatorID string
}

func loadBatchSnapshotFacts(ctx context.Context, tx *sql.Tx, operatorContextID, batchID, snapshotID string) (batchSnapshotFacts, error) {
	var facts batchSnapshotFacts
	var inBatch bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM wlt_settlement_batch_rows WHERE batch_id=$1 AND approved_snapshot_id=$2)`, batchID, snapshotID).Scan(&inBatch); err != nil {
		return facts, err
	}
	if !inBatch {
		return facts, ErrSnapshotNotInBatch
	}
	err := tx.QueryRowContext(ctx, `SELECT payout_request_id,amount_minor_units,currency,approved_by_operator_id FROM wlt_approved_payout_snapshots WHERE id=$1 AND operator_context_id=$2`, snapshotID, operatorContextID).Scan(&facts.PayoutRequestID, &facts.AmountMinorUnits, &facts.Currency, &facts.ApprovedByOperatorID)
	if errors.Is(err, sql.ErrNoRows) {
		return facts, ErrSnapshotNotInBatch
	}
	return facts, err
}

func advanceBatchExecutionState(ctx context.Context, tx *sql.Tx, operatorContextID, batchID string) error {
	var rowCount, evidenceCount int
	if err := tx.QueryRowContext(ctx, `SELECT b.row_count,(SELECT COUNT(*) FROM wlt_manual_transfer_evidence e WHERE e.batch_id=b.id) FROM wlt_settlement_batches b WHERE b.id=$1 AND b.operator_context_id=$2`, batchID, operatorContextID).Scan(&rowCount, &evidenceCount); err != nil {
		return err
	}
	next := "execution_in_progress"
	if evidenceCount >= rowCount {
		next = "awaiting_verification"
	}
	_, err := tx.ExecContext(ctx, `UPDATE wlt_settlement_batches SET status=$3 WHERE id=$1 AND operator_context_id=$2 AND status IN ('frozen','execution_in_progress','awaiting_verification')`, batchID, operatorContextID, next)
	return err
}

func RecordManualTransferExecution(ctx context.Context, db *sql.DB, batchID string, input RecordManualExecutionInput, correlationID string) (*ManualTransferEvidence, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	batchID = strings.TrimSpace(batchID)
	input.ApprovedSnapshotID = strings.TrimSpace(input.ApprovedSnapshotID)
	input.ExternalTransferReference = strings.TrimSpace(input.ExternalTransferReference)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)
	input.OperatorID, err = shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	correlationID = strings.TrimSpace(correlationID)
	if batchID == "" || input.ApprovedSnapshotID == "" || input.ExternalTransferReference == "" || input.EvidenceReference == "" || correlationID == "" {
		return nil, fmt.Errorf("batchId, approvedSnapshotId, externalTransferReference, evidenceReference and X-Correlation-ID are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	var batchStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlement_batches WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`, batchID, operatorContextID).Scan(&batchStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("settlement batch not found")
		}
		return nil, err
	}
	if batchStatus != "frozen" && batchStatus != "execution_in_progress" {
		return nil, ErrBatchNotExecutable
	}

	facts, err := loadBatchSnapshotFacts(ctx, tx, operatorContextID, batchID, input.ApprovedSnapshotID)
	if err != nil {
		return nil, err
	}
	if facts.AmountMinorUnits <= 0 || strings.TrimSpace(facts.Currency) == "" {
		return nil, fmt.Errorf("approved snapshot contains invalid monetary facts")
	}
	if input.OperatorID == facts.ApprovedByOperatorID {
		return nil, fmt.Errorf("%w: the approver cannot execute the transfer they approved", ErrSeparationOfDuties)
	}
	var payoutStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM wlt_payout_requests WHERE id=$1 AND operator_context_id=$2 FOR UPDATE`, facts.PayoutRequestID, operatorContextID).Scan(&payoutStatus); err != nil {
		return nil, err
	}
	if payoutStatus != "approved" {
		return nil, fmt.Errorf("%w: payout is %s", ErrPayoutNotAwaitingExecution, payoutStatus)
	}

	row := tx.QueryRowContext(ctx, `INSERT INTO wlt_manual_transfer_evidence
		(operator_context_id,batch_id,approved_snapshot_id,external_transfer_reference,evidence_reference,amount_minor_units,currency,executed_by_operator_id)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+manualEvidenceCols,
		operatorContextID, batchID, input.ApprovedSnapshotID, input.ExternalTransferReference, input.EvidenceReference, facts.AmountMinorUnits, facts.Currency, input.OperatorID)
	evidence, err := scanManualTransferEvidence(row)
	if err != nil {
		if strings.Contains(err.Error(), "wlt_manual_transfer_evidence_ref_uq") {
			return nil, ErrDuplicateExternalReference
		}
		if strings.Contains(err.Error(), "wlt_manual_transfer_evidence_uq") {
			return nil, ErrEvidenceAlreadySubmitted
		}
		return nil, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE wlt_payout_requests SET status='executed',executed_at=now(),executed_by_operator_id=$3 WHERE id=$1 AND operator_context_id=$2 AND status='approved'`, facts.PayoutRequestID, operatorContextID, input.OperatorID)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrPayoutNotAwaitingExecution
	}
	if err := advanceBatchExecutionState(ctx, tx, operatorContextID, batchID); err != nil {
		return nil, err
	}
	if err := appendPayoutAudit(ctx, tx, "payout_request", facts.PayoutRequestID, "payout.externally_executed", input.OperatorID, "operator", "", correlationID, map[string]any{
		"batchId": batchID, "evidenceId": evidence.ID, "externalTransferReference": input.ExternalTransferReference,
		"evidenceReference": input.EvidenceReference, "amountMinorUnits": facts.AmountMinorUnits,
		"currency": facts.Currency, "monetarySource": "approved_snapshot",
	}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return evidence, nil
}

func VerifyManualTransferExecution(ctx context.Context, db *sql.DB, batchID, evidenceID string, input VerifyManualExecutionInput, correlationID string) (*ManualTransferEvidence, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	batchID, evidenceID = strings.TrimSpace(batchID), strings.TrimSpace(evidenceID)
	input.OperatorID, err = shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	correlationID = strings.TrimSpace(correlationID)
	if batchID == "" || evidenceID == "" || correlationID == "" {
		return nil, fmt.Errorf("batchId, evidenceId and X-Correlation-ID are required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	var snapshotID, executedBy string
	var verifiedAt sql.NullTime
	if err := tx.QueryRowContext(ctx, `SELECT approved_snapshot_id,executed_by_operator_id,verified_at FROM wlt_manual_transfer_evidence WHERE id=$1 AND batch_id=$2 AND operator_context_id=$3 FOR UPDATE`, evidenceID, batchID, operatorContextID).Scan(&snapshotID, &executedBy, &verifiedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("manual transfer evidence not found")
		}
		return nil, err
	}
	if verifiedAt.Valid {
		return nil, ErrEvidenceAlreadyVerified
	}
	if input.OperatorID == executedBy {
		return nil, fmt.Errorf("%w: the executor cannot verify their own transfer", ErrSeparationOfDuties)
	}
	facts, err := loadBatchSnapshotFacts(ctx, tx, operatorContextID, batchID, snapshotID)
	if err != nil {
		return nil, err
	}
	if input.OperatorID == facts.ApprovedByOperatorID {
		return nil, fmt.Errorf("%w: the approver cannot verify the transfer they approved", ErrSeparationOfDuties)
	}
	row := tx.QueryRowContext(ctx, `UPDATE wlt_manual_transfer_evidence SET verified_by_operator_id=$3,verified_at=now() WHERE id=$1 AND operator_context_id=$2 AND verified_at IS NULL RETURNING `+manualEvidenceCols, evidenceID, operatorContextID, input.OperatorID)
	evidence, err := scanManualTransferEvidence(row)
	if err != nil {
		return nil, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE wlt_payout_requests SET status='verified',verified_at=now(),verified_by_operator_id=$3 WHERE id=$1 AND operator_context_id=$2 AND status='executed'`, facts.PayoutRequestID, operatorContextID, input.OperatorID)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, fmt.Errorf("%w: payout changed before verification", ErrPayoutNotAwaitingExecution)
	}
	if err := appendPayoutAudit(ctx, tx, "payout_request", facts.PayoutRequestID, "payout.execution_verified", input.OperatorID, "operator", "", correlationID, map[string]any{"batchId": batchID, "evidenceId": evidence.ID}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return evidence, nil
}

func writeManualExecutionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrSeparationOfDuties):
		shared.SendError(w, http.StatusForbidden, "SEPARATION_OF_DUTIES", err.Error())
	case errors.Is(err, ErrDuplicateExternalReference):
		shared.SendError(w, http.StatusConflict, "DUPLICATE_EXTERNAL_REFERENCE", err.Error())
	case errors.Is(err, ErrEvidenceAlreadySubmitted):
		shared.SendError(w, http.StatusConflict, "EVIDENCE_ALREADY_SUBMITTED", err.Error())
	case errors.Is(err, ErrEvidenceAlreadyVerified):
		shared.SendError(w, http.StatusConflict, "EVIDENCE_ALREADY_VERIFIED", err.Error())
	case errors.Is(err, ErrPayoutNotAwaitingExecution), errors.Is(err, ErrBatchNotExecutable):
		shared.SendError(w, http.StatusConflict, "INVALID_STATUS", err.Error())
	case errors.Is(err, ErrSnapshotNotInBatch):
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case err != nil && strings.Contains(err.Error(), "not found"):
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	default:
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	}
}

func HandleRecordManualTransferExecution(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RecordManualExecutionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		evidence, err := RecordManualTransferExecution(r.Context(), db, r.PathValue("batchId"), input, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			writeManualExecutionError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"manualTransferEvidence": evidence})
	}
}

func HandleVerifyManualTransferExecution(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input VerifyManualExecutionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		evidence, err := VerifyManualTransferExecution(r.Context(), db, r.PathValue("batchId"), r.PathValue("evidenceId"), input, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			writeManualExecutionError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"manualTransferEvidence": evidence})
	}
}
