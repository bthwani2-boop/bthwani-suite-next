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
	"wlt-api/internal/wallet"
)

var (
	ErrGovernedCommissionPolicyMissing = errors.New("active WLT commission policy is required")
	ErrCommissionEvidenceRequired      = errors.New("verified source evidence is required")
	ErrCommissionIdempotencyConflict   = errors.New("idempotency key was already used with different commission inputs")
	ErrCommissionAdjustmentInvalid     = errors.New("commission adjustment is invalid")
)

type GovernedCommissionPolicy struct {
	PolicyID                  string `json:"policyId"`
	Version                   int64  `json:"version"`
	CommissionType            string `json:"commissionType"`
	SourceType                string `json:"sourceType"`
	BeneficiaryActorType      string `json:"beneficiaryActorType"`
	CalculationType           string `json:"calculationType"`
	FixedAmountMinorUnits     int64  `json:"fixedAmountMinorUnits"`
	BasisPoints               int    `json:"basisPoints"`
	MinimumAmountMinorUnits   int64  `json:"minimumAmountMinorUnits"`
	MaximumAmountMinorUnits   *int64 `json:"maximumAmountMinorUnits"`
	Currency                  string `json:"currency"`
	Status                    string `json:"status"`
	ChangeReason              string `json:"changeReason"`
	UpdatedByActorID          string `json:"updatedByActorId"`
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
	input.Currency = strings.TrimSpace(input.Currency)
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
	// Backward-compatible evidence derivation for the durable field-visit
	// outbox. It carries no amount and its visit/source identity is immutable.
	if input.SourceType == "field_visit" {
		if input.SourceEvidenceID == "" {
			input.SourceEvidenceID = input.SourceID
		}
		if input.SourceEvidenceStatus == "" {
			input.SourceEvidenceStatus = "completed"
		}
		if input.SourceEvidenceHash == "" {
			input.SourceEvidenceHash = hashCommissionParts("field_visit", input.SourceID, input.BeneficiaryActorID)
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
		amount = (grossBasis/10000)*int64(policy.BasisPoints) + ((grossBasis%10000)*int64(policy.BasisPoints)+5000)/10000
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
		&policy.PolicyID, &policy.Version, &policy.CommissionType, &policy.SourceType,
		&policy.BeneficiaryActorType, &policy.CalculationType,
		&policy.FixedAmountMinorUnits, &policy.BasisPoints,
		&policy.MinimumAmountMinorUnits, &policy.MaximumAmountMinorUnits,
		&policy.Currency, &policy.Status, &policy.ChangeReason, &policy.UpdatedByActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &policy, err
}

func getActiveGovernedCommissionPolicyTx(tx *sql.Tx, commissionType, sourceType, actorType string) (*GovernedCommissionPolicy, error) {
	const q = `
		SELECT policy_id, version, commission_type, source_type, beneficiary_actor_type,
		       calculation_type, fixed_amount_minor_units, basis_points,
		       minimum_amount_minor_units, maximum_amount_minor_units,
		       currency, status, change_reason, updated_by_actor_id
		FROM wlt_jrn036_commission_policy_versions
		WHERE commission_type=$1 AND source_type=$2 AND beneficiary_actor_type=$3 AND status='active'
		ORDER BY version DESC LIMIT 1`
	return scanGovernedCommissionPolicy(tx.QueryRow(q, commissionType, sourceType, actorType))
}

func UpsertGovernedCommissionPolicy(ctx context.Context, db *sql.DB, input UpsertGovernedCommissionPolicyInput, correlationID string) (*GovernedCommissionPolicy, error) {
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.CommissionType = strings.TrimSpace(input.CommissionType)
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(input.BeneficiaryActorType))
	input.CalculationType = strings.ToLower(strings.TrimSpace(input.CalculationType))
	input.Currency = strings.TrimSpace(input.Currency)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	correlationID = strings.TrimSpace(correlationID)
	if input.PolicyID == "" || input.CommissionType == "" || input.SourceType == "" || input.ChangeReason == "" || input.OperatorID == "" || correlationID == "" {
		return nil, fmt.Errorf("policyId, commissionType, sourceType, changeReason, operatorId and correlationId are required")
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
	if input.BeneficiaryActorType != "partner" && input.BeneficiaryActorType != "captain" && input.BeneficiaryActorType != "field" {
		return nil, fmt.Errorf("unsupported beneficiaryActorType")
	}
	candidate := GovernedCommissionPolicy{
		PolicyID: input.PolicyID, CommissionType: input.CommissionType, SourceType: input.SourceType,
		BeneficiaryActorType: input.BeneficiaryActorType, CalculationType: input.CalculationType,
		FixedAmountMinorUnits: input.FixedAmountMinorUnits, BasisPoints: input.BasisPoints,
		MinimumAmountMinorUnits: input.MinimumAmountMinorUnits, MaximumAmountMinorUnits: input.MaximumAmountMinorUnits,
		Currency: input.Currency, Status: input.Status, ChangeReason: input.ChangeReason, UpdatedByActorID: input.OperatorID,
	}
	if _, err := calculateGovernedCommissionAmount(candidate, maxInt64(1, input.MinimumAmountMinorUnits)); err != nil && input.CalculationType == "fixed" {
		return nil, err
	}
	if input.CalculationType == "basis_points" && (input.BasisPoints <= 0 || input.BasisPoints > 10000) {
		return nil, fmt.Errorf("basisPoints must be between 1 and 10000")
	}
	if input.MaximumAmountMinorUnits != nil && *input.MaximumAmountMinorUnits < input.MinimumAmountMinorUnits {
		return nil, fmt.Errorf("maximumAmountMinorUnits cannot be below minimumAmountMinorUnits")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()
	if input.Status == "active" {
		if _, err := tx.ExecContext(ctx, `UPDATE wlt_jrn036_commission_policy_versions SET status='inactive' WHERE commission_type=$1 AND source_type=$2 AND beneficiary_actor_type=$3 AND status='active'`, input.CommissionType, input.SourceType, input.BeneficiaryActorType); err != nil { return nil, err }
	}
	var version int64
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(version),0)+1 FROM wlt_jrn036_commission_policy_versions WHERE policy_id=$1`, input.PolicyID).Scan(&version); err != nil { return nil, err }
	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_jrn036_commission_policy_versions
		(policy_id,version,commission_type,source_type,beneficiary_actor_type,calculation_type,
		 fixed_amount_minor_units,basis_points,minimum_amount_minor_units,maximum_amount_minor_units,
		 currency,status,change_reason,updated_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING policy_id,version,commission_type,source_type,beneficiary_actor_type,calculation_type,
		 fixed_amount_minor_units,basis_points,minimum_amount_minor_units,maximum_amount_minor_units,
		 currency,status,change_reason,updated_by_actor_id`, input.PolicyID, version, input.CommissionType, input.SourceType,
		input.BeneficiaryActorType, input.CalculationType, input.FixedAmountMinorUnits, input.BasisPoints,
		input.MinimumAmountMinorUnits, input.MaximumAmountMinorUnits, input.Currency, input.Status,
		input.ChangeReason, input.OperatorID)
	policy, err := scanGovernedCommissionPolicy(row)
	if err != nil { return nil, err }
	metadata, _ := json.Marshal(map[string]any{"version": version, "status": input.Status})
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_jrn036_audit_events (aggregate_type,aggregate_id,action,actor_id,actor_type,reason,correlation_id,metadata) VALUES ('commission_policy',$1,'policy_version_created',$2,'operator',$3,$4,$5::jsonb)`, input.PolicyID, input.OperatorID, input.ChangeReason, correlationID, string(metadata)); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return policy, nil
}

func maxInt64(a, b int64) int64 { if a > b { return a }; return b }

func CreateGovernedCommission(ctx context.Context, db *sql.DB, input CreateGovernedCommissionInput, correlationID string) (*Commission, error) {
	var err error
	input, err = normalizeGovernedCommissionInput(input)
	if err != nil { return nil, err }
	correlationID = strings.TrimSpace(correlationID)
	if input.IdempotencyKey == "" || correlationID == "" { return nil, fmt.Errorf("idempotencyKey and correlationId are required") }
	requestHash := hashCommissionParts(input.BeneficiaryActorID, input.BeneficiaryActorType, input.SourceType, input.SourceID, input.CommissionType, input.SourceEvidenceID, input.SourceEvidenceHash, fmt.Sprint(input.GrossBasisMinorUnits), input.Currency)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()
	if existing, err := getCommissionByIdempotencyKeyTx(tx, input.IdempotencyKey); err != nil { return nil, err } else if existing != nil {
		var storedHash string
		hashErr := tx.QueryRowContext(ctx, `SELECT request_hash FROM wlt_jrn036_commission_evidence WHERE commission_id=$1`, existing.ID).Scan(&storedHash)
		if hashErr == nil && storedHash != requestHash { return nil, ErrCommissionIdempotencyConflict }
		if hashErr != nil && !errors.Is(hashErr, sql.ErrNoRows) { return nil, hashErr }
		if err := tx.Commit(); err != nil { return nil, err }
		return existing, nil
	}
	policy, err := getActiveGovernedCommissionPolicyTx(tx, input.CommissionType, input.SourceType, input.BeneficiaryActorType)
	if err != nil { return nil, err }
	if policy == nil { return nil, ErrGovernedCommissionPolicyMissing }
	if input.Currency != "" && input.Currency != policy.Currency { return nil, fmt.Errorf("source currency does not match policy currency") }
	amount, err := calculateGovernedCommissionAmount(*policy, input.GrossBasisMinorUnits)
	if err != nil { return nil, err }
	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_commissions
		(beneficiary_actor_id,beneficiary_actor_type,source_type,source_id,visit_id,store_id,
		 commission_policy_id,commission_type,amount_minor_units,currency,idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING `+commissionCols, input.BeneficiaryActorID, input.BeneficiaryActorType, input.SourceType,
		input.SourceID, input.VisitID, input.StoreID, policy.PolicyID, input.CommissionType, amount,
		policy.Currency, input.IdempotencyKey)
	commission, err := scanCommission(row)
	if err != nil { return nil, err }
	if _, err := wallet.EnsureWalletTx(tx, input.BeneficiaryActorType, input.BeneficiaryActorID, policy.Currency); err != nil { return nil, err }
	result, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=pending_balance_minor_units+$1, earned_total_minor_units=earned_total_minor_units+$1, updated_at=NOW() WHERE actor_type=$2 AND actor_id=$3`, amount, input.BeneficiaryActorType, input.BeneficiaryActorID)
	if err != nil { return nil, err }
	if affected, _ := result.RowsAffected(); affected != 1 { return nil, fmt.Errorf("beneficiary wallet was not updated") }
	lines := []ledger.LedgerLine{
		{AccountType:"platform_commission_receivable", DebitCredit:"debit", AmountMinorUnits:amount, Currency:policy.Currency},
		{AccountType:"wallet", ActorType:input.BeneficiaryActorType, ActorID:input.BeneficiaryActorID, DebitCredit:"credit", AmountMinorUnits:amount, Currency:policy.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "commission_earned", "commission", commission.ID, lines, ledger.Actor{ID:"wlt", Type:"service"}); err != nil { return nil, err }
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_jrn036_commission_evidence (commission_id,policy_id,policy_version,source_evidence_id,source_evidence_hash,source_evidence_status,gross_basis_minor_units,calculated_amount_minor_units,idempotency_key,request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, commission.ID, policy.PolicyID, policy.Version, input.SourceEvidenceID, input.SourceEvidenceHash, input.SourceEvidenceStatus, input.GrossBasisMinorUnits, amount, input.IdempotencyKey, requestHash); err != nil { return nil, err }
	metadata, _ := json.Marshal(map[string]any{"policyId":policy.PolicyID,"policyVersion":policy.Version,"amountMinorUnits":amount,"currency":policy.Currency})
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_jrn036_audit_events (aggregate_type,aggregate_id,action,actor_id,actor_type,correlation_id,metadata) VALUES ('commission',$1,'commission_calculated',$2,'service',$3,$4::jsonb)`, commission.ID, input.BeneficiaryActorID, correlationID, string(metadata)); err != nil { return nil, err }
	if err := tx.Commit(); err != nil { return nil, err }
	return commission, nil
}

