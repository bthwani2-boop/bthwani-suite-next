package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var (
	ErrFieldCategoryPolicyMissing  = errors.New("active field commission category policy is required")
	ErrFieldCategoryPolicyConflict = errors.New("field commission category policy version conflict")
	ErrFieldWalletUnavailable      = errors.New("tenant field wallet is unavailable")
)

type FieldCategoryCommissionPolicy struct {
	PolicyID              string `json:"policyId"`
	PartnerCategory       string `json:"partnerCategory"`
	Version               int64  `json:"version"`
	FixedAmountMinorUnits int64  `json:"fixedAmountMinorUnits"`
	Currency              string `json:"currency"`
	Status                string `json:"status"`
	ChangeReason          string `json:"changeReason"`
	UpdatedByActorID      string `json:"updatedByActorId"`
}

type UpsertFieldCategoryCommissionPolicyInput struct {
	ExpectedVersion       int64  `json:"expectedVersion"`
	FixedAmountMinorUnits int64  `json:"fixedAmountMinorUnits"`
	Currency              string `json:"currency"`
	Status                string `json:"status"`
	ChangeReason          string `json:"changeReason"`
	UpdatedByActorID      string `json:"updatedByActorId"`
}

type CreateFieldCategoryCommissionInput struct {
	BeneficiaryActorID string `json:"beneficiaryActorId"`
	VisitID            string `json:"visitId"`
	StoreID            string `json:"storeId"`
	PartnerID          string `json:"partnerId"`
	PartnerCategory    string `json:"partnerCategory"`
	SourceEvidenceHash string `json:"sourceEvidenceHash"`
	IdempotencyKey     string `json:"idempotencyKey"`
}

type policyScanner interface{ Scan(dest ...any) error }

func scanFieldCategoryPolicy(row policyScanner) (*FieldCategoryCommissionPolicy, error) {
	var policy FieldCategoryCommissionPolicy
	err := row.Scan(
		&policy.PolicyID, &policy.PartnerCategory, &policy.Version,
		&policy.FixedAmountMinorUnits, &policy.Currency, &policy.Status,
		&policy.ChangeReason, &policy.UpdatedByActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &policy, err
}

func normalizePartnerCategory(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "default"
	}
	return value
}

func UpsertFieldCategoryCommissionPolicy(
	ctx context.Context,
	db *sql.DB,
	tenantID string,
	partnerCategory string,
	input UpsertFieldCategoryCommissionPolicyInput,
	correlationID string,
) (*FieldCategoryCommissionPolicy, error) {
	tenantID = strings.TrimSpace(tenantID)
	partnerCategory = normalizePartnerCategory(partnerCategory)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.UpdatedByActorID = strings.TrimSpace(input.UpdatedByActorID)
	correlationID = strings.TrimSpace(correlationID)
	if tenantID == "" || input.ExpectedVersion < 0 || input.FixedAmountMinorUnits <= 0 || len(input.Currency) != 3 ||
		(input.Status != "active" && input.Status != "inactive") || len(input.ChangeReason) < 3 ||
		input.UpdatedByActorID == "" || correlationID == "" {
		return nil, fmt.Errorf("tenant, valid amount, currency, status, reason, actor and correlationId are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "field-category-policy:"+tenantID+":"+partnerCategory); err != nil {
		return nil, err
	}
	var currentVersion int64
	err = tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(version),0)
		FROM wlt_field_commission_category_policy_versions
		WHERE tenant_id=$1 AND partner_category=$2`, tenantID, partnerCategory).Scan(&currentVersion)
	if err != nil {
		return nil, err
	}
	if currentVersion != input.ExpectedVersion {
		return nil, ErrFieldCategoryPolicyConflict
	}
	if input.Status == "active" {
		if _, err := tx.ExecContext(ctx, `UPDATE wlt_field_commission_category_policy_versions
			SET status='inactive'
			WHERE tenant_id=$1 AND partner_category=$2 AND status='active'`, tenantID, partnerCategory); err != nil {
			return nil, err
		}
	}
	version := currentVersion + 1
	policyID := "field-category-" + partnerCategory
	policy, err := scanFieldCategoryPolicy(tx.QueryRowContext(ctx, `INSERT INTO wlt_field_commission_category_policy_versions(
		tenant_id,policy_id,partner_category,version,fixed_amount_minor_units,currency,status,
		change_reason,updated_by_actor_id)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING policy_id,partner_category,version,fixed_amount_minor_units,currency,status,change_reason,updated_by_actor_id`,
		tenantID, policyID, partnerCategory, version, input.FixedAmountMinorUnits, input.Currency,
		input.Status, input.ChangeReason, input.UpdatedByActorID))
	if err != nil {
		return nil, err
	}
	metadata, _ := json.Marshal(map[string]any{
		"tenantId": tenantID,
		"partnerCategory": partnerCategory,
		"version": version,
		"amountMinorUnits": input.FixedAmountMinorUnits,
		"currency": input.Currency,
		"status": input.Status,
	})
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_audit_events(
		tenant_id,aggregate_type,aggregate_id,action,actor_id,actor_type,reason,correlation_id,metadata)
		VALUES($1,'commission_policy',$2,'field_category_policy_version_created',$3,'operator',$4,$5,$6::jsonb)`,
		tenantID, policyID, input.UpdatedByActorID, input.ChangeReason, correlationID, string(metadata)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return policy, nil
}

