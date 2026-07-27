package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// EmployeeGovernanceProfile is the reviewed administrative assignment for an
// employee. Identity remains the source of authentication roles and effective
// permissions; these fields describe the approved organisational scope.
type EmployeeGovernanceProfile struct {
	ActorID                 string    `json:"actorId"`
	PositionTitle           string    `json:"positionTitle"`
	JobGrade                string    `json:"jobGrade"`
	EmploymentClass         string    `json:"employmentClass"`
	GuaranteeType           string    `json:"guaranteeType"`
	GuaranteeStatus         string    `json:"guaranteeStatus"`
	GuaranteeReference      string    `json:"guaranteeReference,omitempty"`
	ResponsibilityScopes    []string  `json:"responsibilityScopes"`
	AuthorityScopes         []string  `json:"authorityScopes"`
	ManagedDepartmentCodes  []string  `json:"managedDepartmentCodes"`
	Notes                   string    `json:"notes,omitempty"`
	UpdatedByActorID        string    `json:"updatedByActorId"`
	Version                 int       `json:"version"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

type UpsertEmployeeGovernanceInput struct {
	ExpectedVersion         int      `json:"expectedVersion"`
	PositionTitle           string   `json:"positionTitle"`
	JobGrade                string   `json:"jobGrade"`
	EmploymentClass         string   `json:"employmentClass"`
	GuaranteeType           string   `json:"guaranteeType"`
	GuaranteeStatus         string   `json:"guaranteeStatus"`
	GuaranteeReference      string   `json:"guaranteeReference"`
	ResponsibilityScopes    []string `json:"responsibilityScopes"`
	AuthorityScopes         []string `json:"authorityScopes"`
	ManagedDepartmentCodes  []string `json:"managedDepartmentCodes"`
	Notes                   string   `json:"notes"`
}

func cleanScopeValues(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func validateEmployeeGovernanceInput(input *UpsertEmployeeGovernanceInput) error {
	input.PositionTitle = strings.TrimSpace(input.PositionTitle)
	input.JobGrade = strings.TrimSpace(input.JobGrade)
	input.EmploymentClass = strings.TrimSpace(input.EmploymentClass)
	input.GuaranteeType = strings.TrimSpace(input.GuaranteeType)
	input.GuaranteeStatus = strings.TrimSpace(input.GuaranteeStatus)
	input.GuaranteeReference = strings.TrimSpace(input.GuaranteeReference)
	input.Notes = strings.TrimSpace(input.Notes)
	input.ResponsibilityScopes = cleanScopeValues(input.ResponsibilityScopes)
	input.AuthorityScopes = cleanScopeValues(input.AuthorityScopes)
	input.ManagedDepartmentCodes = cleanScopeValues(input.ManagedDepartmentCodes)
	if input.PositionTitle == "" || input.ExpectedVersion < 0 {
		return ErrInvalidInput
	}
	if !oneOf(input.EmploymentClass, "staff", "coordinator", "department_manager", "executive", "project_manager") {
		return ErrInvalidInput
	}
	if !oneOf(input.GuaranteeType, "none", "personal", "financial", "institutional") {
		return ErrInvalidInput
	}
	if !oneOf(input.GuaranteeStatus, "not_required", "pending", "active", "released", "forfeited") {
		return ErrInvalidInput
	}
	if oneOf(input.GuaranteeStatus, "active", "forfeited") && (input.GuaranteeType == "none" || input.GuaranteeReference == "") {
		return fmt.Errorf("%w: active or forfeited guarantee requires type and reference", ErrInvalidInput)
	}
	return nil
}

func scanEmployeeGovernance(row rowScanner) (EmployeeGovernanceProfile, error) {
	var profile EmployeeGovernanceProfile
	var responsibilityJSON, authorityJSON, departmentsJSON []byte
	err := row.Scan(
		&profile.ActorID, &profile.PositionTitle, &profile.JobGrade, &profile.EmploymentClass,
		&profile.GuaranteeType, &profile.GuaranteeStatus, &profile.GuaranteeReference,
		&responsibilityJSON, &authorityJSON, &departmentsJSON, &profile.Notes,
		&profile.UpdatedByActorID, &profile.Version, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	for raw, target := range map[string]*[]string{
		string(responsibilityJSON): &profile.ResponsibilityScopes,
		string(authorityJSON):      &profile.AuthorityScopes,
		string(departmentsJSON):    &profile.ManagedDepartmentCodes,
	} {
		if err := json.Unmarshal([]byte(raw), target); err != nil {
			return EmployeeGovernanceProfile{}, err
		}
		if *target == nil {
			*target = []string{}
		}
	}
	return profile, nil
}

const employeeGovernanceColumns = `actor_id, position_title, job_grade, employment_class,
	guarantee_type, guarantee_status, guarantee_reference, responsibility_scopes,
	authority_scopes, managed_department_codes, notes, updated_by_actor_id,
	version, created_at, updated_at`

func (r *Repository) EmployeeGovernanceByActorID(ctx context.Context, actorID string) (EmployeeGovernanceProfile, error) {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return EmployeeGovernanceProfile{}, ErrInvalidInput
	}
	profile, err := scanEmployeeGovernance(r.db.QueryRowContext(ctx,
		`SELECT `+employeeGovernanceColumns+` FROM workforce_employee_governance WHERE actor_id=$1`, actorID))
	if errors.Is(err, sql.ErrNoRows) {
		var exists bool
		if queryErr := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workforce_employee_profiles WHERE actor_id=$1)`, actorID).Scan(&exists); queryErr != nil {
			return EmployeeGovernanceProfile{}, queryErr
		}
		if !exists {
			return EmployeeGovernanceProfile{}, ErrNotFound
		}
		_, err = r.db.ExecContext(ctx, `INSERT INTO workforce_employee_governance(actor_id,position_title,updated_by_actor_id)
			SELECT actor_id,COALESCE(role,''),'system' FROM workforce_employee_profiles WHERE actor_id=$1
			ON CONFLICT(actor_id) DO NOTHING`, actorID)
		if err != nil {
			return EmployeeGovernanceProfile{}, err
		}
		return scanEmployeeGovernance(r.db.QueryRowContext(ctx,
			`SELECT `+employeeGovernanceColumns+` FROM workforce_employee_governance WHERE actor_id=$1`, actorID))
	}
	return profile, err
}

