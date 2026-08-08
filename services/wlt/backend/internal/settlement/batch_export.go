package settlement

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

type SettlementBatchExportRow struct {
	ApprovedSnapshotID         string `json:"approvedSnapshotId"`
	PayoutRequestID            string `json:"payoutRequestId"`
	BeneficiaryName            string `json:"beneficiaryName"`
	BeneficiaryActorID         string `json:"beneficiaryActorId"`
	BeneficiaryActorType       string `json:"beneficiaryActorType"`
	DestinationMethod          string `json:"destinationMethod"`
	MaskedDestinationReference string `json:"maskedDestinationReference"`
	AmountMinorUnits           int64  `json:"amountMinorUnits"`
	Currency                   string `json:"currency"`
	SnapshotHash               string `json:"snapshotHash"`
	ApprovedByOperatorID       string `json:"approvedByOperatorId"`
	ApprovedAt                 string `json:"approvedAt"`
}

type SettlementBatchExport struct {
	BatchID                string                     `json:"batchId"`
	ProviderID             string                     `json:"providerId"`
	Currency               string                     `json:"currency"`
	BatchHash              string                     `json:"batchHash"`
	ControlTotalMinorUnits int64                      `json:"controlTotalMinorUnits"`
	RowCount               int                        `json:"rowCount"`
	Status                 string                     `json:"status"`
	FrozenAt               *string                    `json:"frozenAt"`
	Rows                   []SettlementBatchExportRow `json:"rows"`
}

func ExportSettlementBatch(ctx context.Context, db *sql.DB, batchID string) (*SettlementBatchExport, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	batchID = strings.TrimSpace(batchID)
	if batchID == "" {
		return nil, fmt.Errorf("batchId is required")
	}

	var export SettlementBatchExport
	var frozenAt sql.NullTime

	err = db.QueryRowContext(ctx, `
		SELECT id, provider_id, currency, batch_hash, control_total_minor_units, row_count, status, frozen_at
		FROM wlt_settlement_batches
		WHERE id = $1 AND operator_context_id = $2
	`, batchID, operatorContextID).Scan(
		&export.BatchID,
		&export.ProviderID,
		&export.Currency,
		&export.BatchHash,
		&export.ControlTotalMinorUnits,
		&export.RowCount,
		&export.Status,
		&frozenAt,
	)
	if err != nil {
		return nil, err
	}
	if frozenAt.Valid {
		fStr := frozenAt.Time.Format("2006-01-02T15:04:05Z")
		export.FrozenAt = &fStr
	}

	rows, err := db.QueryContext(ctx, `
		SELECT 
			s.id, 
			s.payout_request_id, 
			d.beneficiary_name, 
			s.beneficiary_actor_id, 
			s.beneficiary_actor_type, 
			d.destination_method, 
			d.masked_destination_reference, 
			s.amount_minor_units, 
			s.currency, 
			s.snapshot_hash, 
			s.approved_by_operator_id, 
			s.created_at::text
		FROM wlt_settlement_batch_rows br
		JOIN wlt_approved_payout_snapshots s ON s.id = br.approved_snapshot_id
		JOIN wlt_payout_destinations d ON d.id = s.payout_destination_id
		WHERE br.batch_id = $1 AND s.operator_context_id = $2
		ORDER BY d.destination_method, d.beneficiary_name
	`, batchID, operatorContextID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var row SettlementBatchExportRow
		if err := rows.Scan(
			&row.ApprovedSnapshotID,
			&row.PayoutRequestID,
			&row.BeneficiaryName,
			&row.BeneficiaryActorID,
			&row.BeneficiaryActorType,
			&row.DestinationMethod,
			&row.MaskedDestinationReference,
			&row.AmountMinorUnits,
			&row.Currency,
			&row.SnapshotHash,
			&row.ApprovedByOperatorID,
			&row.ApprovedAt,
		); err != nil {
			return nil, err
		}
		export.Rows = append(export.Rows, row)
	}

	return &export, nil
}

func HandleExportSettlementBatch(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		export, err := ExportSettlementBatch(r.Context(), db, r.PathValue("batchId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"export": export})
	}
}
