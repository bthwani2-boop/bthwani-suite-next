package payout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

type SubmitManualEvidenceInput struct {
	ApprovedSnapshotID        string `json:"approvedSnapshotId"`
	ExternalTransferReference string `json:"externalTransferReference"`
	AmountMinorUnits          int64  `json:"amountMinorUnits"`
	Currency                  string `json:"currency"`
	OperatorID                string `json:"operatorId"`
}

func SubmitManualTransferEvidence(ctx context.Context, db *sql.DB, batchID string, input SubmitManualEvidenceInput, correlationID string) error {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return err
	}
	batchID = strings.TrimSpace(batchID)
	input.ApprovedSnapshotID = strings.TrimSpace(input.ApprovedSnapshotID)
	input.ExternalTransferReference = strings.TrimSpace(input.ExternalTransferReference)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.OperatorID = strings.TrimSpace(input.OperatorID)

	if batchID == "" || input.ApprovedSnapshotID == "" || input.ExternalTransferReference == "" || input.AmountMinorUnits <= 0 || input.Currency == "" || input.OperatorID == "" {
		return fmt.Errorf("batchId, approvedSnapshotId, externalTransferReference, amountMinorUnits, currency, and operatorId are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var batchStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM wlt_settlement_batches WHERE id = $1 AND operator_context_id = $2 FOR UPDATE`, batchID, operatorContextID).Scan(&batchStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("settlement batch not found")
		}
		return err
	}
	if batchStatus != "frozen" {
		return fmt.Errorf("evidence can only be submitted for frozen batches")
	}

	var rowExists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM wlt_settlement_batch_rows WHERE batch_id = $1 AND approved_snapshot_id = $2)`, batchID, input.ApprovedSnapshotID).Scan(&rowExists); err != nil {
		return err
	}
	if !rowExists {
		return fmt.Errorf("snapshot is not part of this settlement batch")
	}

	var expectedAmount int64
	var expectedCurrency string
	if err := tx.QueryRowContext(ctx, `SELECT amount_minor_units, currency FROM wlt_approved_payout_snapshots WHERE id = $1 AND operator_context_id = $2`, input.ApprovedSnapshotID, operatorContextID).Scan(&expectedAmount, &expectedCurrency); err != nil {
		return err
	}
	if expectedAmount != input.AmountMinorUnits || expectedCurrency != input.Currency {
		return fmt.Errorf("submitted evidence amount/currency does not match approved snapshot")
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_manual_transfer_evidence 
		(batch_id, approved_snapshot_id, external_transfer_reference, amount_minor_units, currency, verified_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, batchID, input.ApprovedSnapshotID, input.ExternalTransferReference, input.AmountMinorUnits, input.Currency, input.OperatorID); err != nil {
		if strings.Contains(err.Error(), "wlt_manual_transfer_evidence_ref_uq") {
			return fmt.Errorf("external transfer reference is already used")
		}
		if strings.Contains(err.Error(), "wlt_manual_transfer_evidence_uq") {
			return fmt.Errorf("evidence already submitted for this snapshot")
		}
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_finance_audit_events
		(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, correlation_id, metadata)
		VALUES ($1, 'manual_evidence', $2, 'evidence_submitted', $3, 'operator', $4,
		jsonb_build_object('batchId', $5, 'externalRef', $6, 'amount', $7))
	`, operatorContextID, input.ApprovedSnapshotID, input.OperatorID, correlationID, batchID, input.ExternalTransferReference, input.AmountMinorUnits); err != nil {
		return err
	}

	return tx.Commit()
}

func HandleSubmitManualTransferEvidence(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input SubmitManualEvidenceInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		err := SubmitManualTransferEvidence(r.Context(), db, r.PathValue("batchId"), input, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				shared.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
				return
			}
			shared.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"success": true})
	}
}