func getActiveFieldCategoryPolicyTx(ctx context.Context, tx *sql.Tx, tenantID, category string) (*FieldCategoryCommissionPolicy, error) {
	category = normalizePartnerCategory(category)
	return scanFieldCategoryPolicy(tx.QueryRowContext(ctx, `SELECT
		policy_id,partner_category,version,fixed_amount_minor_units,currency,status,
		change_reason,updated_by_actor_id
		FROM wlt_field_commission_category_policy_versions
		WHERE tenant_id=$1 AND partner_category IN ($2,'default') AND status='active'
		ORDER BY CASE WHEN partner_category=$2 THEN 0 ELSE 1 END, version DESC
		LIMIT 1`, tenantID, category))
}

func normalizeFieldCategoryCommissionInput(input *CreateFieldCategoryCommissionInput) error {
	input.BeneficiaryActorID = strings.TrimSpace(input.BeneficiaryActorID)
	input.VisitID = strings.TrimSpace(input.VisitID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.PartnerCategory = normalizePartnerCategory(input.PartnerCategory)
	input.SourceEvidenceHash = strings.TrimSpace(input.SourceEvidenceHash)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.BeneficiaryActorID == "" || input.VisitID == "" || input.StoreID == "" ||
		input.PartnerID == "" || input.SourceEvidenceHash == "" || input.IdempotencyKey == "" {
		return fmt.Errorf("field actor, visit, store, partner, evidence hash and idempotencyKey are required")
	}
	return nil
}

func getExistingFieldCategoryCommissionTx(ctx context.Context, tx *sql.Tx, tenantID, idempotencyKey string) (*Commission, string, error) {
	var commissionID, requestHash string
	err := tx.QueryRowContext(ctx, `SELECT commission_id,request_hash
		FROM wlt_commission_evidence
		WHERE tenant_id=$1 AND idempotency_key=$2`, tenantID, idempotencyKey).Scan(&commissionID, &requestHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}
	commission, err := scanCommission(tx.QueryRowContext(ctx, `SELECT `+commissionCols+`
		FROM wlt_commissions WHERE tenant_id=$1 AND id=$2`, tenantID, commissionID))
	return commission, requestHash, err
}

func CreateFieldCategoryCommission(
	ctx context.Context,
	db *sql.DB,
	tenantID string,
	input CreateFieldCategoryCommissionInput,
	correlationID string,
) (*Commission, error) {
	tenantID = strings.TrimSpace(tenantID)
	correlationID = strings.TrimSpace(correlationID)
	if tenantID == "" || correlationID == "" {
		return nil, fmt.Errorf("tenantId and correlationId are required")
	}
	if err := normalizeFieldCategoryCommissionInput(&input); err != nil {
		return nil, err
	}
	requestHash := hashCommissionParts(
		tenantID, input.BeneficiaryActorID, input.VisitID, input.StoreID,
		input.PartnerID, input.PartnerCategory, input.SourceEvidenceHash,
	)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	existing, storedHash, err := getExistingFieldCategoryCommissionTx(ctx, tx, tenantID, input.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if storedHash != requestHash {
			return nil, ErrCommissionIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return existing, nil
	}
	policy, err := getActiveFieldCategoryPolicyTx(ctx, tx, tenantID, input.PartnerCategory)
	if err != nil {
		return nil, err
	}
	if policy == nil {
		return nil, ErrFieldCategoryPolicyMissing
	}

	var walletStatus, walletCurrency string
	err = tx.QueryRowContext(ctx, `SELECT status,currency FROM wlt_wallets
		WHERE tenant_id=$1 AND actor_type='field' AND actor_id=$2 FOR UPDATE`,
		tenantID, input.BeneficiaryActorID).Scan(&walletStatus, &walletCurrency)
	if errors.Is(err, sql.ErrNoRows) || walletStatus != "active" || walletCurrency != policy.Currency {
		return nil, ErrFieldWalletUnavailable
	}
	if err != nil {
		return nil, err
	}

	commission, err := scanCommission(tx.QueryRowContext(ctx, `INSERT INTO wlt_commissions(
		tenant_id,beneficiary_actor_id,beneficiary_actor_type,source_type,source_id,
		visit_id,store_id,partner_id,partner_category,commission_policy_id,
		commission_type,amount_minor_units,currency,idempotency_key)
		VALUES($1,$2,'field','field_visit',$3,$3::uuid,$4,$5,$6,$7,
		'field_visit_fee',$8,$9,$10)
		RETURNING `+commissionCols,
		tenantID, input.BeneficiaryActorID, input.VisitID, input.StoreID,
		input.PartnerID, input.PartnerCategory, policy.PolicyID,
		policy.FixedAmountMinorUnits, policy.Currency, input.IdempotencyKey))
	if err != nil {
		return nil, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE wlt_wallets SET
		pending_balance_minor_units=pending_balance_minor_units+$1,
		earned_total_minor_units=earned_total_minor_units+$1,
		last_ledger_entry_at=now(),updated_at=now()
		WHERE tenant_id=$2 AND actor_type='field' AND actor_id=$3`,
		policy.FixedAmountMinorUnits, tenantID, input.BeneficiaryActorID)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrFieldWalletUnavailable
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "commission_earned", "commission", commission.ID, []ledger.LedgerLine{
		{AccountType: "platform_commission_receivable", DebitCredit: "debit", AmountMinorUnits: policy.FixedAmountMinorUnits, Currency: policy.Currency},
		{AccountType: "wallet", ActorType: "field", ActorID: input.BeneficiaryActorID, DebitCredit: "credit", AmountMinorUnits: policy.FixedAmountMinorUnits, Currency: policy.Currency},
	}, ledger.Actor{ID: "wlt", Type: "service"}); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_commission_evidence(
		tenant_id,commission_id,policy_id,policy_version,source_evidence_id,source_evidence_hash,
		source_evidence_status,gross_basis_minor_units,calculated_amount_minor_units,
		idempotency_key,request_hash)
		VALUES($1,$2,$3,$4,$5,$6,'completed',0,$7,$8,$9)`,
		tenantID, commission.ID, policy.PolicyID, policy.Version, input.VisitID,
		input.SourceEvidenceHash, policy.FixedAmountMinorUnits, input.IdempotencyKey, requestHash); err != nil {
		return nil, err
	}
	metadata, _ := json.Marshal(map[string]any{
		"tenantId": tenantID,
		"partnerId": input.PartnerID,
		"partnerCategory": input.PartnerCategory,
		"matchedPolicyCategory": policy.PartnerCategory,
		"policyId": policy.PolicyID,
		"policyVersion": policy.Version,
		"amountMinorUnits": policy.FixedAmountMinorUnits,
		"currency": policy.Currency,
	})
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_audit_events(
		tenant_id,aggregate_type,aggregate_id,action,actor_id,actor_type,correlation_id,metadata)
		VALUES($1,'commission',$2,'field_category_commission_calculated',$3,'service',$4,$5::jsonb)`,
		tenantID, commission.ID, input.BeneficiaryActorID, correlationID, string(metadata)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return commission, nil
}

func HandleUpsertFieldCategoryCommissionPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpsertFieldCategoryCommissionPolicyInput
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		policy, err := UpsertFieldCategoryCommissionPolicy(
			r.Context(), db, r.Header.Get("X-Tenant-ID"), r.PathValue("partnerCategory"), input, r.Header.Get("X-Correlation-ID"),
		)
		if errors.Is(err, ErrFieldCategoryPolicyConflict) {
			shared.SendError(w, http.StatusConflict, "POLICY_VERSION_CONFLICT", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"fieldCommissionPolicy": policy})
	}
}

func HandleCreateFieldCategoryCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateFieldCategoryCommissionInput
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		commission, err := CreateFieldCategoryCommission(
			r.Context(), db, r.Header.Get("X-Tenant-ID"), input, r.Header.Get("X-Correlation-ID"),
		)
		switch {
		case errors.Is(err, ErrFieldCategoryPolicyMissing):
			shared.SendError(w, http.StatusServiceUnavailable, "FIELD_CATEGORY_POLICY_MISSING", err.Error())
			return
		case errors.Is(err, ErrFieldWalletUnavailable):
			shared.SendError(w, http.StatusConflict, "FIELD_WALLET_UNAVAILABLE", err.Error())
			return
		case errors.Is(err, ErrCommissionIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "COMMISSION_IDEMPOTENCY_CONFLICT", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"commission": commission})
	}
}
