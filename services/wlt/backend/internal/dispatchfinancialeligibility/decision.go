package dispatchfinancialeligibility

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

const fallbackDecisionTTL = 60 * time.Second

type EvaluateRequest struct {
	CaptainID string `json:"captainId"`
}

type Decision struct {
	Eligible      bool      `json:"eligible"`
	ReasonCode    string    `json:"reasonCode"`
	DecisionID    string    `json:"decisionId"`
	PolicyVersion string    `json:"policyVersion"`
	EvaluatedAt   time.Time `json:"evaluatedAt"`
	ExpiresAt     time.Time `json:"expiresAt"`
}

type policyRecord struct {
	Enabled                          bool
	RequireActiveWallet              bool
	MinimumDispatchBalanceMinorUnits int64
	MinimumCODBalanceMinorUnits      int64
	Currency                         string
	DecisionTTLSeconds               int
	PolicyVersion                    string
}

type walletRecord struct {
	ID                                   string
	Status                               string
	Currency                             string
	AvailableBalanceMinorUnits           int64
	OutstandingDebtMinorUnits            int64
	CollateralReservedBalanceMinorUnits  int64
	ProtectedMinimumCollateralMinorUnits int64
	ActiveCollateralPositionCount        int64
}

type evaluation struct {
	Eligible        bool
	ReasonCode      string
	RequiredBalance *int64
	Wallet          *walletRecord
	PolicyVersion   string
	ExpiresAt       time.Time
}

// evaluateFinancialEligibility is the sole financial decision function for
// dispatch. It applies the strictest active dispatch/COD threshold so the
// returned decision is universally valid for any DSH assignment during its
// short lifetime. DSH never selects a threshold or sends financial inputs.
func evaluateFinancialEligibility(now time.Time, policy *policyRecord, wallet *walletRecord) evaluation {
	now = now.UTC()
	if policy == nil {
		return evaluation{
			Eligible:      false,
			ReasonCode:    "WLT_DISPATCH_POLICY_NOT_CONFIGURED",
			PolicyVersion: "unconfigured",
			ExpiresAt:     now.Add(fallbackDecisionTTL),
		}
	}

	ttl := time.Duration(policy.DecisionTTLSeconds) * time.Second
	result := evaluation{
		Eligible:      false,
		PolicyVersion: strings.TrimSpace(policy.PolicyVersion),
		ExpiresAt:     now.Add(ttl),
		Wallet:        wallet,
	}
	if !policy.Enabled {
		result.ReasonCode = "WLT_DISPATCH_FINANCIAL_POLICY_DISABLED"
		return result
	}
	if wallet == nil {
		result.ReasonCode = "WLT_CAPTAIN_WALLET_NOT_FOUND"
		return result
	}
	if policy.RequireActiveWallet && !strings.EqualFold(strings.TrimSpace(wallet.Status), "active") {
		result.ReasonCode = "WLT_WALLET_NOT_ACTIVE"
		return result
	}
	if !strings.EqualFold(strings.TrimSpace(wallet.Currency), strings.TrimSpace(policy.Currency)) {
		result.ReasonCode = "WLT_WALLET_CURRENCY_MISMATCH"
		return result
	}
	if wallet.OutstandingDebtMinorUnits > 0 {
		result.ReasonCode = "WLT_PROVIDER_DEBT_OUTSTANDING"
		return result
	}
	if wallet.ProtectedMinimumCollateralMinorUnits < 0 ||
		wallet.CollateralReservedBalanceMinorUnits < wallet.ProtectedMinimumCollateralMinorUnits {
		result.ReasonCode = "WLT_CAPTAIN_COLLATERAL_BELOW_PROTECTED_MINIMUM"
		return result
	}
	if wallet.ActiveCollateralPositionCount <= 0 {
		result.ReasonCode = "WLT_CAPTAIN_COLLATERAL_NOT_FUNDED"
		return result
	}

	required := policy.MinimumDispatchBalanceMinorUnits
	if policy.MinimumCODBalanceMinorUnits > required {
		required = policy.MinimumCODBalanceMinorUnits
	}
	result.RequiredBalance = &required
	if wallet.AvailableBalanceMinorUnits < required {
		result.ReasonCode = "WLT_AVAILABLE_BALANCE_BELOW_REQUIRED"
		return result
	}
	result.Eligible = true
	result.ReasonCode = "WLT_DISPATCH_FINANCIALLY_ELIGIBLE"
	return result
}

func HandleEvaluate(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusForbidden, "FINANCIAL_SCOPE_REQUIRED", "trusted financial scope is required")
			return
		}
		if db == nil {
			shared.SendError(w, http.StatusServiceUnavailable, "WLT_DATABASE_UNAVAILABLE", "financial eligibility database is unavailable")
			return
		}

		var input EvaluateRequest
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		input.CaptainID = strings.TrimSpace(input.CaptainID)
		if input.CaptainID == "" || len(input.CaptainID) > 200 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_CAPTAIN_ID", "captainId is required and must not exceed 200 characters")
			return
		}

		decision, err := evaluateAndPersist(r.Context(), db, operatorContextID, input)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_FINANCIAL_ELIGIBILITY_FAILED", "financial eligibility evaluation failed")
			return
		}
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Pragma", "no-cache")
		shared.SendJSON(w, http.StatusOK, map[string]any{"decision": decision})
	}
}

