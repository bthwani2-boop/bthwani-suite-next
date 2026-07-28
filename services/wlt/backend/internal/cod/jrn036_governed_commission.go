package cod

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

var (
	ErrGovernedCommissionPolicyMissing = errors.New("active WLT commission policy is required")
	ErrCommissionEvidenceRequired      = errors.New("verified source evidence is required")
	ErrCommissionIdempotencyConflict   = errors.New("idempotency key was already used with different commission inputs")
	ErrCommissionAdjustmentInvalid     = errors.New("commission adjustment is invalid")
	ErrCommissionWalletUnavailable     = errors.New("tenant commission wallet is unavailable")
)

type GovernedCommissionPolicy struct {
	PolicyID                string `json:"policyId"`
	Version                 int64  `json:"version"`
	CommissionType          string `json:"commissionType"`
	SourceType              string `json:"sourceType"`
	BeneficiaryActorType    string `json:"beneficiaryActorType"`
	CalculationType         string `json:"calculationType"`
	FixedAmountMinorUnits   int64  `json:"fixedAmountMinorUnits"`
	BasisPoints             int    `json:"basisPoints"`
	MinimumAmountMinorUnits int64  `json:"minimumAmountMinorUnits"`
	MaximumAmountMinorUnits *int64 `json:"maximumAmountMinorUnits"`
	Currency                string `json:"currency"`
	Status                  string `json:"status"`
	ChangeReason            string `json:"changeReason"`
	UpdatedByActorID        string `json:"updatedByActorId"`
}

type UpsertGovernedCommissionPolicyInput struct {
	PolicyID                string `json:"policyId"`
	CommissionType          string `json:"commissionType"`
	SourceType              string `json:"sourceType"`
	BeneficiaryActorType    string `json:"beneficiaryActorType"`
	CalculationType         string `json:"calculationType"`
	FixedAmountMinorUnits   int64  `json:"fixedAmountMinorUnits"`
	BasisPoints             int    `json:"basisPoints"`
	MinimumAmountMinorUnits int64  `json:"minimumAmountMinorUnits"`
	MaximumAmountMinorUnits *int64 `json:"maximumAmountMinorUnits"`
	Currency                string `json:"currency"`
	Status                  string `json:"status"`
	ChangeReason            string `json:"changeReason"`
	OperatorID              string `json:"operatorId"`
}

type CreateGovernedCommissionInput struct {
	BeneficiaryActorID   string  `json:"beneficiaryActorId"`
	BeneficiaryActorType string  `json:"beneficiaryActorType"`
	SourceType           string  `json:"sourceType"`
	SourceID             string  `json:"sourceId"`
	VisitID              *string `json:"visitId"`
	StoreID              *string `json:"storeId"`
	CommissionType       string  `json:"commissionType"`
	SourceEvidenceID     string  `json:"sourceEvidenceId"`
	SourceEvidenceHash   string  `json:"sourceEvidenceHash"`
	SourceEvidenceStatus string  `json:"sourceEvidenceStatus"`
	GrossBasisMinorUnits int64   `json:"grossBasisMinorUnits"`
	Currency             string  `json:"currency"`
	IdempotencyKey       string  `json:"idempotencyKey"`
}

type CommissionAdjustmentInput struct {
	DeltaMinorUnits int64  `json:"deltaMinorUnits"`
	Reason          string `json:"reason"`
	OperatorID      string `json:"operatorId"`
	IdempotencyKey  string `json:"idempotencyKey"`
}

