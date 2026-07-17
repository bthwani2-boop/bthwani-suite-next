package payout

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

const payoutReadCols = `id, beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status,
	requested_at, approved_at, rejected_at, processed_at, completed_at, failed_at, failure_reason, operator_id,
	approved_by_operator_id, rejected_by_operator_id, processed_by_operator_id, completed_by_operator_id, failed_by_operator_id,
	provider_reference, provider_status, provider_processed_at, idempotency_key`

func scanPayoutRequestWithProof(rows *sql.Rows) (*PayoutRequest, error) {
	var payoutRequest PayoutRequest
	var approvedAt, rejectedAt, processedAt, completedAt, failedAt, providerProcessedAt sql.NullTime
	var failureReason, operatorID, idempotencyKey sql.NullString
	var approvedBy, rejectedBy, processedBy, completedBy, failedBy sql.NullString
	var providerReference, providerStatus sql.NullString

	err := rows.Scan(
		&payoutRequest.ID,
		&payoutRequest.BeneficiaryActorID,
		&payoutRequest.BeneficiaryActorType,
		&payoutRequest.AmountMinorUnits,
		&payoutRequest.Currency,
		&payoutRequest.Status,
		&payoutRequest.RequestedAt,
		&approvedAt,
		&rejectedAt,
		&processedAt,
		&completedAt,
		&failedAt,
		&failureReason,
		&operatorID,
		&approvedBy,
		&rejectedBy,
		&processedBy,
		&completedBy,
		&failedBy,
		&providerReference,
		&providerStatus,
		&providerProcessedAt,
		&idempotencyKey,
	)
	if err != nil {
		return nil, err
	}

	if approvedAt.Valid {
		payoutRequest.ApprovedAt = &approvedAt.Time
	}
	if rejectedAt.Valid {
		payoutRequest.RejectedAt = &rejectedAt.Time
	}
	if processedAt.Valid {
		payoutRequest.ProcessedAt = &processedAt.Time
	}
	if completedAt.Valid {
		payoutRequest.CompletedAt = &completedAt.Time
	}
	if failedAt.Valid {
		payoutRequest.FailedAt = &failedAt.Time
	}
	if providerProcessedAt.Valid {
		payoutRequest.ProviderProcessedAt = &providerProcessedAt.Time
	}
	payoutRequest.FailureReason = failureReason.String
	payoutRequest.OperatorID = operatorID.String
	payoutRequest.ApprovedByOperatorID = approvedBy.String
	payoutRequest.RejectedByOperatorID = rejectedBy.String
	payoutRequest.ProcessedByOperatorID = processedBy.String
	payoutRequest.CompletedByOperatorID = completedBy.String
	payoutRequest.FailedByOperatorID = failedBy.String
	payoutRequest.ProviderReference = providerReference.String
	payoutRequest.ProviderStatus = providerStatus.String
	payoutRequest.IdempotencyKey = idempotencyKey.String
	return &payoutRequest, nil
}

func HandleListPayoutRequestsWithProviderProof(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		beneficiaryActorID := strings.TrimSpace(r.URL.Query().Get("beneficiaryActorId"))
		beneficiaryActorType := strings.TrimSpace(r.URL.Query().Get("beneficiaryActorType"))
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		if (beneficiaryActorID == "") != (beneficiaryActorType == "") {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "beneficiaryActorId and beneficiaryActorType must be supplied together")
			return
		}

		query := "SELECT " + payoutReadCols + " FROM wlt_payout_requests"
		where := make([]string, 0, 2)
		args := make([]any, 0, 3)
		if beneficiaryActorID != "" {
			args = append(args, beneficiaryActorID, beneficiaryActorType)
			where = append(where, "beneficiary_actor_id = $1 AND beneficiary_actor_type = $2")
		}
		if status != "" {
			args = append(args, status)
			where = append(where, fmt.Sprintf("status = $%d", len(args)))
		}
		if len(where) > 0 {
			query += " WHERE " + strings.Join(where, " AND ")
		}
		query += " ORDER BY requested_at DESC, id DESC LIMIT 250"

		rows, err := db.QueryContext(r.Context(), query, args...)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query payout requests")
			return
		}
		defer rows.Close()

		requests := make([]*PayoutRequest, 0)
		for rows.Next() {
			payoutRequest, scanErr := scanPayoutRequestWithProof(rows)
			if scanErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout request")
				return
			}
			requests = append(requests, payoutRequest)
		}
		if err := rows.Err(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed while reading payout requests")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestListResponse{PayoutRequests: requests, Total: len(requests)})
	}
}

func HandleGetPayoutRequestWithProviderProof(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		if payoutID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
			return
		}
		rows, err := db.QueryContext(r.Context(), "SELECT "+payoutReadCols+" FROM wlt_payout_requests WHERE id = $1 LIMIT 1", payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query payout request")
			return
		}
		defer rows.Close()
		if !rows.Next() {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		payoutRequest, err := scanPayoutRequestWithProof(rows)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout request")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: payoutRequest})
	}
}