func (r *Repository) UpsertEmployeeGovernance(ctx context.Context, actorID, operatorID string, input UpsertEmployeeGovernanceInput) (EmployeeGovernanceProfile, error) {
	actorID = strings.TrimSpace(actorID)
	operatorID = strings.TrimSpace(operatorID)
	if actorID == "" || operatorID == "" {
		return EmployeeGovernanceProfile{}, ErrInvalidInput
	}
	if err := validateEmployeeGovernanceInput(&input); err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	responsibilityJSON, _ := json.Marshal(input.ResponsibilityScopes)
	authorityJSON, _ := json.Marshal(input.AuthorityScopes)
	departmentsJSON, _ := json.Marshal(input.ManagedDepartmentCodes)

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	var employeeExists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workforce_employee_profiles WHERE actor_id=$1)`, actorID).Scan(&employeeExists); err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	if !employeeExists {
		return EmployeeGovernanceProfile{}, ErrNotFound
	}

	var currentVersion int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_employee_governance WHERE actor_id=$1 FOR UPDATE`, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedVersion != 0 {
			return EmployeeGovernanceProfile{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO workforce_employee_governance(
			actor_id,position_title,job_grade,employment_class,guarantee_type,guarantee_status,
			guarantee_reference,responsibility_scopes,authority_scopes,managed_department_codes,
			notes,updated_by_actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12)`,
			actorID, input.PositionTitle, input.JobGrade, input.EmploymentClass, input.GuaranteeType,
			input.GuaranteeStatus, input.GuaranteeReference, string(responsibilityJSON), string(authorityJSON),
			string(departmentsJSON), input.Notes, operatorID)
	} else if err != nil {
		return EmployeeGovernanceProfile{}, err
	} else {
		if currentVersion != input.ExpectedVersion {
			return EmployeeGovernanceProfile{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `UPDATE workforce_employee_governance SET
			position_title=$2,job_grade=$3,employment_class=$4,guarantee_type=$5,
			guarantee_status=$6,guarantee_reference=$7,responsibility_scopes=$8::jsonb,
			authority_scopes=$9::jsonb,managed_department_codes=$10::jsonb,notes=$11,
			updated_by_actor_id=$12,version=version+1,updated_at=now() WHERE actor_id=$1`,
			actorID, input.PositionTitle, input.JobGrade, input.EmploymentClass, input.GuaranteeType,
			input.GuaranteeStatus, input.GuaranteeReference, string(responsibilityJSON), string(authorityJSON),
			string(departmentsJSON), input.Notes, operatorID)
	}
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	if err := tx.Commit(); err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	return r.EmployeeGovernanceByActorID(ctx, actorID)
}
