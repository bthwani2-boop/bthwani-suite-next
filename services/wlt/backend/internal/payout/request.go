package payout

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

// makerCheckerEnforced reports whether the same operator is blocked from
// both approving and completing the same payout request. It defaults to
// disabled so single-operator dev/test environments (and any deployment
// where DSH does not yet plumb an authenticated operator id through) are not
// hard-blocked; production deployments should set
// WLT_MAKER_CHECKER_ENFORCED=true once operator identity is reliably passed.
func makerCheckerEnforced() bool {
	return os.Getenv("WLT_MAKER_CHECKER_ENFORCED") == "true"
}

// operatorIDFromRequest reads an optional operatorId from the JSON request
// body. An empty/missing value is tolerated (falls back to "unrecorded")
// rather than rejected, since not every caller has been updated to send one
// yet; maker/checker enforcement only actually blocks a transition when both
// the earlier and current operator ids are non-empty and equal.
func operatorIDFromRequest(r *http.Request) string {
	var body struct {
		OperatorID string `json:"operatorId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	return strings.TrimSpace(body.OperatorID)
}

// payloadHash computes a stable hash over the fields that define a payout
// request's financial intent, so a reused Idempotency-Key with a different
// payload can be detected instead of silently returning the earlier request.
func payloadHash(beneficiaryActorID, beneficiaryActorType string, amountMinorUnits int64, currency string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%d|%s", beneficiaryActorID, beneficiaryActorType, amountMinorUnits, currency)))
	return hex.EncodeToString(sum[:])
}

const requestCols = `id, beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status,
	requested_at, approved_at, rejected_at, processed_at, completed_at, failed_at, failure_reason, operator_id,
	approved_by_operator_id, rejected_by_operator_id, processed_by_operator_id, completed_by_operator_id, failed_by_operator_id,
	idempotency_key`

func scanPayoutRequest(rows *sql.Rows) (*PayoutRequest, error) {
	var p PayoutRequest
	var approvedAt, rejectedAt, processedAt, completedAt, failedAt sql.NullTime
	var failureReason, operatorID, idempotencyKey sql.NullString
	var approvedBy, rejectedBy, processedBy, completedBy, failedBy sql.NullString

	err := rows.Scan(
		&p.ID, &p.BeneficiaryActorID, &p.BeneficiaryActorType, &p.AmountMinorUnits, &p.Currency, &p.Status,
		&p.RequestedAt, &approvedAt, &rejectedAt, &processedAt, &completedAt, &failedAt,
		&failureReason, &operatorID,
		&approvedBy, &rejectedBy, &processedBy, &completedBy, &failedBy,
		&idempotencyKey,
	)
	if err != nil {
		return nil, err
	}

	if approvedAt.Valid {
		p.ApprovedAt = &approvedAt.Time
	}
	if rejectedAt.Valid {
		p.RejectedAt = &rejectedAt.Time
	}
	if processedAt.Valid {
		p.ProcessedAt = &processedAt.Time
	}
	if completedAt.Valid {
		p.CompletedAt = &completedAt.Time
	}
	if failedAt.Valid {
		p.FailedAt = &failedAt.Time
	}
	p.FailureReason = failureReason.String
	p.OperatorID = operatorID.String
	p.ApprovedByOperatorID = approvedBy.String
	p.RejectedByOperatorID = rejectedBy.String
	p.ProcessedByOperatorID = processedBy.String
	p.CompletedByOperatorID = completedBy.String
	p.FailedByOperatorID = failedBy.String
	p.IdempotencyKey = idempotencyKey.String

	return &p, nil
}

func HandleCreatePayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreatePayoutRequestInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid body")
			return
		}

		if input.AmountMinorUnits <= 0 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_AMOUNT", "amount must be positive")
			return
		}
		if input.Currency == "" {
			input.Currency = "YER"
		}
		if input.IdempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY", "idempotency key is required")
			return
		}

		newHash := payloadHash(input.BeneficiaryActorID, input.BeneficiaryActorType, input.AmountMinorUnits, input.Currency)

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		// Check idempotency. A matching key with a matching payload hash
		// returns the earlier request (safe retry); a matching key with a
		// different payload is a conflict, not a silent success.
		var existingHash sql.NullString
		hashErr := tx.QueryRowContext(r.Context(), "SELECT payload_hash FROM wlt_payout_requests WHERE idempotency_key = $1 LIMIT 1", input.IdempotencyKey).Scan(&existingHash)
		if hashErr == nil {
			if existingHash.Valid && existingHash.String != newHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different payload")
				return
			}
			rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE idempotency_key = $1 LIMIT 1", input.IdempotencyKey)
			if err == nil && rows.Next() {
				existing, _ := scanPayoutRequest(rows)
				rows.Close()
				shared.SendJSON(w, http.StatusCreated, PayoutRequestResponse{PayoutRequest: existing})
				return
			}
			if rows != nil {
				rows.Close()
			}
		} else if hashErr != sql.ErrNoRows {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to check idempotency key")
			return
		}

		// Verify balance
		var available int64
		err = tx.QueryRowContext(r.Context(), "SELECT available_balance_minor_units FROM wlt_wallets WHERE actor_id = $1 AND actor_type = $2 FOR UPDATE", input.BeneficiaryActorID, input.BeneficiaryActorType).Scan(&available)
		if err == sql.ErrNoRows {
			shared.SendError(w, http.StatusBadRequest, "NO_WALLET", "wallet not found")
			return
		} else if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read wallet")
			return
		}

		if available < input.AmountMinorUnits {
			shared.SendError(w, http.StatusBadRequest, "INSUFFICIENT_FUNDS", "insufficient available balance")
			return
		}

		// Hold funds
		_, err = tx.ExecContext(r.Context(), `
			UPDATE wlt_wallets
			SET available_balance_minor_units = available_balance_minor_units - $1,
			    held_balance_minor_units = held_balance_minor_units + $1,
				updated_at = now()
			WHERE actor_id = $2 AND actor_type = $3`,
			input.AmountMinorUnits, input.BeneficiaryActorID, input.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to update wallet")
			return
		}

		// Create request
		insertRows, err := tx.QueryContext(r.Context(), `
			INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status, idempotency_key, payload_hash)
			VALUES ($1, $2, $3, $4, 'pending', $5, $6)
			RETURNING `+requestCols,
			input.BeneficiaryActorID, input.BeneficiaryActorType, input.AmountMinorUnits, input.Currency, input.IdempotencyKey, newHash,
		)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to create payout request")
			return
		}
		defer insertRows.Close()
		insertRows.Next()
		req, _ := scanPayoutRequest(insertRows)

		tx.Commit()
		shared.SendJSON(w, http.StatusCreated, PayoutRequestResponse{PayoutRequest: req})
	}
}

func HandleListPayoutRequests(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		beneficiaryActorID := r.URL.Query().Get("beneficiaryActorId")
		beneficiaryActorType := r.URL.Query().Get("beneficiaryActorType")

		query := "SELECT " + requestCols + " FROM wlt_payout_requests"
		args := []any{}

		switch {
		case beneficiaryActorID != "" && beneficiaryActorType != "":
			query += " WHERE beneficiary_actor_id = $1 AND beneficiary_actor_type = $2"
			args = append(args, beneficiaryActorID, beneficiaryActorType)
		case beneficiaryActorID != "" || beneficiaryActorType != "":
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "beneficiaryActorId and beneficiaryActorType must be supplied together")
			return
		default:
			// No beneficiary scoping supplied: only an internal/service caller
			// (e.g. an operator console) may list across all beneficiaries.
			if !shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh") {
				return
			}
		}
		query += " ORDER BY requested_at DESC"

		rows, err := db.QueryContext(r.Context(), query, args...)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query payout requests")
			return
		}
		defer rows.Close()

		reqs := make([]*PayoutRequest, 0)
		for rows.Next() {
			req, err := scanPayoutRequest(rows)
			if err == nil {
				reqs = append(reqs, req)
			}
		}

		shared.SendJSON(w, http.StatusOK, PayoutRequestListResponse{PayoutRequests: reqs, Total: len(reqs)})
	}
}

func HandleGetPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		if payoutID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId required")
			return
		}

		rows, err := db.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 LIMIT 1", payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query request")
			return
		}
		defer rows.Close()
		if !rows.Next() {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		req, _ := scanPayoutRequest(rows)
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: req})
	}
}

func changePayoutStatus(db *sql.DB, w http.ResponseWriter, r *http.Request, fromStatus string, toStatus string, actionCol string, operatorCol string) {
	payoutID := r.PathValue("payoutId")
	operatorID := operatorIDFromRequest(r)

	tx, err := db.BeginTx(r.Context(), nil)
	if err != nil {
		shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
		return
	}
	defer tx.Rollback()

	// get request
	rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
	if err != nil {
		shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "query failed")
		return
	}
	if !rows.Next() {
		rows.Close()
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "not found")
		return
	}
	req, _ := scanPayoutRequest(rows)
	rows.Close()

	// check statuses
	if fromStatus != "" && !strings.Contains(fromStatus, req.Status) {
		shared.SendError(w, http.StatusBadRequest, "INVALID_STATUS", fmt.Sprintf("cannot transition from %s to %s", req.Status, toStatus))
		return
	}

	if req.Status == toStatus {
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: req})
		return
	}

	// perform update
	q := fmt.Sprintf("UPDATE wlt_payout_requests SET status = $1, %s = now(), %s = NULLIF($3, ''), operator_id = NULLIF($3, '') WHERE id = $2 RETURNING "+requestCols, actionCol, operatorCol)
	rows2, err := tx.QueryContext(r.Context(), q, toStatus, payoutID, operatorID)
	if err != nil {
		shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "update failed")
		return
	}
	defer rows2.Close()
	rows2.Next()
	updated, _ := scanPayoutRequest(rows2)
	tx.Commit()

	shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
}

func HandleApprovePayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		changePayoutStatus(db, w, r, "pending", "approved", "approved_at", "approved_by_operator_id")
	}
}

func HandleRejectPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		operatorID := operatorIDFromRequest(r)

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil {
				rows.Close()
			}
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "not found")
			return
		}
		req, _ := scanPayoutRequest(rows)
		rows.Close()

		if req.Status != "pending" && req.Status != "approved" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_STATUS", "cannot reject")
			return
		}

		// return held funds
		_, err = tx.ExecContext(r.Context(), "UPDATE wlt_wallets SET available_balance_minor_units = available_balance_minor_units + $1, held_balance_minor_units = held_balance_minor_units - $1, updated_at = now() WHERE actor_id = $2 AND actor_type = $3", req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "wallet update failed")
			return
		}

		q := "UPDATE wlt_payout_requests SET status = 'rejected', rejected_at = now(), rejected_by_operator_id = NULLIF($2, ''), operator_id = NULLIF($2, '') WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID, operatorID)
		defer rows2.Close()
		rows2.Next()
		updated, _ := scanPayoutRequest(rows2)
		tx.Commit()

		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleProcessPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		changePayoutStatus(db, w, r, "approved", "processing", "processed_at", "processed_by_operator_id")
	}
}

func HandleCompletePayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		operatorID := operatorIDFromRequest(r)

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil {
				rows.Close()
			}
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "not found")
			return
		}
		req, _ := scanPayoutRequest(rows)
		rows.Close()

		if req.Status != "processing" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_STATUS", "cannot complete")
			return
		}

		// Maker/checker: the operator who approved this payout may not also
		// be the one who completes it. Only enforced when both an approver
		// and a completer operator id are actually known -- see
		// makerCheckerEnforced's doc comment for why this defaults off.
		if makerCheckerEnforced() && operatorID != "" && req.ApprovedByOperatorID != "" && operatorID == req.ApprovedByOperatorID {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "the operator who approved this payout cannot also complete it")
			return
		}

		// deduction from held and add to paid
		_, err = tx.ExecContext(r.Context(), "UPDATE wlt_wallets SET held_balance_minor_units = held_balance_minor_units - $1, paid_total_minor_units = paid_total_minor_units + $1, updated_at = now() WHERE actor_id = $2 AND actor_type = $3", req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "wallet update failed")
			return
		}

		// Ledger: money leaves the beneficiary's wallet and moves out through
		// the provider-clearing account. This posts the completion as a
		// balanced ledger transaction atomically with the status flip -- see
		// internal/ledger.PostLedgerTransaction. It does not itself represent
		// an actual disbursement provider call (payout completion remains a
		// manual/operator-driven process, per current scope); it makes the
		// existing "just flip status" behavior ledger-honest and auditable.
		ledgerLines := []ledger.LedgerLine{
			{AccountType: "wallet", ActorType: req.BeneficiaryActorType, ActorID: req.BeneficiaryActorID, DebitCredit: "debit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
			{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: req.AmountMinorUnits, Currency: req.Currency},
		}
		if _, err := ledger.PostLedgerTransaction(r.Context(), tx, "payout_completed", "payout_request", payoutID, ledgerLines, ledger.Actor{ID: operatorID, Type: "operator"}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to post ledger transaction")
			return
		}

		q := "UPDATE wlt_payout_requests SET status = 'completed', completed_at = now(), completed_by_operator_id = NULLIF($2, ''), operator_id = NULLIF($2, '') WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID, operatorID)
		defer rows2.Close()
		rows2.Next()
		updated, _ := scanPayoutRequest(rows2)
		tx.Commit()

		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleFailPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		operatorID := operatorIDFromRequest(r)

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil {
				rows.Close()
			}
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "not found")
			return
		}
		req, _ := scanPayoutRequest(rows)
		rows.Close()

		if req.Status != "processing" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_STATUS", "cannot fail")
			return
		}

		// return held funds
		_, err = tx.ExecContext(r.Context(), "UPDATE wlt_wallets SET available_balance_minor_units = available_balance_minor_units + $1, held_balance_minor_units = held_balance_minor_units - $1, updated_at = now() WHERE actor_id = $2 AND actor_type = $3", req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "wallet update failed")
			return
		}

		q := "UPDATE wlt_payout_requests SET status = 'failed', failed_at = now(), failure_reason = 'failed by operator', failed_by_operator_id = NULLIF($2, ''), operator_id = NULLIF($2, '') WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID, operatorID)
		defer rows2.Close()
		rows2.Next()
		updated, _ := scanPayoutRequest(rows2)
		tx.Commit()

		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}
