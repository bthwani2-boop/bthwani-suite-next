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
	"wlt-api/internal/provider"
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
	rows, err := tx.QueryContext(ctx, "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
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

func HandleProcessPayoutRequestSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
			return
		}
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout processing")
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
		if req.Status != "approved" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "payout must be approved before provider processing")
			return
		}
		if req.ApprovedByOperatorID == "" || req.ApprovedByOperatorID == operatorID {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "payout processor must differ from the approving operator")
			return
		}
		if _, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_requests
			SET status = 'provider_pending', processed_by_operator_id = $2, operator_id = $2
			WHERE id = $1 AND status = 'approved'`, req.ID, operatorID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout for provider processing")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout provider claim")
			return
		}

		providerResult, providerErr := client.Post(r.Context(), "/financial/payout/process", map[string]any{
			"payoutRequestId":      req.ID,
			"beneficiaryActorId":   req.BeneficiaryActorID,
			"beneficiaryActorType": req.BeneficiaryActorType,
			"amountMinorUnits":     req.AmountMinorUnits,
			"currency":             req.Currency,
		}, provider.RequestMetaFromHTTP(r, "wlt-payout"))
		if providerErr != nil {
			var cleanDecline provider.Error
			if errors.As(providerErr, &cleanDecline) {
				_ = failProviderDecline(r.Context(), db, req.ID, providerErr)
			} else {
				markProviderResultUnknown(r.Context(), db, req.ID, providerErr)
			}
			shared.SendProviderError(w, providerErr)
			return
		}
		if providerResult.ProviderReference == "" || (providerResult.Status != "processed" && providerResult.Status != "succeeded") {
			unknownErr := fmt.Errorf("provider returned invalid payout proof")
			markProviderResultUnknown(r.Context(), db, req.ID, unknownErr)
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_INVALID_RESPONSE", unknownErr.Error())
			return
		}

		finalTx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to finalize provider payout")
			return
		}
		defer finalTx.Rollback()
		updated, err := payoutAfterUpdate(r.Context(), finalTx, `
			UPDATE wlt_payout_requests
			SET status = 'processing', processed_at = now(), provider_reference = $2,
			    provider_status = $3, provider_processed_at = now()
			WHERE id = $1 AND status = 'provider_pending'
			RETURNING `+requestCols,
			req.ID, providerResult.ProviderReference, providerResult.Status)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "payout provider result arrived after state changed")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist provider payout proof")
			return
		}
		if err := finalTx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit provider payout proof")
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
