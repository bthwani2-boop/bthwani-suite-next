package marketing

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrLoyaltyPolicyVersionConflict = errors.New("loyalty policy version conflict")
	ErrLoyaltyPolicySelfApproval    = errors.New("loyalty policy creator cannot approve it")
	ErrActiveLoyaltyPolicyImmutable = errors.New("active loyalty policy terms are immutable")
)

type LoyaltyEarningPolicy struct {
	ID                            string  `json:"id"`
	NameAr                        string  `json:"nameAr"`
	PointsNumerator               int64   `json:"pointsNumerator"`
	EligibleMinorUnitsDenominator int64   `json:"eligibleMinorUnitsDenominator"`
	MinimumPoints                 int64   `json:"minimumPoints"`
	MaximumPointsPerOrder         int64   `json:"maximumPointsPerOrder"`
	Status                        string  `json:"status"`
	CreatedByActorID              string  `json:"createdByActorId"`
	ApprovedByActorID             string  `json:"approvedByActorId,omitempty"`
	ApprovedAt                    *string `json:"approvedAt,omitempty"`
	Version                       int     `json:"version"`
	CreatedAt                     string  `json:"createdAt"`
	UpdatedAt                     string  `json:"updatedAt"`
}

type CreateLoyaltyEarningPolicyInput struct {
	NameAr                        string
	PointsNumerator               int64
	EligibleMinorUnitsDenominator int64
	MinimumPoints                 int64
	MaximumPointsPerOrder         int64
	ActorID                       string
	CorrelationID                 string
}

type UpdateLoyaltyEarningPolicyInput struct {
	NameAr                        *string
	PointsNumerator               *int64
	EligibleMinorUnitsDenominator *int64
	MinimumPoints                 *int64
	MaximumPointsPerOrder         *int64
	Status                        *string
	ExpectedVersion               int
	ActorID                       string
	CorrelationID                 string
}

const loyaltyPolicyColumns = `id::text,name_ar,points_numerator,
	eligible_minor_units_denominator,minimum_points,maximum_points_per_order,
	status,created_by_actor_id,approved_by_actor_id,approved_at::text,
	version,created_at::text,updated_at::text`

func scanLoyaltyPolicy(row interface{ Scan(dest ...any) error }) (LoyaltyEarningPolicy, error) {
	var policy LoyaltyEarningPolicy
	var approvedAt sql.NullString
	err := row.Scan(
		&policy.ID,
		&policy.NameAr,
		&policy.PointsNumerator,
		&policy.EligibleMinorUnitsDenominator,
		&policy.MinimumPoints,
		&policy.MaximumPointsPerOrder,
		&policy.Status,
		&policy.CreatedByActorID,
		&policy.ApprovedByActorID,
		&approvedAt,
		&policy.Version,
		&policy.CreatedAt,
		&policy.UpdatedAt,
	)
	if approvedAt.Valid && approvedAt.String != "" {
		value := approvedAt.String
		policy.ApprovedAt = &value
	}
	return policy, err
}

func validateLoyaltyPolicyTerms(
	name string,
	numerator, denominator, minimum, maximum int64,
) error {
	if strings.TrimSpace(name) == "" || numerator <= 0 || denominator <= 0 || minimum < 0 || maximum < 0 {
		return ErrInvalid
	}
	return nil
}

func ListLoyaltyEarningPolicies(db *sql.DB) ([]LoyaltyEarningPolicy, error) {
	rows, err := db.Query(`SELECT ` + loyaltyPolicyColumns + `
		FROM dsh_loyalty_earning_policies
		ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END,
		updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []LoyaltyEarningPolicy{}
	for rows.Next() {
		policy, scanErr := scanLoyaltyPolicy(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, policy)
	}
	return result, rows.Err()
}

func GetLoyaltyEarningPolicy(db *sql.DB, id string) (LoyaltyEarningPolicy, error) {
	policy, err := scanLoyaltyPolicy(db.QueryRow(`SELECT `+loyaltyPolicyColumns+`
		FROM dsh_loyalty_earning_policies WHERE id::text=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return LoyaltyEarningPolicy{}, ErrNotFound
	}
	return policy, err
}

