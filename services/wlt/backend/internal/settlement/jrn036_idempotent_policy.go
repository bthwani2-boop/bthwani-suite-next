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
	defer tx.Rollback()

	receipt, exists, err := shared.LoadJrn036MutationReceiptTx(
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
		(partner_id, fee_basis_points, currency, status, updated_by_operator_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (partner_id) DO UPDATE SET
		  fee_basis_points = EXCLUDED.fee_basis_points,
		  currency = EXCLUDED.currency,
		  status = EXCLUDED.status,
		  updated_by_operator_id = EXCLUDED.updated_by_operator_id,
		  updated_at = NOW()`,
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
		FROM wlt_jrn036_settlement_policy_versions
		WHERE partner_id = $1`, partnerID).Scan(&version); err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_jrn036_settlement_policy_versions
		(partner_id, version, fee_basis_points, currency, status, cycle_days,
		 minimum_net_minor_units, change_reason, updated_by_operator_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING partner_id, version, fee_basis_points, currency, status,
		          cycle_days, minimum_net_minor_units, change_reason,
		          updated_by_operator_id`,
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
		INSERT INTO wlt_jrn036_audit_events
		(aggregate_type, aggregate_id, action, actor_id, actor_type, reason,
		 correlation_id, metadata)
		VALUES ('settlement_policy', $1, 'policy_version_created', $2,
		        'operator', $3, $4,
		        jsonb_build_object(
		          'version', $5,
		          'feeBasisPoints', $6,
		          'status', $7))`,
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

	if err := shared.StoreJrn036MutationReceiptTx(
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
		case errors.Is(err, shared.ErrJrn036MutationIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"settlementPolicy": policy})
	}
}
