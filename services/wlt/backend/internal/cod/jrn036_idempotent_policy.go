package cod

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

func UpsertGovernedCommissionPolicyIdempotent(
	ctx context.Context,
	db *sql.DB,
	input UpsertGovernedCommissionPolicyInput,
	correlationID string,
	idempotencyKey string,
) (*GovernedCommissionPolicy, error) {
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.CommissionType = strings.TrimSpace(input.CommissionType)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(input.BeneficiaryActorType))
	input.CalculationType = strings.ToLower(strings.TrimSpace(input.CalculationType))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)

	if input.PolicyID == "" || input.CommissionType == "" || input.SourceType == "" ||
		input.ChangeReason == "" || input.OperatorID == "" || correlationID == "" ||
		idempotencyKey == "" {
		return nil, fmt.Errorf(
			"policyId, commissionType, sourceType, changeReason, operatorId, correlationId and idempotencyKey are required",
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
	switch input.BeneficiaryActorType {
	case "partner", "captain", "field":
	default:
		return nil, fmt.Errorf("unsupported beneficiaryActorType")
	}
	if input.MinimumAmountMinorUnits < 0 {
		return nil, fmt.Errorf("minimumAmountMinorUnits cannot be negative")
	}
	if input.MaximumAmountMinorUnits != nil &&
		*input.MaximumAmountMinorUnits < input.MinimumAmountMinorUnits {
		return nil, fmt.Errorf("maximumAmountMinorUnits cannot be below minimumAmountMinorUnits")
	}

	candidate := GovernedCommissionPolicy{
		PolicyID:                input.PolicyID,
		CommissionType:          input.CommissionType,
		SourceType:              input.SourceType,
		BeneficiaryActorType:    input.BeneficiaryActorType,
		CalculationType:         input.CalculationType,
		FixedAmountMinorUnits:   input.FixedAmountMinorUnits,
		BasisPoints:             input.BasisPoints,
		MinimumAmountMinorUnits: input.MinimumAmountMinorUnits,
		MaximumAmountMinorUnits: input.MaximumAmountMinorUnits,
		Currency:                input.Currency,
		Status:                  input.Status,
		ChangeReason:            input.ChangeReason,
		UpdatedByActorID:        input.OperatorID,
	}
	switch input.CalculationType {
	case "fixed":
		if _, err := calculateGovernedCommissionAmount(
			candidate,
			maxInt64(1, input.MinimumAmountMinorUnits),
		); err != nil {
			return nil, err
		}
	case "basis_points":
		if input.BasisPoints <= 0 || input.BasisPoints > 10000 {
			return nil, fmt.Errorf("basisPoints must be between 1 and 10000")
		}
	default:
		return nil, ErrUnsupportedCommissionCalculation
	}

	maximum := ""
	if input.MaximumAmountMinorUnits != nil {
		maximum = fmt.Sprint(*input.MaximumAmountMinorUnits)
	}
	requestHash := hashCommissionParts(
		"commission_policy",
		input.PolicyID,
		input.CommissionType,
		input.SourceType,
		input.BeneficiaryActorType,
		input.CalculationType,
		fmt.Sprint(input.FixedAmountMinorUnits),
		fmt.Sprint(input.BasisPoints),
		fmt.Sprint(input.MinimumAmountMinorUnits),
		maximum,
		input.Currency,
		input.Status,
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
		var policy GovernedCommissionPolicy
		if err := json.Unmarshal(receipt, &policy); err != nil {
			return nil, fmt.Errorf("decode commission policy idempotency receipt: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &policy, nil
	}

	if input.Status == "active" {
		if _, err := tx.ExecContext(ctx, `
			UPDATE wlt_jrn036_commission_policy_versions
			SET status = 'inactive'
			WHERE commission_type = $1
			  AND source_type = $2
			  AND beneficiary_actor_type = $3
			  AND status = 'active'`,
			input.CommissionType,
			input.SourceType,
			input.BeneficiaryActorType,
		); err != nil {
			return nil, err
		}
	}

	var version int64
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) + 1
		FROM wlt_jrn036_commission_policy_versions
		WHERE policy_id = $1`, input.PolicyID).Scan(&version); err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_jrn036_commission_policy_versions
		(policy_id, version, commission_type, source_type, beneficiary_actor_type,
		 calculation_type, fixed_amount_minor_units, basis_points,
		 minimum_amount_minor_units, maximum_amount_minor_units,
		 currency, status, change_reason, updated_by_actor_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING policy_id, version, commission_type, source_type, beneficiary_actor_type,
		          calculation_type, fixed_amount_minor_units, basis_points,
		          minimum_amount_minor_units, maximum_amount_minor_units,
		          currency, status, change_reason, updated_by_actor_id`,
		input.PolicyID,
		version,
		input.CommissionType,
		input.SourceType,
		input.BeneficiaryActorType,
		input.CalculationType,
		input.FixedAmountMinorUnits,
		input.BasisPoints,
		input.MinimumAmountMinorUnits,
		input.MaximumAmountMinorUnits,
		input.Currency,
		input.Status,
		input.ChangeReason,
		input.OperatorID,
	)
	policy, err := scanGovernedCommissionPolicy(row)
	if err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"version": version,
		"status":  input.Status,
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_audit_events
		(aggregate_type, aggregate_id, action, actor_id, actor_type,
		 reason, correlation_id, metadata)
		VALUES ('commission_policy', $1, 'policy_version_created', $2,
		        'operator', $3, $4, $5::jsonb)`,
		input.PolicyID,
		input.OperatorID,
		input.ChangeReason,
		correlationID,
		string(metadata),
	); err != nil {
		return nil, err
	}
	if err := shared.StoreJrn036MutationReceiptTx(
		ctx,
		tx,
		idempotencyKey,
		requestHash,
		"commission_policy_upsert",
		input.PolicyID,
		policy,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return policy, nil
}

func HandleUpsertGovernedCommissionPolicyIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertGovernedCommissionPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertGovernedCommissionPolicyIdempotent(
			r.Context(),
			db,
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
		shared.SendJSON(w, http.StatusOK, map[string]any{"commissionPolicy": policy})
	}
}
