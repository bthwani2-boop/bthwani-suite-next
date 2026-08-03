package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// CaptainWltFinancialEligibilityDecision is the complete financial payload
// accepted by DSH. It deliberately contains no wallet, balance, currency,
// threshold, COD amount, or calculation input.
type CaptainWltFinancialEligibilityDecision struct {
	WltDecisionID string
	Eligible      bool
	ReasonCode    string
	PolicyVersion string
	EvaluatedAt   time.Time
	ExpiresAt     time.Time
}

// CaptainFinancialEligibilitySnapshot is an operational projection of one
// opaque WLT decision. DSH may display and enforce this projection but may not
// reconstruct or re-evaluate the financial policy behind it.
type CaptainFinancialEligibilitySnapshot struct {
	OperatorContextID   string    `json:"operatorContextId"`
	CaptainID           string    `json:"captainId"`
	WltDecisionID       string    `json:"wltDecisionId"`
	Eligible            bool      `json:"eligible"`
	ReasonCode          string    `json:"reasonCode"`
	PolicyVersion       string    `json:"policyVersion"`
	EvaluatedAt         time.Time `json:"evaluatedAt"`
	ExpiresAt           time.Time `json:"expiresAt"`
	LastFinancialSyncAt time.Time `json:"lastFinancialSyncAt"`
}

func normalizeCaptainWltFinancialDecision(input CaptainWltFinancialEligibilityDecision) (CaptainWltFinancialEligibilityDecision, error) {
	input.WltDecisionID = strings.TrimSpace(input.WltDecisionID)
	input.ReasonCode = strings.TrimSpace(input.ReasonCode)
	input.PolicyVersion = strings.TrimSpace(input.PolicyVersion)
	input.EvaluatedAt = input.EvaluatedAt.UTC()
	input.ExpiresAt = input.ExpiresAt.UTC()
	if input.WltDecisionID == "" || input.ReasonCode == "" || input.PolicyVersion == "" {
		return CaptainWltFinancialEligibilityDecision{}, fmt.Errorf("%w: WLT financial eligibility decision metadata is required", ErrInvalid)
	}
	if input.EvaluatedAt.IsZero() || input.ExpiresAt.IsZero() || !input.ExpiresAt.After(input.EvaluatedAt) {
		return CaptainWltFinancialEligibilityDecision{}, fmt.Errorf("%w: WLT financial eligibility decision time window is invalid", ErrInvalid)
	}
	if !input.ExpiresAt.After(time.Now().UTC()) {
		return CaptainWltFinancialEligibilityDecision{}, fmt.Errorf("%w: WLT financial eligibility decision is expired", ErrInvalid)
	}
	return input, nil
}

func UpsertCaptainFinancialEligibilityDecision(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	captainID string,
	decision CaptainWltFinancialEligibilityDecision,
) (CaptainFinancialEligibilitySnapshot, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	captainID = strings.TrimSpace(captainID)
	if db == nil || operatorContextID == "" || captainID == "" {
		return CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: database, operator context, and captain id are required", ErrInvalid)
	}
	decision, err := normalizeCaptainWltFinancialDecision(decision)
	if err != nil {
		return CaptainFinancialEligibilitySnapshot{}, err
	}

	var snapshot CaptainFinancialEligibilitySnapshot
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			operator_context_id,captain_id,wlt_decision_id,eligible,reason_code,
			policy_version,evaluated_at,expires_at,last_financial_sync_at
		) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())
		ON CONFLICT(operator_context_id,captain_id) DO UPDATE SET
			wlt_decision_id=excluded.wlt_decision_id,
			eligible=excluded.eligible,
			reason_code=excluded.reason_code,
			policy_version=excluded.policy_version,
			evaluated_at=excluded.evaluated_at,
			expires_at=excluded.expires_at,
			last_financial_sync_at=excluded.last_financial_sync_at
		RETURNING operator_context_id,captain_id,wlt_decision_id,eligible,reason_code,
			policy_version,evaluated_at,expires_at,last_financial_sync_at`,
		operatorContextID,
		captainID,
		decision.WltDecisionID,
		decision.Eligible,
		decision.ReasonCode,
		decision.PolicyVersion,
		decision.EvaluatedAt,
		decision.ExpiresAt,
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WltDecisionID,
		&snapshot.Eligible,
		&snapshot.ReasonCode,
		&snapshot.PolicyVersion,
		&snapshot.EvaluatedAt,
		&snapshot.ExpiresAt,
		&snapshot.LastFinancialSyncAt,
	)
	return snapshot, err
}

func GetCaptainFinancialEligibilitySnapshot(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	captainID string,
) (CaptainFinancialEligibilitySnapshot, error) {
	var snapshot CaptainFinancialEligibilitySnapshot
	if db == nil {
		return snapshot, fmt.Errorf("%w: database is required", ErrInvalid)
	}
	normCtx, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return snapshot, err
	}
	captainID = strings.TrimSpace(captainID)
	if captainID == "" {
		return snapshot, fmt.Errorf("%w: captain id is required", ErrInvalid)
	}
	err = db.QueryRowContext(ctx, `
		SELECT operator_context_id,captain_id,wlt_decision_id,eligible,reason_code,
			policy_version,evaluated_at,expires_at,last_financial_sync_at
		FROM dsh_captain_financial_eligibility
		WHERE operator_context_id=$1 AND captain_id=$2`,
		normCtx, captainID,
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WltDecisionID,
		&snapshot.Eligible,
		&snapshot.ReasonCode,
		&snapshot.PolicyVersion,
		&snapshot.EvaluatedAt,
		&snapshot.ExpiresAt,
		&snapshot.LastFinancialSyncAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return snapshot, ErrCaptainNotEligible
	}
	return snapshot, err
}
