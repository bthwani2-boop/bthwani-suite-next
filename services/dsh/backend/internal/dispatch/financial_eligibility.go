package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type CaptainWltFinancialEligibilityDecision struct {
	WltDecisionID       string
	WltReasonCode       string
	WltPolicyVersion    string
	Eligible            bool
	IneligibilityReason string
	SnapshotReference   string
	EvaluatedAt         time.Time
	TTLSeconds          int
}

type CaptainFinancialEligibilitySnapshot struct {
	OperatorContextID   string    `json:"operatorContextId"`
	CaptainID           string    `json:"captainId"`
	WltDecisionID       string    `json:"wltDecisionId"`
	WltReasonCode       string    `json:"wltReasonCode"`
	WltPolicyVersion    string    `json:"wltPolicyVersion"`
	Eligible            bool      `json:"eligible"`
	IneligibilityReason string    `json:"ineligibilityReason,omitempty"`
	SnapshotReference   string    `json:"snapshotReference"`
	CheckedAt           time.Time `json:"checkedAt"`
	EvaluatedAt         time.Time `json:"evaluatedAt"`
	ExpiresAt           time.Time `json:"expiresAt"`
}

func normalizeCaptainWltFinancialDecision(input CaptainWltFinancialEligibilityDecision) (CaptainWltFinancialEligibilityDecision, error) {
	input.WltDecisionID = strings.TrimSpace(input.WltDecisionID)
	input.WltReasonCode = strings.TrimSpace(input.WltReasonCode)
	input.WltPolicyVersion = strings.TrimSpace(input.WltPolicyVersion)
	input.IneligibilityReason = strings.TrimSpace(input.IneligibilityReason)
	input.SnapshotReference = strings.TrimSpace(input.SnapshotReference)
	if input.SnapshotReference == "" {
		input.SnapshotReference = input.WltDecisionID
	}
	if input.EvaluatedAt.IsZero() {
		input.EvaluatedAt = time.Now().UTC()
	} else {
		input.EvaluatedAt = input.EvaluatedAt.UTC()
	}
	if !input.Eligible && input.IneligibilityReason == "" {
		input.IneligibilityReason = input.WltReasonCode
	}
	if input.TTLSeconds < 30 || input.TTLSeconds > 600 {
		return CaptainWltFinancialEligibilityDecision{}, fmt.Errorf("%w: WLT decision ttl must be between 30 and 600 seconds", ErrInvalid)
	}
	if input.WltDecisionID == "" || input.WltReasonCode == "" || input.WltPolicyVersion == "" || input.SnapshotReference == "" {
		return CaptainWltFinancialEligibilityDecision{}, fmt.Errorf("%w: WLT financial eligibility decision metadata is required", ErrInvalid)
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
	if operatorContextID == "" || captainID == "" {
		return CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: operator context and captain id are required", ErrInvalid)
	}
	decision, err := normalizeCaptainWltFinancialDecision(decision)
	if err != nil {
		return CaptainFinancialEligibilitySnapshot{}, err
	}

	var snapshot CaptainFinancialEligibilitySnapshot
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			operator_context_id,captain_id,wlt_decision_id,wlt_reason_code,wlt_policy_version,
			eligible,ineligibility_reason,snapshot_reference,checked_at,evaluated_at,expires_at
		) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,now()+($10*interval '1 second'))
		ON CONFLICT(operator_context_id,captain_id) DO UPDATE SET
			wlt_decision_id=excluded.wlt_decision_id,
			wlt_reason_code=excluded.wlt_reason_code,
			wlt_policy_version=excluded.wlt_policy_version,
			eligible=excluded.eligible,
			ineligibility_reason=excluded.ineligibility_reason,
			snapshot_reference=excluded.snapshot_reference,
			checked_at=excluded.checked_at,
			evaluated_at=excluded.evaluated_at,
			expires_at=excluded.expires_at
		RETURNING operator_context_id,captain_id,wlt_decision_id,wlt_reason_code,wlt_policy_version,
			eligible,ineligibility_reason,snapshot_reference,checked_at,evaluated_at,expires_at`,
		operatorContextID,
		captainID,
		decision.WltDecisionID,
		decision.WltReasonCode,
		decision.WltPolicyVersion,
		decision.Eligible,
		decision.IneligibilityReason,
		decision.SnapshotReference,
		decision.EvaluatedAt,
		decision.TTLSeconds,
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WltDecisionID,
		&snapshot.WltReasonCode,
		&snapshot.WltPolicyVersion,
		&snapshot.Eligible,
		&snapshot.IneligibilityReason,
		&snapshot.SnapshotReference,
		&snapshot.CheckedAt,
		&snapshot.EvaluatedAt,
		&snapshot.ExpiresAt,
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
	normCtx, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return snapshot, err
	}
	err = db.QueryRowContext(ctx, `
		SELECT operator_context_id,captain_id,wlt_decision_id,wlt_reason_code,wlt_policy_version,
			eligible,ineligibility_reason,snapshot_reference,checked_at,evaluated_at,expires_at
		FROM dsh_captain_financial_eligibility
		WHERE operator_context_id=$1 AND captain_id=$2`,
		normCtx, strings.TrimSpace(captainID),
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WltDecisionID,
		&snapshot.WltReasonCode,
		&snapshot.WltPolicyVersion,
		&snapshot.Eligible,
		&snapshot.IneligibilityReason,
		&snapshot.SnapshotReference,
		&snapshot.CheckedAt,
		&snapshot.EvaluatedAt,
		&snapshot.ExpiresAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return snapshot, ErrCaptainNotEligible
	}
	return snapshot, err
}
