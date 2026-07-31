package settlement

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

func UpsertGovernedSettlementPolicyIdempotent(
	ctx context.Context,
	db *sql.DB,
	partnerID string,
	input UpsertGovernedSettlementPolicyInput,
	correlationID string,
	idempotencyKey string,
) (*GovernedSettlementPolicy, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	partnerID = strings.TrimSpace(partnerID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)

	if partnerID == "" || input.OperatorID == "" || input.ChangeReason == "" ||
		correlationID == "" || idempotencyKey == "" || input.FeeBasisPoints < 0 ||
		input.FeeBasisPoints > 10000 || input.MinimumNetMinorUnits < 0 {
		return nil, fmt.Errorf(
			"valid partnerId, feeBasisPoints, changeReason, operatorId, correlationId, idempotencyKey and minimum are required",
		)
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.Status != "active" && input.Status != "inactive" {
		return nil, fmt.Errorf("status must be active or inactive")
	}
	if input.CycleDays == 0 {
		input.CycleDays = 7
	}
	if input.CycleDays < 1 || input.CycleDays > 366 {
		return nil, fmt.Errorf("cycleDays must be between 1 and 366")
	}

	requestHash := hashSettlementParts(
		operatorContextID,
		"settlement_policy",
		partnerID,
		fmt.Sprint(input.FeeBasisPoints),
		input.Currency,
		input.Status,
		fmt.Sprint(input.CycleDays),
		fmt.Sprint(input.MinimumNetMinorUnits),
		input.ChangeReason,
		input.OperatorID,
	)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	receipt, exists, err := shared.LoadMutationReceiptTx(
		ctx,
		tx,
		idempotencyKey,
		requestHash,
	)
	if err != nil {
		return nil, err
	}
	if exists {
		var policy GovernedSettlementPolicy
		if err := json.Unmarshal(receipt, &policy); err != nil {
			return nil, fmt.Errorf("decode settlement policy idempotency receipt: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &policy, nil
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_settlement_policies
		(operator_context_id, partner_id, fee_basis_points, currency, status, updated_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (operator_context_id, partner_id) DO UPDATE SET
		  fee_basis_points = EXCLUDED.fee_basis_points,
		  currency = EXCLUDED.currency,
		  status = EXCLUDED.status,
		  updated_by_operator_id = EXCLUDED.updated_by_operator_id,
		  updated_at = NOW()`,
		operatorContextID,
		partnerID,
		input.FeeBasisPoints,
		input.Currency,
		input.Status,
		input.OperatorID,
	); err != nil {
		return nil, err
	}

	var version int64
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) + 1
		FROM wlt_settlement_policy_versions
		WHERE operator_context_id = $1 AND partner_id = $2`, operatorContextID, partnerID).Scan(&version); err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_settlement_policy_versions
		(operator_context_id, partner_id, version, fee_basis_points, currency, status, cycle_days,
		 minimum_net_minor_units, change_reason, updated_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING partner_id, version, fee_basis_points, currency, status,
		          cycle_days, minimum_net_minor_units, change_reason,
		          updated_by_operator_id`,
		operatorContextID,
		partnerID,
		version,
		input.FeeBasisPoints,
		input.Currency,
		input.Status,
		input.CycleDays,
		input.MinimumNetMinorUnits,
		input.ChangeReason,
		input.OperatorID,
	)
	policy, err := scanGovernedSettlementPolicy(row)
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_finance_audit_events
		(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, reason,
		 correlation_id, metadata)
		VALUES ($1, 'settlement_policy', $2, 'policy_version_created', $3,
		        'operator', $4, $5,
		        jsonb_build_object(
		          'version', $6::bigint,
		          'feeBasisPoints', $7::integer,
		          'status', $8::text))`,
		operatorContextID,
		partnerID,
		input.OperatorID,
		input.ChangeReason,
		correlationID,
		version,
		input.FeeBasisPoints,
		input.Status,
	); err != nil {
		return nil, err
	}

	if err := shared.StoreMutationReceiptTx(
		ctx,
		tx,
		idempotencyKey,
		requestHash,
		"settlement_policy_upsert",
		partnerID,
		policy,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return policy, nil
}

func HandleUpsertGovernedSettlementPolicyIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertGovernedSettlementPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertGovernedSettlementPolicyIdempotent(
			r.Context(),
			db,
			r.PathValue("partnerId"),
			input,
			r.Header.Get("X-Correlation-ID"),
			r.Header.Get("Idempotency-Key"),
		)
		switch {
		case errors.Is(err, shared.ErrMutationIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlementPolicy": policy})
	}
}