func hashCommissionParts(parts ...string) string {
	h := sha256.New()
	for _, part := range parts {
		_, _ = h.Write([]byte(strings.TrimSpace(part)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func normalizeGovernedCommissionInput(input CreateGovernedCommissionInput) (CreateGovernedCommissionInput, error) {
	input.BeneficiaryActorID = strings.TrimSpace(input.BeneficiaryActorID)
	input.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(input.BeneficiaryActorType))
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.SourceID = strings.TrimSpace(input.SourceID)
	input.CommissionType = strings.TrimSpace(input.CommissionType)
	input.SourceEvidenceID = strings.TrimSpace(input.SourceEvidenceID)
	input.SourceEvidenceHash = strings.TrimSpace(input.SourceEvidenceHash)
	input.SourceEvidenceStatus = strings.ToLower(strings.TrimSpace(input.SourceEvidenceStatus))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)

	if input.BeneficiaryActorID == "" || input.SourceType == "" || input.SourceID == "" {
		return input, fmt.Errorf("beneficiaryActorId, sourceType and sourceId are required")
	}
	switch input.BeneficiaryActorType {
	case "partner", "captain", "field":
	default:
		return input, fmt.Errorf("beneficiaryActorType must be partner, captain or field")
	}
	if input.CommissionType == "" {
		if input.SourceType == "field_visit" {
			input.CommissionType = "field_visit_fee"
		} else {
			return input, fmt.Errorf("commissionType is required")
		}
	}

	if input.SourceType == "field_visit" {
		if input.SourceEvidenceID == "" {
			input.SourceEvidenceID = input.SourceID
		}
		if input.SourceEvidenceStatus == "" {
			input.SourceEvidenceStatus = "completed"
		}
		if input.SourceEvidenceHash == "" {
			input.SourceEvidenceHash = hashCommissionParts(
				"field_visit",
				input.SourceID,
				input.BeneficiaryActorID,
			)
		}
	}
	if input.SourceEvidenceID == "" || input.SourceEvidenceHash == "" {
		return input, ErrCommissionEvidenceRequired
	}
	switch input.SourceEvidenceStatus {
	case "completed", "delivered", "approved":
	default:
		return input, ErrCommissionEvidenceRequired
	}
	if input.GrossBasisMinorUnits < 0 {
		return input, fmt.Errorf("grossBasisMinorUnits cannot be negative")
	}
	return input, nil
}

func calculateGovernedCommissionAmount(policy GovernedCommissionPolicy, grossBasis int64) (int64, error) {
	var amount int64
	switch policy.CalculationType {
	case "fixed":
		amount = policy.FixedAmountMinorUnits
	case "basis_points":
		if grossBasis <= 0 || policy.BasisPoints <= 0 || policy.BasisPoints > 10000 {
			return 0, fmt.Errorf("positive gross basis and valid basis points are required")
		}
		amount = (grossBasis/10000)*int64(policy.BasisPoints) +
			((grossBasis%10000)*int64(policy.BasisPoints)+5000)/10000
	default:
		return 0, ErrUnsupportedCommissionCalculation
	}
	if amount < policy.MinimumAmountMinorUnits {
		amount = policy.MinimumAmountMinorUnits
	}
	if policy.MaximumAmountMinorUnits != nil && amount > *policy.MaximumAmountMinorUnits {
		amount = *policy.MaximumAmountMinorUnits
	}
	if amount <= 0 {
		return 0, fmt.Errorf("commission policy calculated a non-positive amount")
	}
	return amount, nil
}

func scanGovernedCommissionPolicy(row *sql.Row) (*GovernedCommissionPolicy, error) {
	var policy GovernedCommissionPolicy
	err := row.Scan(
		&policy.PolicyID,
		&policy.Version,
		&policy.CommissionType,
		&policy.SourceType,
		&policy.BeneficiaryActorType,
		&policy.CalculationType,
		&policy.FixedAmountMinorUnits,
		&policy.BasisPoints,
		&policy.MinimumAmountMinorUnits,
		&policy.MaximumAmountMinorUnits,
		&policy.Currency,
		&policy.Status,
		&policy.ChangeReason,
		&policy.UpdatedByActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &policy, err
}

func getActiveGovernedCommissionPolicyTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	commissionType string,
	sourceType string,
	actorType string,
) (*GovernedCommissionPolicy, error) {
	const query = `
		SELECT policy_id, version, commission_type, source_type, beneficiary_actor_type,
		       calculation_type, fixed_amount_minor_units, basis_points,
		       minimum_amount_minor_units, maximum_amount_minor_units,
		       currency, status, change_reason, updated_by_actor_id
		FROM wlt_jrn036_commission_policy_versions
		WHERE tenant_id = $1
		  AND commission_type = $2
		  AND source_type = $3
		  AND beneficiary_actor_type = $4
		  AND status = 'active'
		ORDER BY version DESC
		LIMIT 1`
	return scanGovernedCommissionPolicy(tx.QueryRowContext(ctx, query, tenantID, commissionType, sourceType, actorType))
}

// UpsertGovernedCommissionPolicy is retained as a compatibility adapter only.
// All writes converge on the tenant-local idempotent implementation.
func UpsertGovernedCommissionPolicy(
	ctx context.Context,
	db *sql.DB,
	input UpsertGovernedCommissionPolicyInput,
	correlationID string,
) (*GovernedCommissionPolicy, error) {
	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		return nil, fmt.Errorf("correlationId is required")
	}
	return UpsertGovernedCommissionPolicyIdempotent(
		ctx,
		db,
		input,
		correlationID,
		"compat-commission-policy:"+correlationID,
	)
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func getGovernedCommissionByIdempotencyKeyTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	idempotencyKey string,
) (*Commission, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+commissionCols+`
		FROM wlt_commissions WHERE tenant_id=$1 AND idempotency_key=$2`, tenantID, idempotencyKey)
	commission, err := scanCommission(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return commission, err
}

func getGovernedCommissionForUpdateTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	commissionID string,
) (*Commission, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+commissionCols+`
		FROM wlt_commissions WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, tenantID, commissionID)
	commission, err := scanCommission(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return commission, err
}

func ensureGovernedCommissionWalletTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	actorType string,
	actorID string,
	currency string,
) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_wallets (tenant_id, actor_id, actor_type, status, currency)
		VALUES ($1,$2,$3,'active',$4)
		ON CONFLICT (tenant_id, actor_type, actor_id)
		DO NOTHING`, tenantID, actorID, actorType, currency); err != nil {
		return err
	}
	var status, storedCurrency string
	if err := tx.QueryRowContext(ctx, `SELECT status,currency FROM wlt_wallets
		WHERE tenant_id=$1 AND actor_type=$2 AND actor_id=$3 FOR UPDATE`,
		tenantID, actorType, actorID).Scan(&status, &storedCurrency); err != nil {
		return err
	}
	if status != "active" || storedCurrency != currency {
		return ErrCommissionWalletUnavailable
	}
	return nil
}

