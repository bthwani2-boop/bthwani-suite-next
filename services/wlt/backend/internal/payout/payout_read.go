package payout

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// payoutReadCols projects the governed manual-settlement lifecycle: who
// approved, who executed the external transfer, who independently verified it
// and who completed it. Every one of those is a distinct operator by policy.
const payoutReadCols = `id, beneficiary_actor_id, beneficiary_actor_type, payout_destination_id,
	amount_minor_units, currency, status, reconciliation_status,
	requested_at, approved_at, rejected_at, executed_at, verified_at, completed_at, failed_at,
	failure_reason, operator_id,
	approved_by_operator_id, rejected_by_operator_id, executed_by_operator_id,
	verified_by_operator_id, completed_by_operator_id, failed_by_operator_id,
	idempotency_key`

const payoutListQuery = `SELECT ` + payoutReadCols + `
FROM wlt_payout_requests
WHERE operator_context_id = $1
  AND (NOT $2::boolean OR (beneficiary_actor_id = $3 AND beneficiary_actor_type = $4))
  AND (NOT $5::boolean OR status = $6)
ORDER BY requested_at DESC, id DESC
LIMIT 250`

func scanPayoutRequestRow(rows *sql.Rows) (*PayoutRequest, error) {
	var payoutRequest PayoutRequest
	var approvedAt, rejectedAt, executedAt, verifiedAt, completedAt, failedAt sql.NullTime
	var destinationID, reconciliationStatus, failureReason, operatorID, idempotencyKey sql.NullString
	var approvedBy, rejectedBy, executedBy, verifiedBy, completedBy, failedBy sql.NullString

	err := rows.Scan(
		&payoutRequest.ID,
		&payoutRequest.BeneficiaryActorID,
		&payoutRequest.BeneficiaryActorType,
		&destinationID,
		&payoutRequest.AmountMinorUnits,
		&payoutRequest.Currency,
		&payoutRequest.Status,
		&reconciliationStatus,
		&payoutRequest.RequestedAt,
		&approvedAt,
		&rejectedAt,
		&executedAt,
		&verifiedAt,
		&completedAt,
		&failedAt,
		&failureReason,
		&operatorID,
		&approvedBy,
		&rejectedBy,
		&executedBy,
		&verifiedBy,
		&completedBy,
		&failedBy,
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
	if executedAt.Valid {
		payoutRequest.ExecutedAt = &executedAt.Time
	}
	if verifiedAt.Valid {
		payoutRequest.VerifiedAt = &verifiedAt.Time
	}
	if completedAt.Valid {
		payoutRequest.CompletedAt = &completedAt.Time
	}
	if failedAt.Valid {
		payoutRequest.FailedAt = &failedAt.Time
	}
	payoutRequest.PayoutDestinationID = destinationID.String
	payoutRequest.ReconciliationStatus = reconciliationStatus.String
	payoutRequest.FailureReason = failureReason.String
	payoutRequest.OperatorID = operatorID.String
	payoutRequest.ApprovedByOperatorID = approvedBy.String
	payoutRequest.RejectedByOperatorID = rejectedBy.String
	payoutRequest.ExecutedByOperatorID = executedBy.String
	payoutRequest.VerifiedByOperatorID = verifiedBy.String
	payoutRequest.CompletedByOperatorID = completedBy.String
	payoutRequest.FailedByOperatorID = failedBy.String
	payoutRequest.IdempotencyKey = idempotencyKey.String
	return &payoutRequest, nil
}

func HandleListPayoutRequests(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", err.Error())
			return
		}
		beneficiaryActorID := strings.TrimSpace(r.URL.Query().Get("beneficiaryActorId"))
		beneficiaryActorType := strings.TrimSpace(r.URL.Query().Get("beneficiaryActorType"))
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		if (beneficiaryActorID == "") != (beneficiaryActorType == "") {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "beneficiaryActorId and beneficiaryActorType must be supplied together")
			return
		}
		if beneficiaryActorType != "" {
			if _, ok := governedPayoutActorTypes[strings.ToLower(beneficiaryActorType)]; !ok {
				shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported beneficiaryActorType")
				return
			}
		}

		rows, err := db.QueryContext(
			r.Context(),
			payoutListQuery,
			operatorContextID,
			beneficiaryActorID != "",
			beneficiaryActorID,
			strings.ToLower(beneficiaryActorType),
			status != "",
			status,
		)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query payout requests")
			return
		}
		defer rows.Close()

		requests := make([]*PayoutRequest, 0)
		for rows.Next() {
			payoutRequest, scanErr := scanPayoutRequestRow(rows)
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

func HandleGetPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", err.Error())
			return
		}
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		if payoutID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
			return
		}
		rows, err := db.QueryContext(r.Context(), "SELECT "+payoutReadCols+" FROM wlt_payout_requests WHERE operator_context_id=$1 AND id=$2 LIMIT 1", operatorContextID, payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to query payout request")
			return
		}
		defer rows.Close()
		if !rows.Next() {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		payoutRequest, err := scanPayoutRequestRow(rows)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout request")
			return
		}
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: payoutRequest})
	}
}