func CreateLoyaltyEarningPolicy(
	db *sql.DB,
	input CreateLoyaltyEarningPolicyInput,
) (LoyaltyEarningPolicy, error) {
	if err := validateLoyaltyPolicyTerms(
		input.NameAr,
		input.PointsNumerator,
		input.EligibleMinorUnitsDenominator,
		input.MinimumPoints,
		input.MaximumPointsPerOrder,
	); err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	policy, err := scanLoyaltyPolicy(db.QueryRow(`
		INSERT INTO dsh_loyalty_earning_policies
			(name_ar,points_numerator,eligible_minor_units_denominator,
			 minimum_points,maximum_points_per_order,status,created_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,'draft',$6)
		RETURNING `+loyaltyPolicyColumns,
		strings.TrimSpace(input.NameAr),
		input.PointsNumerator,
		input.EligibleMinorUnitsDenominator,
		input.MinimumPoints,
		input.MaximumPointsPerOrder,
		input.ActorID,
	))
	if err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	after, _ := json.Marshal(policy)
	_ = WriteAuditEvent(db, "loyalty_earning_policy", policy.ID, input.ActorID, "operator", "create", "", input.CorrelationID, nil, after)
	return policy, nil
}

func UpdateLoyaltyEarningPolicy(
	db *sql.DB,
	id string,
	input UpdateLoyaltyEarningPolicyInput,
) (LoyaltyEarningPolicy, error) {
	current, err := GetLoyaltyEarningPolicy(db, id)
	if err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	if input.ExpectedVersion <= 0 || input.ExpectedVersion != current.Version {
		return LoyaltyEarningPolicy{}, ErrLoyaltyPolicyVersionConflict
	}
	next := current
	termsChanged := false
	if input.NameAr != nil {
		next.NameAr = strings.TrimSpace(*input.NameAr)
		termsChanged = true
	}
	if input.PointsNumerator != nil {
		next.PointsNumerator = *input.PointsNumerator
		termsChanged = true
	}
	if input.EligibleMinorUnitsDenominator != nil {
		next.EligibleMinorUnitsDenominator = *input.EligibleMinorUnitsDenominator
		termsChanged = true
	}
	if input.MinimumPoints != nil {
		next.MinimumPoints = *input.MinimumPoints
		termsChanged = true
	}
	if input.MaximumPointsPerOrder != nil {
		next.MaximumPointsPerOrder = *input.MaximumPointsPerOrder
		termsChanged = true
	}
	if input.Status != nil {
		next.Status = strings.TrimSpace(*input.Status)
	}
	if current.Status == "active" && termsChanged {
		return LoyaltyEarningPolicy{}, ErrActiveLoyaltyPolicyImmutable
	}
	if next.Status != "draft" && next.Status != "active" && next.Status != "paused" && next.Status != "archived" {
		return LoyaltyEarningPolicy{}, ErrInvalid
	}
	if err := validateLoyaltyPolicyTerms(
		next.NameAr,
		next.PointsNumerator,
		next.EligibleMinorUnitsDenominator,
		next.MinimumPoints,
		next.MaximumPointsPerOrder,
	); err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	if next.Status == "active" && current.CreatedByActorID == input.ActorID {
		return LoyaltyEarningPolicy{}, ErrLoyaltyPolicySelfApproval
	}

	tx, err := db.Begin()
	if err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	defer tx.Rollback()
	if next.Status == "active" {
		if _, err := tx.Exec(`
			UPDATE dsh_loyalty_earning_policies
			SET status='paused',version=version+1,updated_at=NOW()
			WHERE status='active' AND id::text<>$1`, id); err != nil {
			return LoyaltyEarningPolicy{}, err
		}
	}
	approvedBy := current.ApprovedByActorID
	var approvedAt any = current.ApprovedAt
	if next.Status == "active" {
		approvedBy = input.ActorID
		approvedAt = time.Now().UTC()
	}
	policy, err := scanLoyaltyPolicy(tx.QueryRow(`
		UPDATE dsh_loyalty_earning_policies SET
			name_ar=$2,points_numerator=$3,eligible_minor_units_denominator=$4,
			minimum_points=$5,maximum_points_per_order=$6,status=$7,
			approved_by_actor_id=$8,approved_at=$9,version=version+1,updated_at=NOW()
		WHERE id::text=$1 AND version=$10
		RETURNING `+loyaltyPolicyColumns,
		id,
		next.NameAr,
		next.PointsNumerator,
		next.EligibleMinorUnitsDenominator,
		next.MinimumPoints,
		next.MaximumPointsPerOrder,
		next.Status,
		approvedBy,
		approvedAt,
		input.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return LoyaltyEarningPolicy{}, ErrLoyaltyPolicyVersionConflict
	}
	if err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	if err := tx.Commit(); err != nil {
		return LoyaltyEarningPolicy{}, err
	}
	before, _ := json.Marshal(current)
	after, _ := json.Marshal(policy)
	_ = WriteAuditEvent(db, "loyalty_earning_policy", policy.ID, input.ActorID, "operator", "update", "", input.CorrelationID, before, after)
	return policy, nil
}