func CreateGovernedCommission(
	ctx context.Context,
	db *sql.DB,
	input CreateGovernedCommissionInput,
	correlationID string,
) (*Commission, error) {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return nil, err
	}
	input, err = normalizeGovernedCommissionInput(input)
	if err != nil {
		return nil, err
	}
	correlationID = strings.TrimSpace(correlationID)
	if input.IdempotencyKey == "" || correlationID == "" {
		return nil, fmt.Errorf("idempotencyKey and correlationId are required")
	}

	requestHash := hashCommissionParts(
		tenantID,
		input.BeneficiaryActorID,
		input.BeneficiaryActorType,
		input.SourceType,
		input.SourceID,
		input.CommissionType,
		input.SourceEvidenceID,
		input.SourceEvidenceHash,
		fmt.Sprint(input.GrossBasisMinorUnits),
		input.Currency,
	)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	existing, err := getGovernedCommissionByIdempotencyKeyTx(ctx, tx, tenantID, input.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		var storedHash string
		hashErr := tx.QueryRowContext(ctx, `SELECT request_hash
			FROM wlt_jrn036_commission_evidence
			WHERE tenant_id=$1 AND commission_id=$2`, tenantID, existing.ID).Scan(&storedHash)
		if hashErr == nil && storedHash != requestHash {
			return nil, ErrCommissionIdempotencyConflict
		}
		if hashErr != nil && !errors.Is(hashErr, sql.ErrNoRows) {
			return nil, hashErr
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return existing, nil
	}

	policy, err := getActiveGovernedCommissionPolicyTx(
		ctx,
		tx,
		tenantID,
		input.CommissionType,
		input.SourceType,
		input.BeneficiaryActorType,
	)
	if err != nil {
		return nil, err
	}
	if policy == nil {
		return nil, ErrGovernedCommissionPolicyMissing
	}
	if input.Currency != "" && input.Currency != policy.Currency {
		return nil, fmt.Errorf("source currency does not match policy currency")
	}
	amount, err := calculateGovernedCommissionAmount(*policy, input.GrossBasisMinorUnits)
	if err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_commissions
		(tenant_id, beneficiary_actor_id, beneficiary_actor_type, source_type, source_id,
		 visit_id, store_id, commission_policy_id, commission_type,
		 amount_minor_units, currency, idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING `+commissionCols,
		tenantID,
		input.BeneficiaryActorID,
		input.BeneficiaryActorType,
		input.SourceType,
		input.SourceID,
		input.VisitID,
		input.StoreID,
		policy.PolicyID,
		input.CommissionType,
		amount,
		policy.Currency,
		input.IdempotencyKey,
	)
	commission, err := scanCommission(row)
	if err != nil {
		return nil, err
	}
	if err := ensureGovernedCommissionWalletTx(
		ctx,
		tx,
		tenantID,
		input.BeneficiaryActorType,
		input.BeneficiaryActorID,
		policy.Currency,
	); err != nil {
		return nil, err
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET pending_balance_minor_units = pending_balance_minor_units + $1,
		    earned_total_minor_units = earned_total_minor_units + $1,
		    last_ledger_entry_at = NOW(),
		    updated_at = NOW()
		WHERE tenant_id=$2 AND actor_type=$3 AND actor_id=$4 AND status='active'`,
		amount,
		tenantID,
		input.BeneficiaryActorType,
		input.BeneficiaryActorID,
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrCommissionWalletUnavailable
	}

	lines := []ledger.LedgerLine{
		{
			AccountType:      "platform_commission_receivable",
			DebitCredit:      "debit",
			AmountMinorUnits: amount,
			Currency:         policy.Currency,
		},
		{
			AccountType:      "wallet",
			ActorType:        input.BeneficiaryActorType,
			ActorID:          input.BeneficiaryActorID,
			DebitCredit:      "credit",
			AmountMinorUnits: amount,
			Currency:         policy.Currency,
		},
	}
	if _, err := ledger.PostLedgerTransaction(
		ctx,
		tx,
		"commission_earned",
		"commission",
		commission.ID,
		lines,
		ledger.Actor{ID: "wlt", Type: "service"},
	); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_commission_evidence
		(tenant_id, commission_id, policy_id, policy_version, source_evidence_id,
		 source_evidence_hash, source_evidence_status, gross_basis_minor_units,
		 calculated_amount_minor_units, idempotency_key, request_hash)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		tenantID,
		commission.ID,
		policy.PolicyID,
		policy.Version,
		input.SourceEvidenceID,
		input.SourceEvidenceHash,
		input.SourceEvidenceStatus,
		input.GrossBasisMinorUnits,
		amount,
		input.IdempotencyKey,
		requestHash,
	); err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"policyId":        policy.PolicyID,
		"policyVersion":   policy.Version,
		"amountMinorUnits": amount,
		"currency":        policy.Currency,
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_audit_events
		(tenant_id, aggregate_type, aggregate_id, action, actor_id, actor_type,
		 correlation_id, metadata)
		VALUES ($1,'commission',$2,'commission_calculated',$3,
		        'service',$4,$5::jsonb)`,
		tenantID,
		commission.ID,
		input.BeneficiaryActorID,
		correlationID,
		string(metadata),
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return commission, nil
}

func ApplyGovernedCommissionAdjustment(
	ctx context.Context,
	db *sql.DB,
	commissionID string,
	input CommissionAdjustmentInput,
	correlationID string,
) (*Commission, error) {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return nil, err
	}
	commissionID = strings.TrimSpace(commissionID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if commissionID == "" || input.DeltaMinorUnits == 0 || input.Reason == "" ||
		input.OperatorID == "" || input.IdempotencyKey == "" || correlationID == "" {
		return nil, ErrCommissionAdjustmentInvalid
	}
	requestHash := hashCommissionParts(
		tenantID,
		commissionID,
		fmt.Sprint(input.DeltaMinorUnits),
		input.Reason,
		input.OperatorID,
	)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	commission, err := getGovernedCommissionForUpdateTx(ctx, tx, tenantID, commissionID)
	if err != nil {
		return nil, err
	}
	if commission == nil {
		return nil, nil
	}
	if commission.Status != "pending" && commission.Status != "confirmed" {
		return nil, ErrCommissionNotInExpectedState
	}
	newAmount := commission.AmountMinorUnits + input.DeltaMinorUnits
	if newAmount <= 0 {
		return nil, ErrCommissionAdjustmentInvalid
	}

	var adjustmentID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO wlt_jrn036_commission_adjustments
		(tenant_id, commission_id, delta_minor_units, reason, operator_id,
		 idempotency_key, request_hash)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
		RETURNING id`,
		tenantID,
		commissionID,
		input.DeltaMinorUnits,
		input.Reason,
		input.OperatorID,
		input.IdempotencyKey,
		requestHash,
	).Scan(&adjustmentID)
	if errors.Is(err, sql.ErrNoRows) {
		var existingCommissionID string
		var existingHash string
		if err := tx.QueryRowContext(ctx, `
			SELECT commission_id, request_hash
			FROM wlt_jrn036_commission_adjustments
			WHERE tenant_id=$1 AND idempotency_key=$2`, tenantID, input.IdempotencyKey).Scan(
			&existingCommissionID,
			&existingHash,
		); err != nil {
			return nil, err
		}
		if existingCommissionID != commissionID || existingHash != requestHash {
			return nil, ErrCommissionIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return commission, nil
	}
	if err != nil {
		return nil, err
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET pending_balance_minor_units = pending_balance_minor_units + $1,
		    earned_total_minor_units = earned_total_minor_units + $1,
		    updated_at = NOW()
		WHERE tenant_id=$2
		  AND actor_type=$3
		  AND actor_id=$4
		  AND pending_balance_minor_units + $1 >= 0
		  AND earned_total_minor_units + $1 >= 0`,
		input.DeltaMinorUnits,
		tenantID,
		commission.BeneficiaryActorType,
		commission.BeneficiaryActorID,
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrCommissionAdjustmentInvalid
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE wlt_commissions
		SET amount_minor_units=$3,
		    resolution_note=$4,
		    updated_at=NOW()
		WHERE tenant_id=$1 AND id=$2`, tenantID, commissionID, newAmount, input.Reason); err != nil {
		return nil, err
	}

	absoluteAmount := input.DeltaMinorUnits
	eventType := "commission_adjusted_up"
	lines := []ledger.LedgerLine{
		{
			AccountType:      "platform_commission_receivable",
			DebitCredit:      "debit",
			AmountMinorUnits: absoluteAmount,
			Currency:         commission.Currency,
		},
		{
			AccountType:      "wallet",
			ActorType:        commission.BeneficiaryActorType,
			ActorID:          commission.BeneficiaryActorID,
			DebitCredit:      "credit",
			AmountMinorUnits: absoluteAmount,
			Currency:         commission.Currency,
		},
	}
	if absoluteAmount < 0 {
		absoluteAmount = -absoluteAmount
		eventType = "commission_adjusted_down"
		lines = []ledger.LedgerLine{
			{
				AccountType:      "wallet",
				ActorType:        commission.BeneficiaryActorType,
				ActorID:          commission.BeneficiaryActorID,
				DebitCredit:      "debit",
				AmountMinorUnits: absoluteAmount,
				Currency:         commission.Currency,
			},
			{
				AccountType:      "platform_commission_receivable",
				DebitCredit:      "credit",
				AmountMinorUnits: absoluteAmount,
				Currency:         commission.Currency,
			},
		}
	}
	if _, err := ledger.PostLedgerTransaction(
		ctx,
		tx,
		eventType,
		"commission_adjustment",
		adjustmentID,
		lines,
		ledger.Actor{ID: input.OperatorID, Type: "operator"},
	); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_audit_events
		(tenant_id, aggregate_type, aggregate_id, action, actor_id, actor_type,
		 reason, correlation_id, metadata)
		VALUES ($1,'commission_adjustment',$2,$3,$4,'operator',$5,$6,
		        jsonb_build_object(
		          'commissionId',$7,
		          'deltaMinorUnits',$8,
		          'resultAmountMinorUnits',$9))`,
		tenantID,
		adjustmentID,
		eventType,
		input.OperatorID,
		input.Reason,
		correlationID,
		commissionID,
		input.DeltaMinorUnits,
		newAmount,
	); err != nil {
		return nil, err
	}

	updated, err := getGovernedCommissionForUpdateTx(ctx, tx, tenantID, commissionID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func HandleCreateGovernedCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateGovernedCommissionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(
				w,
				http.StatusBadRequest,
				"INVALID_REQUEST",
				"request body is invalid or contains caller-supplied financial fields",
			)
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		}
		commission, err := CreateGovernedCommission(
			r.Context(),
			db,
			input,
			r.Header.Get("X-Correlation-ID"),
		)
		switch {
		case errors.Is(err, ErrGovernedCommissionPolicyMissing):
			shared.SendError(w, http.StatusConflict, "COMMISSION_POLICY_MISSING", err.Error())
			return
		case errors.Is(err, ErrCommissionEvidenceRequired):
			shared.SendError(w, http.StatusConflict, "COMMISSION_EVIDENCE_REQUIRED", err.Error())
			return
		case errors.Is(err, ErrCommissionIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case errors.Is(err, ErrCommissionWalletUnavailable):
			shared.SendError(w, http.StatusConflict, "COMMISSION_WALLET_UNAVAILABLE", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"commission": commission})
	}
}

func HandleUpsertGovernedCommissionPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertGovernedCommissionPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertGovernedCommissionPolicy(
			r.Context(),
			db,
			input,
			r.Header.Get("X-Correlation-ID"),
		)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"commissionPolicy": policy})
	}
}

func HandleAdjustGovernedCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CommissionAdjustmentInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		}
		commission, err := ApplyGovernedCommissionAdjustment(
			r.Context(),
			db,
			r.PathValue("commissionId"),
			input,
			r.Header.Get("X-Correlation-ID"),
		)
		switch {
		case errors.Is(err, ErrCommissionIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case errors.Is(err, ErrCommissionNotInExpectedState):
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
			return
		case errors.Is(err, ErrCommissionAdjustmentInvalid):
			shared.SendError(w, http.StatusUnprocessableEntity, "INVALID_ADJUSTMENT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if commission == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "commission not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"commission": commission})
	}
}