func evaluateAndPersist(ctx context.Context, db *sql.DB, operatorContextID string, input EvaluateRequest) (Decision, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return Decision{}, err
	}
	defer tx.Rollback()

	policy, err := loadPolicy(ctx, tx, operatorContextID)
	if err != nil {
		return Decision{}, err
	}
	wallet, err := loadCaptainWallet(ctx, tx, operatorContextID, input.CaptainID)
	if err != nil {
		return Decision{}, err
	}

	evaluatedAt := time.Now().UTC()
	result := evaluateFinancialEligibility(evaluatedAt, policy, wallet)
	if strings.TrimSpace(result.PolicyVersion) == "" {
		return Decision{}, fmt.Errorf("empty WLT policy version")
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE wlt_dispatch_financial_eligibility_decisions
		SET revoked_at=$3
		WHERE operator_context_id=$1 AND captain_id=$2
		  AND revoked_at IS NULL AND expires_at>$3`,
		operatorContextID, input.CaptainID, evaluatedAt); err != nil {
		return Decision{}, fmt.Errorf("revoke previous dispatch eligibility decisions: %w", err)
	}

	var decisionID string
	var walletID any
	var walletStatus any
	var availableBalance any
	var currency any
	if wallet != nil {
		walletID = wallet.ID
		walletStatus = wallet.Status
		availableBalance = wallet.AvailableBalanceMinorUnits
		currency = wallet.Currency
	}
	var requiredBalance any
	if result.RequiredBalance != nil {
		requiredBalance = *result.RequiredBalance
	}
	err = tx.QueryRowContext(ctx, `
		INSERT INTO wlt_dispatch_financial_eligibility_decisions(
			operator_context_id,captain_id,wallet_id,wallet_status,
			available_balance_minor_units,required_balance_minor_units,currency,
			eligible,reason_code,policy_version,evaluated_at,expires_at
		) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id`,
		operatorContextID, input.CaptainID, walletID, walletStatus,
		availableBalance, requiredBalance, currency, result.Eligible, result.ReasonCode,
		result.PolicyVersion, evaluatedAt, result.ExpiresAt,
	).Scan(&decisionID)
	if err != nil {
		return Decision{}, fmt.Errorf("persist WLT dispatch eligibility decision: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return Decision{}, err
	}
	return Decision{
		Eligible:      result.Eligible,
		ReasonCode:    result.ReasonCode,
		DecisionID:    decisionID,
		PolicyVersion: result.PolicyVersion,
		EvaluatedAt:   evaluatedAt,
		ExpiresAt:     result.ExpiresAt,
	}, nil
}

func loadPolicy(ctx context.Context, tx *sql.Tx, operatorContextID string) (*policyRecord, error) {
	var policy policyRecord
	err := tx.QueryRowContext(ctx, `
		SELECT enabled,require_active_wallet,minimum_dispatch_balance_minor_units,
			minimum_cod_balance_minor_units,currency,decision_ttl_seconds,policy_version
		FROM wlt_dispatch_financial_eligibility_policies
		WHERE operator_context_id=$1
		FOR SHARE`, operatorContextID,
	).Scan(
		&policy.Enabled,
		&policy.RequireActiveWallet,
		&policy.MinimumDispatchBalanceMinorUnits,
		&policy.MinimumCODBalanceMinorUnits,
		&policy.Currency,
		&policy.DecisionTTLSeconds,
		&policy.PolicyVersion,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load WLT dispatch financial policy: %w", err)
	}
	return &policy, nil
}

func loadCaptainWallet(ctx context.Context, tx *sql.Tx, operatorContextID, captainID string) (*walletRecord, error) {
	var wallet walletRecord
	var pending, held, codReserved int64
	err := tx.QueryRowContext(ctx, `
		SELECT id,status,currency,pending_balance_minor_units,
		       held_balance_minor_units,cod_reserved_balance_minor_units,
		       collateral_reserved_balance_minor_units,
		       COALESCE((SELECT minimum_collateral_minor_units
		           FROM wlt_captain_collateral_policies cp
		           WHERE cp.operator_context_id=wlt_wallets.operator_context_id
		             AND cp.enabled),0),
		       COALESCE((SELECT COUNT(*)
		           FROM wlt_captain_collateral_positions p
		           WHERE p.operator_context_id=wlt_wallets.operator_context_id
		             AND p.captain_id=wlt_wallets.actor_id
		             AND p.currency=wlt_wallets.currency
		             AND p.status='active'),0),
		       COALESCE((SELECT SUM(d.outstanding_amount_minor_units)
				FROM wlt_provider_debts d
				WHERE d.operator_context_id=wlt_wallets.operator_context_id
				  AND d.provider_actor_type='captain'
				  AND d.provider_actor_id=wlt_wallets.actor_id
				  AND d.currency=wlt_wallets.currency
				  AND d.status IN ('open','partially_settled')),0)
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2
		FOR SHARE`, operatorContextID, captainID,
	).Scan(&wallet.ID, &wallet.Status, &wallet.Currency, &pending, &held, &codReserved,
		&wallet.CollateralReservedBalanceMinorUnits,
		&wallet.ProtectedMinimumCollateralMinorUnits,
		&wallet.ActiveCollateralPositionCount,
		&wallet.OutstandingDebtMinorUnits)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load WLT captain wallet: %w", err)
	}
	projection, err := ledger.GetWalletLedgerProjection(ctx, tx, "captain", captainID, wallet.Currency)
	if err != nil {
		return nil, fmt.Errorf("load canonical WLT captain wallet projection: %w", err)
	}
	if projection != nil {
		wallet.AvailableBalanceMinorUnits = projection.BalanceMinorUnits - pending - held - codReserved
	}
	return &wallet, nil
}