func ApplyGovernedCommissionAdjustment(ctx context.Context, db *sql.DB, commissionID string, input CommissionAdjustmentInput, correlationID string) (*Commission, error) {
	commissionID = strings.TrimSpace(commissionID); input.Reason = strings.TrimSpace(input.Reason); input.OperatorID = strings.TrimSpace(input.OperatorID); input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey); correlationID = strings.TrimSpace(correlationID)
	if commissionID == "" || input.DeltaMinorUnits == 0 || input.Reason == "" || input.OperatorID == "" || input.IdempotencyKey == "" || correlationID == "" { return nil, ErrCommissionAdjustmentInvalid }
	requestHash := hashCommissionParts(commissionID, fmt.Sprint(input.DeltaMinorUnits), input.Reason, input.OperatorID)
	tx, err := db.BeginTx(ctx, nil); if err != nil { return nil, err }; defer tx.Rollback()
	var existingHash string
	if err := tx.QueryRowContext(ctx, `SELECT request_hash FROM wlt_jrn036_commission_adjustments WHERE idempotency_key=$1`, input.IdempotencyKey).Scan(&existingHash); err == nil {
		if existingHash != requestHash { return nil, ErrCommissionIdempotencyConflict }
		commission, err := getCommissionForUpdateTx(tx, commissionID); if err != nil { return nil, err }; if err := tx.Commit(); err != nil { return nil, err }; return commission, nil
	} else if !errors.Is(err, sql.ErrNoRows) { return nil, err }
	commission, err := getCommissionForUpdateTx(tx, commissionID); if err != nil { return nil, err }; if commission == nil { return nil, nil }
	if commission.Status != "pending" && commission.Status != "confirmed" { return nil, ErrCommissionNotInExpectedState }
	newAmount := commission.AmountMinorUnits + input.DeltaMinorUnits
	if newAmount <= 0 { return nil, ErrCommissionAdjustmentInvalid }
	result, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=pending_balance_minor_units+$1, earned_total_minor_units=earned_total_minor_units+$1, updated_at=NOW() WHERE actor_type=$2 AND actor_id=$3 AND pending_balance_minor_units+$1>=0 AND earned_total_minor_units+$1>=0`, input.DeltaMinorUnits, commission.BeneficiaryActorType, commission.BeneficiaryActorID)
	if err != nil { return nil, err }; if affected, _ := result.RowsAffected(); affected != 1 { return nil, ErrCommissionAdjustmentInvalid }
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_commissions SET amount_minor_units=$2, resolution_note=$3, updated_at=NOW() WHERE id=$1`, commissionID, newAmount, input.Reason); err != nil { return nil, err }
	amount := input.DeltaMinorUnits; eventType := "commission_adjusted_up"; lines := []ledger.LedgerLine{{AccountType:"platform_commission_receivable",DebitCredit:"debit",AmountMinorUnits:amount,Currency:commission.Currency},{AccountType:"wallet",ActorType:commission.BeneficiaryActorType,ActorID:commission.BeneficiaryActorID,DebitCredit:"credit",AmountMinorUnits:amount,Currency:commission.Currency}}
	if amount < 0 { amount = -amount; eventType = "commission_adjusted_down"; lines = []ledger.LedgerLine{{AccountType:"wallet",ActorType:commission.BeneficiaryActorType,ActorID:commission.BeneficiaryActorID,DebitCredit:"debit",AmountMinorUnits:amount,Currency:commission.Currency},{AccountType:"platform_commission_receivable",DebitCredit:"credit",AmountMinorUnits:amount,Currency:commission.Currency}} }
	if _, err := ledger.PostLedgerTransaction(ctx, tx, eventType, "commission", commissionID, lines, ledger.Actor{ID:input.OperatorID,Type:"operator"}); err != nil { return nil, err }
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_jrn036_commission_adjustments (commission_id,delta_minor_units,reason,operator_id,idempotency_key,request_hash) VALUES ($1,$2,$3,$4,$5,$6)`, commissionID, input.DeltaMinorUnits, input.Reason, input.OperatorID, input.IdempotencyKey, requestHash); err != nil { return nil, err }
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_jrn036_audit_events (aggregate_type,aggregate_id,action,actor_id,actor_type,reason,correlation_id,metadata) VALUES ('commission_adjustment',$1,$2,$3,'operator',$4,$5,jsonb_build_object('deltaMinorUnits',$6,'resultAmountMinorUnits',$7))`, commissionID, eventType, input.OperatorID, input.Reason, correlationID, input.DeltaMinorUnits, newAmount); err != nil { return nil, err }
	updated, err := getCommissionForUpdateTx(tx, commissionID); if err != nil { return nil, err }; if err := tx.Commit(); err != nil { return nil, err }; return updated, nil
}

func HandleCreateGovernedCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateGovernedCommissionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024)); decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil { shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid or contains caller-supplied financial fields"); return }
		if input.IdempotencyKey == "" { input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key")) }
		commission, err := CreateGovernedCommission(r.Context(), db, input, r.Header.Get("X-Correlation-ID"))
		switch { case errors.Is(err,ErrGovernedCommissionPolicyMissing): shared.SendError(w,http.StatusConflict,"COMMISSION_POLICY_MISSING",err.Error()); return; case errors.Is(err,ErrCommissionEvidenceRequired): shared.SendError(w,http.StatusConflict,"COMMISSION_EVIDENCE_REQUIRED",err.Error()); return; case errors.Is(err,ErrCommissionIdempotencyConflict): shared.SendError(w,http.StatusConflict,"IDEMPOTENCY_CONFLICT",err.Error()); return; case err != nil: shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error()); return }
		shared.SendJSON(w,http.StatusCreated,map[string]any{"commission":commission})
	}
}

func HandleUpsertGovernedCommissionPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertGovernedCommissionPolicyInput
		decoder := json.NewDecoder(http.MaxBytesReader(w,r.Body,128*1024)); decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil { shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid"); return }
		policy, err := UpsertGovernedCommissionPolicy(r.Context(),db,input,r.Header.Get("X-Correlation-ID")); if err != nil { shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error()); return }
		shared.SendJSON(w,http.StatusOK,map[string]any{"commissionPolicy":policy})
	}
}

func HandleAdjustGovernedCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CommissionAdjustmentInput
		decoder := json.NewDecoder(http.MaxBytesReader(w,r.Body,64*1024)); decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil { shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST","request body is invalid"); return }
		if input.IdempotencyKey == "" { input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key")) }
		commission, err := ApplyGovernedCommissionAdjustment(r.Context(),db,r.PathValue("commissionId"),input,r.Header.Get("X-Correlation-ID"))
		switch { case errors.Is(err,ErrCommissionIdempotencyConflict): shared.SendError(w,http.StatusConflict,"IDEMPOTENCY_CONFLICT",err.Error()); return; case errors.Is(err,ErrCommissionNotInExpectedState): shared.SendError(w,http.StatusConflict,"INVALID_STATE",err.Error()); return; case errors.Is(err,ErrCommissionAdjustmentInvalid): shared.SendError(w,http.StatusUnprocessableEntity,"INVALID_ADJUSTMENT",err.Error()); return; case err != nil: shared.SendError(w,http.StatusBadRequest,"INVALID_REQUEST",err.Error()); return }
		if commission == nil { shared.SendError(w,http.StatusNotFound,"NOT_FOUND","commission not found"); return }
		shared.SendJSON(w,http.StatusOK,map[string]any{"commission":commission})
	}
}
