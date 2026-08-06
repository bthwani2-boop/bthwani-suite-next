package payout

import (
	"context"
	"database/sql"
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
		if req.Status != "pending" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", fmt.Sprintf("cannot approve payout from %s", req.Status))
			return
		}
		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'approved', approved_at = now(), approved_by_operator_id = $2, operator_id = $2 WHERE id = $1 RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to approve payout request")
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
		result, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_wallets
			SET available_balance_minor_units = available_balance_minor_units + $1,
			    held_balance_minor_units = held_balance_minor_units - $1,
			    updated_at = now()
			WHERE actor_id = $2 AND actor_type = $3 AND held_balance_minor_units >= $1`,
			req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to release held payout funds")
			return
		}
		if affected, _ := result.RowsAffected(); affected != 1 {
			shared.SendError(w, http.StatusConflict, "HELD_BALANCE_MISMATCH", "held wallet balance is insufficient for payout rejection")
			return
		}
		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'rejected', rejected_at = now(), rejected_by_operator_id = $2, operator_id = $2 WHERE id = $1 RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to reject payout request")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout rejection")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func markProviderResultUnknown(ctx context.Context, db *sql.DB, payoutID string, cause error) {
	reason := "provider result unknown"
	if cause != nil {
		reason = cause.Error()
	}
	_, _ = db.ExecContext(ctx, `
		UPDATE wlt_payout_requests
		SET status = 'provider_result_unknown', provider_status = 'unknown', failure_reason = $2
		WHERE id = $1 AND status = 'provider_pending'`, payoutID, reason)
}

func failProviderDecline(ctx context.Context, db *sql.DB, payoutID string, cause error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	req, err := lockedPayout(ctx, tx, payoutID)
	if err != nil {
		return err
	}
	if req.Status != "provider_pending" {
		return fmt.Errorf("payout is no longer provider_pending")
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET available_balance_minor_units = available_balance_minor_units + $1,
		    held_balance_minor_units = held_balance_minor_units - $1,
		    updated_at = now()
		WHERE actor_id = $2 AND actor_type = $3 AND held_balance_minor_units >= $1`,
		req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return fmt.Errorf("held wallet balance mismatch while failing provider payout")
	}
	reason := cause.Error()
	if _, err := tx.ExecContext(ctx, `
		UPDATE wlt_payout_requests
		SET status = 'failed', failed_at = now(), provider_status = 'declined', failure_reason = $2
		WHERE id = $1 AND status = 'provider_pending'`, payoutID, reason); err != nil {
		return err
	}
	return tx.Commit()
}

func HandleCompletePayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
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
		var providerReference, providerStatus string
		if err := tx.QueryRowContext(r.Context(), `SELECT provider_reference, provider_status FROM wlt_payout_requests WHERE id = $1`, req.ID).Scan(&providerReference, &providerStatus); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout provider proof")
			return
		}
		if req.Status != "processing" || providerReference == "" || (providerStatus != "processed" && providerStatus != "succeeded") {
			shared.SendError(w, http.StatusConflict, "PROVIDER_PROOF_REQUIRED", "payout cannot complete without successful provider proof")
			return
		}
		if req.ApprovedByOperatorID == "" || req.ProcessedByOperatorID == "" || operatorID == req.ApprovedByOperatorID || operatorID == req.ProcessedByOperatorID {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "completion operator must differ from payout approver and processor")
			return
		}
		result, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_wallets
			SET held_balance_minor_units = held_balance_minor_units - $1,
			    paid_total_minor_units = paid_total_minor_units + $1,
			    updated_at = now()
			WHERE actor_id = $2 AND actor_type = $3 AND held_balance_minor_units >= $1`,
			req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to settle held payout funds")
			return
		}
		if affected, _ := result.RowsAffected(); affected != 1 {
			shared.SendError(w, http.StatusConflict, "HELD_BALANCE_MISMATCH", "held wallet balance is insufficient for payout completion")
			return
		}
		lines := []ledger.LedgerLine{
			{AccountType: "wallet", ActorType: req.BeneficiaryActorType, ActorID: req.BeneficiaryActorID, DebitCredit: "debit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
			{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(r.Context(), tx, "payout_completed", "payout_request", req.ID, lines, ledger.Actor{ID: operatorID, Type: "operator"}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to post payout journal")
			return
		}
		updated, err := payoutAfterUpdate(r.Context(), tx,
			"UPDATE wlt_payout_requests SET status = 'completed', completed_at = now(), completed_by_operator_id = $2, operator_id = $2 WHERE id = $1 AND status = 'processing' RETURNING "+requestCols,
			req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to complete payout request")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout completion")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleFailPayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = db
		if _, ok := decodeRequiredOperator(w, r); !ok {
			return
		}
		shared.SendError(w, http.StatusConflict, "RECONCILIATION_REQUIRED", "provider-result payouts must be resolved through reconciliation or inquiry; manual fail cannot release held funds")
	}
}
