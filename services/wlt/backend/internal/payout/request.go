package payout

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// payloadHash computes a stable hash over the fields that define a payout
// request's financial intent, so a reused Idempotency-Key with a different
// payload can be detected instead of silently returning the earlier request.
func payloadHash(beneficiaryActorID, beneficiaryActorType string, amountMinorUnits int64, currency string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%d|%s", beneficiaryActorID, beneficiaryActorType, amountMinorUnits, currency)))
	return hex.EncodeToString(sum[:])
}

const requestCols = `id, beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status,
	requested_at, approved_at, rejected_at, processed_at, completed_at, failed_at, failure_reason, operator_id, idempotency_key`

func scanPayoutRequest(rows *sql.Rows) (*PayoutRequest, error) {
	var p PayoutRequest
	var approvedAt, rejectedAt, processedAt, completedAt, failedAt sql.NullTime
	var failureReason, operatorID, idempotencyKey sql.NullString

	err := rows.Scan(
		&p.ID, &p.BeneficiaryActorID, &p.BeneficiaryActorType, &p.AmountMinorUnits, &p.Currency, &p.Status,
		&p.RequestedAt, &approvedAt, &rejectedAt, &processedAt, &completedAt, &failedAt,
		&failureReason, &operatorID, &idempotencyKey,
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

func changePayoutStatus(db *sql.DB, w http.ResponseWriter, r *http.Request, fromStatus string, toStatus string, actionCol string) {
	payoutID := r.PathValue("payoutId")
	
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
	q := fmt.Sprintf("UPDATE wlt_payout_requests SET status = $1, %s = now() WHERE id = $2 RETURNING "+requestCols, actionCol)
	rows2, err := tx.QueryContext(r.Context(), q, toStatus, payoutID)
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
		changePayoutStatus(db, w, r, "pending", "approved", "approved_at")
	}
}

func HandleRejectPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil { rows.Close() }
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

		q := "UPDATE wlt_payout_requests SET status = 'rejected', rejected_at = now() WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID)
		defer rows2.Close()
		rows2.Next()
		updated, _ := scanPayoutRequest(rows2)
		tx.Commit()

		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

func HandleProcessPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		changePayoutStatus(db, w, r, "approved", "processing", "processed_at")
	}
}

func HandleCompletePayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := r.PathValue("payoutId")
		
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil { rows.Close() }
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "not found")
			return
		}
		req, _ := scanPayoutRequest(rows)
		rows.Close()

		if req.Status != "processing" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_STATUS", "cannot complete")
			return
		}

		// deduction from held and add to paid
		_, err = tx.ExecContext(r.Context(), "UPDATE wlt_wallets SET held_balance_minor_units = held_balance_minor_units - $1, paid_total_minor_units = paid_total_minor_units + $1, updated_at = now() WHERE actor_id = $2 AND actor_type = $3", req.AmountMinorUnits, req.BeneficiaryActorID, req.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "wallet update failed")
			return
		}

		q := "UPDATE wlt_payout_requests SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID)
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
		
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start tx")
			return
		}
		defer tx.Rollback()

		rows, err := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 FOR UPDATE", payoutID)
		if err != nil || !rows.Next() {
			if rows != nil { rows.Close() }
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

		q := "UPDATE wlt_payout_requests SET status = 'failed', failed_at = now(), failure_reason = 'failed by operator' WHERE id = $1 RETURNING " + requestCols
		rows2, _ := tx.QueryContext(r.Context(), q, payoutID)
		defer rows2.Close()
		rows2.Next()
		updated, _ := scanPayoutRequest(rows2)
		tx.Commit()

		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}
