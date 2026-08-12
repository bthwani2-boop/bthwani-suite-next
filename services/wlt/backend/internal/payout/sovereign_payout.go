package payout

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

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

func decodeRequiredOperator(w http.ResponseWriter, r *http.Request) (string, bool) {
	var body struct {
		OperatorID string `json:"operatorId"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorId body is required")
		return "", false
	}
	operatorID := strings.TrimSpace(body.OperatorID)
	if operatorID == "" {
		shared.SendError(w, http.StatusBadRequest, "OPERATOR_REQUIRED", "authenticated operatorId is required for payout transitions")
		return "", false
	}
	return operatorID, true
}

func lockedPayout(ctx context.Context, tx *sql.Tx, payoutID string) (*PayoutRequest, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := tx.QueryContext(ctx,
		"SELECT "+requestCols+" FROM wlt_payout_requests WHERE operator_context_id = $1 AND id = $2 FOR UPDATE",
		operatorContextID,
		payoutID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, sql.ErrNoRows
	}
	return scanPayoutRequest(rows)
}

func payoutAfterUpdate(ctx context.Context, tx *sql.Tx, query string, args ...any) (*PayoutRequest, error) {
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, sql.ErrNoRows
	}
	return scanPayoutRequest(rows)
}

func HandleApprovePayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout approval")
			return
		}
		defer tx.Rollback()
		req, err := lockedPayout(r.Context(), tx, r.PathValue("payoutId"))
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout request")
			return
		}
		if req.Status == "approved" && req.ApprovedByOperatorID == operatorID {
			shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: req})
			return
		}
		if req.OperatorID != "" && req.OperatorID == operatorID {
			shared.SendError(w, http.StatusForbidden, "SEPARATION_OF_DUTIES_VIOLATION", "maker cannot approve their own request")
			return
		}
		if req.Status != "pending" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", fmt.Sprintf("cannot approve payout from %s", req.Status))
			return
		}

		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", err.Error())
			return
		}

		// The destination must still be the owner's active version at approval
		// time. A superseded row keeps whatever verification it earned, so
		// checking the status alone would let money be approved to a
		// destination the beneficiary has since replaced.
		var destVerificationStatus string
		var destVersion int
		var destActive bool
		if err := tx.QueryRowContext(r.Context(),
			"SELECT destination_verification_status, destination_version, active FROM wlt_payout_destinations WHERE id = $1 AND operator_context_id = $2",
			req.PayoutDestinationID, operatorContextID).Scan(&destVerificationStatus, &destVersion, &destActive); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout destination not found")
			} else {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to check destination verification status")
			}
			return
		}
		if destVerificationStatus != "verified" {
			shared.SendError(w, http.StatusConflict, "DESTINATION_UNVERIFIED", "cannot approve payout to an unverified destination")
			return
		}
		if !destActive {
			shared.SendError(w, http.StatusConflict, "DESTINATION_SUPERSEDED", "cannot approve payout to a superseded destination version")
			return
		}

		snapshotHash := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%s|%d|%d|%s", req.BeneficiaryActorID, req.BeneficiaryActorType, req.PayoutDestinationID, destVersion, req.AmountMinorUnits, req.Currency)))
		snapshotHashHex := hex.EncodeToString(snapshotHash[:])

		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO wlt_approved_payout_snapshots
			(operator_context_id, payout_request_id, payout_destination_id, destination_version, amount_minor_units, currency, beneficiary_actor_id, beneficiary_actor_type, snapshot_hash, approved_by_operator_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			operatorContextID, req.ID, req.PayoutDestinationID, destVersion, req.AmountMinorUnits, req.Currency, req.BeneficiaryActorID, req.BeneficiaryActorType, snapshotHashHex, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to snapshot approved payout")
			return
		}

		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'approved', approved_at = now(), approved_by_operator_id = $2 WHERE id = $1 RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to approve payout request")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_request", req.ID, "payout.approved", operatorID, "operator", "", correlationID, map[string]any{
			"status": "approved",
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout approval")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout approval")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleRejectPayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout rejection")
			return
		}
		defer tx.Rollback()
		req, err := lockedPayout(r.Context(), tx, r.PathValue("payoutId"))
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout request")
			return
		}
		if req.Status != "pending" && req.Status != "approved" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "only pending or approved payouts can be rejected")
			return
		}
		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'rejected', rejected_at = now(), rejected_by_operator_id = $2, operator_id = $2 WHERE id = $1 RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to reject payout request")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_request", req.ID, "payout.rejected", operatorID, "operator", "", correlationID, map[string]any{
			"status": "rejected",
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout rejection")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout rejection")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleCompletePayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout completion")
			return
		}
		defer tx.Rollback()
		req, err := lockedPayout(r.Context(), tx, r.PathValue("payoutId"))
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout request")
			return
		}
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", err.Error())
			return
		}
		if req.Status != "verified" {
			shared.SendError(w, http.StatusConflict, "VERIFIED_EXECUTION_REQUIRED", "payout cannot complete before its external transfer is executed and independently verified")
			return
		}
		// The executed amount is re-read from the evidence rather than trusted
		// from the request, so a completion cannot settle a different sum than
		// the one that actually left the official wallet.
		var evidenceAmount int64
		var evidenceCurrency, executedBy, verifiedBy string
		if err := tx.QueryRowContext(r.Context(), `
			SELECT e.amount_minor_units, e.currency, e.executed_by_operator_id, e.verified_by_operator_id
			FROM wlt_manual_transfer_evidence e
			JOIN wlt_approved_payout_snapshots s ON s.id = e.approved_snapshot_id
			WHERE s.payout_request_id = $1 AND e.operator_context_id = $2 AND e.verified_at IS NOT NULL
			FOR UPDATE OF e`, req.ID, operatorContextID,
		).Scan(&evidenceAmount, &evidenceCurrency, &executedBy, &verifiedBy); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				shared.SendError(w, http.StatusConflict, "VERIFIED_EXECUTION_REQUIRED", "no verified manual transfer evidence exists for this payout")
				return
			}
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read manual transfer evidence")
			return
		}
		if evidenceAmount != req.AmountMinorUnits || evidenceCurrency != req.Currency {
			shared.SendError(w, http.StatusConflict, "EVIDENCE_SNAPSHOT_MISMATCH", "verified execution evidence does not match the approved payout amount")
			return
		}
		if req.ApprovedByOperatorID == "" || operatorID == req.ApprovedByOperatorID || operatorID == executedBy || operatorID == verifiedBy {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "completion operator must differ from the payout approver, executor and verifier")
			return
		}
		lines := []ledger.LedgerLine{
			{AccountType: "wallet", ActorType: req.BeneficiaryActorType, ActorID: req.BeneficiaryActorID, DebitCredit: "debit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
			{AccountType: "external_settlement_cash", DebitCredit: "credit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(r.Context(), tx, "payout_completed", "payout_request", req.ID, lines, ledger.Actor{ID: operatorID, Type: "operator"}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to post payout journal")
			return
		}
		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'completed', completed_at = now(), completed_by_operator_id = $2, operator_id = $2 WHERE id = $1 AND status = 'verified' RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to complete payout request")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_request", req.ID, "payout.completed", operatorID, "operator", "", correlationID, map[string]any{
			"status": "completed",
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout completion")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout completion")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}
