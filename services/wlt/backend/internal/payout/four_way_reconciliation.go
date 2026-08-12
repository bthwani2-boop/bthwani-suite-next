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

type FourWayReconciliation struct {
	ID                       string `json:"id"`
	PayoutRequestID          string `json:"payoutRequestId"`
	ApprovedSnapshotID       string `json:"approvedSnapshotId"`
	SettlementBatchID        string `json:"settlementBatchId"`
	ManualTransferEvidenceID string `json:"manualTransferEvidenceId"`
	StatementLineID          string `json:"statementLineId"`
	Result                   string `json:"result"`
}

type ReconcilePayoutFourWayInput struct {
	StatementLineID string `json:"statementLineId"`
}

// ReconcilePayoutFourWay records the sole completion prerequisite: immutable
// approval facts, a frozen batch row, independently verified execution
// evidence and an authoritative statement line must agree exactly.
func ReconcilePayoutFourWay(ctx context.Context, db *sql.DB, payoutID string, input ReconcilePayoutFourWayInput, correlationID string) (*FourWayReconciliation, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	payoutID = strings.TrimSpace(payoutID)
	input.StatementLineID = strings.TrimSpace(input.StatementLineID)
	correlationID = strings.TrimSpace(correlationID)
	if payoutID == "" || input.StatementLineID == "" || correlationID == "" {
		return nil, fmt.Errorf("payoutId, statementLineId and X-Correlation-ID are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var snapshotID, destinationID, batchID, evidenceID string
	var amount int64
	var currency, externalReference string
	var verifiedAt sql.NullTime
	if err := tx.QueryRowContext(ctx, `
		SELECT s.id, s.payout_destination_id, s.amount_minor_units, s.currency,
		       e.batch_id, e.id, e.external_transfer_reference, e.verified_at
		FROM wlt_approved_payout_snapshots s
		JOIN wlt_manual_transfer_evidence e
		  ON e.approved_snapshot_id = s.id
		JOIN wlt_settlement_batch_rows br
		  ON br.batch_id = e.batch_id AND br.approved_snapshot_id = s.id
		WHERE s.operator_context_id = $1
		  AND s.payout_request_id = $2
		  AND e.operator_context_id = $1
		FOR UPDATE OF s, e, br`, operatorContextID, payoutID,
	).Scan(&snapshotID, &destinationID, &amount, &currency, &batchID, &evidenceID, &externalReference, &verifiedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("verified execution evidence in a frozen settlement batch is required")
		}
		return nil, err
	}
	if !verifiedAt.Valid {
		return nil, fmt.Errorf("verified execution evidence is required")
	}

	var expectedDestinationHash string
	if err := tx.QueryRowContext(ctx, `
		SELECT material_identity_hash
		FROM wlt_payout_destinations
		WHERE operator_context_id = $1 AND id = $2`, operatorContextID, destinationID,
	).Scan(&expectedDestinationHash); err != nil {
		return nil, fmt.Errorf("read approved payout destination: %w", err)
	}

	var statementReference, lineReference, direction, lineCurrency, destinationHash string
	var lineAmount int64
	if err := tx.QueryRowContext(ctx, `
		SELECT s.statement_reference, l.external_transfer_reference, l.direction,
		       l.amount_minor_units, l.currency, l.destination_reference_hash
		FROM wlt_external_provider_statement_lines l
		JOIN wlt_external_provider_statements s ON s.id = l.statement_id
		WHERE l.id = $1 AND l.operator_context_id = $2 AND s.operator_context_id = $2
		FOR UPDATE OF l`, input.StatementLineID, operatorContextID,
	).Scan(&statementReference, &lineReference, &direction, &lineAmount, &lineCurrency, &destinationHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("authoritative statement line not found")
		}
		return nil, err
	}

	result := "MATCHED"
	switch {
	case direction != "outgoing" || lineReference != externalReference:
		result = "MISSING_TRANSFER"
	case lineAmount != amount || lineCurrency != currency:
		result = "AMOUNT_MISMATCH"
	case destinationHash != expectedDestinationHash:
		result = "DESTINATION_MISMATCH"
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_payout_four_way_reconciliations
			(operator_context_id, payout_request_id, approved_snapshot_id, settlement_batch_id,
			 manual_transfer_evidence_id, statement_line_id, result, reconciled_by_operator_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (operator_context_id, payout_request_id) DO NOTHING
		RETURNING id, payout_request_id, approved_snapshot_id, settlement_batch_id,
		          manual_transfer_evidence_id, statement_line_id, result`,
		operatorContextID, payoutID, snapshotID, batchID, evidenceID, input.StatementLineID, result, operatorID,
	)
	var reconciliation FourWayReconciliation
	err = row.Scan(&reconciliation.ID, &reconciliation.PayoutRequestID, &reconciliation.ApprovedSnapshotID,
		&reconciliation.SettlementBatchID, &reconciliation.ManualTransferEvidenceID, &reconciliation.StatementLineID, &reconciliation.Result)
	if errors.Is(err, sql.ErrNoRows) {
		if err := tx.QueryRowContext(ctx, `
			SELECT id, payout_request_id, approved_snapshot_id, settlement_batch_id,
			       manual_transfer_evidence_id, statement_line_id, result
			FROM wlt_payout_four_way_reconciliations
			WHERE operator_context_id=$1 AND payout_request_id=$2
			FOR UPDATE`, operatorContextID, payoutID,
		).Scan(&reconciliation.ID, &reconciliation.PayoutRequestID, &reconciliation.ApprovedSnapshotID,
			&reconciliation.SettlementBatchID, &reconciliation.ManualTransferEvidenceID, &reconciliation.StatementLineID, &reconciliation.Result); err != nil {
			return nil, err
		}
		if reconciliation.StatementLineID != input.StatementLineID {
			return nil, fmt.Errorf("payout already has immutable four-way reconciliation %s", reconciliation.ID)
		}
	} else if err != nil {
		return nil, err
	}

	if err := appendPayoutAudit(ctx, tx, "payout_request", payoutID, "payout.four_way_reconciled",
		operatorID, "operator", "", correlationID, map[string]any{
			"reconciliationId":     reconciliation.ID,
			"statementReference":   statementReference,
			"statementLineId":      input.StatementLineID,
			"reconciliationResult": reconciliation.Result,
		}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &reconciliation, nil
}

func HandleReconcilePayoutFourWay(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ReconcilePayoutFourWayInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		reconciliation, err := ReconcilePayoutFourWay(r.Context(), db, r.PathValue("payoutId"), input, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			shared.SendError(w, http.StatusConflict, "FOUR_WAY_RECONCILIATION_REQUIRED", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"fourWayReconciliation": reconciliation})
	}
}
