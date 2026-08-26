package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/lib/pq"

	"workforce-api/internal/identityclient"
)

var sovereignDepartmentPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)
var sovereignPermissionBundlePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)

type SovereignAssignment struct {
	ActorID          string    `json:"actorId"`
	PermissionBundle string    `json:"permissionBundle"`
	DepartmentScope  string    `json:"departmentScope"`
	StartsOn         string    `json:"startsOn"`
	EndsOn           string    `json:"endsOn,omitempty"`
	AssignmentStatus string    `json:"assignmentStatus"`
	CreatedByActorID string    `json:"createdByActorId"`
	UpdatedByActorID string    `json:"updatedByActorId"`
	Version          int       `json:"version"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type SovereignLeadershipRecord struct {
	Employee   Person                    `json:"employee"`
	Governance EmployeeGovernanceProfile `json:"governance"`
	Assignment SovereignAssignment       `json:"assignment"`
}

type CreateSovereignLeaderInput struct {
	FullNameAr           string   `json:"fullNameAr"`
	FullNameEn           string   `json:"fullNameEn"`
	Username             string   `json:"username"`
	PhoneE164            string   `json:"phoneE164"`
	Department           string   `json:"department"`
	PositionTitle        string   `json:"positionTitle"`
	JobGrade             string   `json:"jobGrade"`
	EmploymentClass      string   `json:"employmentClass"`
	PermissionBundle     string   `json:"permissionBundle"`
	OfficeLocation       string   `json:"officeLocation"`
	SupervisorActorID    string   `json:"supervisorActorId"`
	EngagementStartDate  string   `json:"engagementStartDate"`
	AssignmentStartsOn   string   `json:"assignmentStartsOn"`
	AssignmentEndsOn     string   `json:"assignmentEndsOn"`
	GuaranteeType        string   `json:"guaranteeType"`
	GuaranteeStatus      string   `json:"guaranteeStatus"`
	GuaranteeReference   string   `json:"guaranteeReference"`
	ResponsibilityScopes []string `json:"responsibilityScopes"`
	Notes                string   `json:"notes"`
}

type SovereignLeadershipCreationResult struct {
	Leadership SovereignLeadershipRecord     `json:"leadership"`
	Activation identityclient.ActivationCode `json:"activation"`
}

type DepartmentEmployeeCreationResult struct {
	Employee   Person                        `json:"employee"`
	Activation identityclient.ActivationCode `json:"activation"`
}

func normalizeSovereignDepartment(raw string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(raw))
	value = strings.ReplaceAll(value, " ", "-")
	if !sovereignDepartmentPattern.MatchString(value) {
		return "", ErrInvalidInput
	}
	return value, nil
}

func normalizeSovereignPermissionBundle(raw string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(raw))
	if !sovereignPermissionBundlePattern.MatchString(value) {
		return "", ErrInvalidInput
	}
	return value, nil
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == expected {
			return true
		}
	}
	return false
}

// resolveLeadershipBundle delegates bundle existence and applicability to
// Identity's canonical registry. Workforce never expands the bundle into
// executable authority scopes.
func (s *Service) resolveLeadershipBundle(ctx context.Context, code, employmentClass, department string) (identityclient.EmployeePermissionBundleDescriptor, error) {
	code, err := normalizeSovereignPermissionBundle(code)
	if err != nil {
		return identityclient.EmployeePermissionBundleDescriptor{}, err
	}
	employmentClass = strings.TrimSpace(employmentClass)
	bundles, err := s.identity.EmployeePermissionBundles(ctx)
	if err != nil {
		return identityclient.EmployeePermissionBundleDescriptor{}, err
	}
	for _, bundle := range bundles {
		if bundle.Code != code {
			continue
		}
		if !containsString(bundle.AllowedEmploymentClasses, employmentClass) {
			return identityclient.EmployeePermissionBundleDescriptor{}, ErrInvalidInput
		}
		if bundle.DefaultDepartmentScope != "" && !bundle.DepartmentSelectionAllowed && department != bundle.DefaultDepartmentScope {
			return identityclient.EmployeePermissionBundleDescriptor{}, ErrInvalidInput
		}
		return bundle, nil
	}
	return identityclient.EmployeePermissionBundleDescriptor{}, ErrInvalidInput
}

func (r *Repository) SovereignAssignmentByActorID(ctx context.Context, actorID string) (SovereignAssignment, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return SovereignAssignment{}, err
	}
	var assignment SovereignAssignment
	err = r.db.QueryRowContext(ctx, `
		SELECT actor_id,permission_bundle,department_scope,starts_on::text,
		       COALESCE(ends_on::text,''),assignment_status,created_by_actor_id,
		       updated_by_actor_id,version,created_at,updated_at
		FROM workforce_sovereign_leadership_assignments WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, strings.TrimSpace(actorID)).Scan(
		&assignment.ActorID, &assignment.PermissionBundle, &assignment.DepartmentScope,
		&assignment.StartsOn, &assignment.EndsOn, &assignment.AssignmentStatus,
		&assignment.CreatedByActorID, &assignment.UpdatedByActorID, &assignment.Version,
		&assignment.CreatedAt, &assignment.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return SovereignAssignment{}, ErrNotFound
	}
	return assignment, err
}

func (r *Repository) UpsertSovereignAssignment(ctx context.Context, actorID, operatorID string, expectedVersion int, bundle, department, startsOn, endsOn string) (SovereignAssignment, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return SovereignAssignment{}, err
	}
	actorID = strings.TrimSpace(actorID)
	operatorID = strings.TrimSpace(operatorID)
	bundle, bundleErr := normalizeSovereignPermissionBundle(bundle)
	department, err = normalizeSovereignDepartment(department)
	if err != nil || bundleErr != nil || actorID == "" || operatorID == "" || expectedVersion < 0 {
		return SovereignAssignment{}, ErrInvalidInput
	}
	if strings.TrimSpace(startsOn) == "" {
		startsOn = time.Now().UTC().Format("2006-01-02")
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return SovereignAssignment{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	var currentVersion int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_sovereign_leadership_assignments WHERE operator_context_id=$1 AND actor_id=$2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if expectedVersion != 0 {
			return SovereignAssignment{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `
			INSERT INTO workforce_sovereign_leadership_assignments(
				operator_context_id,actor_id,permission_bundle,department_scope,starts_on,ends_on,
				assignment_status,created_by_actor_id,updated_by_actor_id)
			VALUES($1,$2,$3,$4,$5::date,NULLIF($6,'')::date,'active',$7,$7)`,
			operatorContextID, actorID, bundle, department, startsOn, strings.TrimSpace(endsOn), operatorID)
	} else if err != nil {
		return SovereignAssignment{}, err
	} else {
		if currentVersion != expectedVersion {
			return SovereignAssignment{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `
			UPDATE workforce_sovereign_leadership_assignments
			SET permission_bundle=$2,department_scope=$3,starts_on=$4::date,
			    ends_on=NULLIF($5,'')::date,assignment_status='active',
			    updated_by_actor_id=$6,version=version+1,updated_at=now()
			WHERE operator_context_id=$7 AND actor_id=$1`, actorID, bundle, department, startsOn, strings.TrimSpace(endsOn), operatorID, operatorContextID)
	}
	if err != nil {
		return SovereignAssignment{}, ErrInvalidInput
	}
	if err := tx.Commit(); err != nil {
		return SovereignAssignment{}, err
	}
	return r.SovereignAssignmentByActorID(ctx, actorID)
}

func (r *Repository) ListSovereignLeadership(ctx context.Context) ([]SovereignLeadershipRecord, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, personSelect+`
		JOIN workforce_sovereign_leadership_assignments a ON a.operator_context_id=p.operator_context_id AND a.actor_id=p.actor_id
		WHERE a.assignment_status='active'
		  AND a.operator_context_id=$1
		  AND a.starts_on <= current_date
		  AND (a.ends_on IS NULL OR a.ends_on >= current_date)
		ORDER BY p.created_at DESC`, operatorContextID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	records := []SovereignLeadershipRecord{}
	for rows.Next() {
		person, err := scanPerson(rows)
		if err != nil {
			return nil, err
		}
		governance, err := r.EmployeeGovernanceByActorID(ctx, person.ActorID)
		if err != nil {
			return nil, err
		}
		assignment, err := r.SovereignAssignmentByActorID(ctx, person.ActorID)
		if err != nil {
			return nil, err
		}
		records = append(records, SovereignLeadershipRecord{Employee: person, Governance: governance, Assignment: assignment})
	}
	return records, rows.Err()
}

func (r *Repository) ListEmployeesForDepartments(ctx context.Context, departments []string, filter ListFilter) ([]Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	clean := make([]string, 0, len(departments))
	for _, department := range departments {
		normalized, err := normalizeSovereignDepartment(department)
		if err != nil {
			return nil, err
		}
		clean = append(clean, normalized)
	}
	clauses := []string{"e.actor_id IS NOT NULL", "p.operator_context_id = $1"}
	args := []any{operatorContextID}
	if len(clean) > 0 {
		args = append(args, pq.Array(clean))
		clauses = append(clauses, "LOWER(REPLACE(e.department,' ','-')) = ANY($"+itoa(len(args)+0)+")")
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		clauses = append(clauses, "p.engagement_status = $"+itoa(len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+strings.TrimSpace(filter.Query)+"%")
		pos := itoa(len(args))
		clauses = append(clauses, "(p.full_name_ar ILIKE $"+pos+" OR COALESCE(p.full_name_en,'') ILIKE $"+pos+" OR p.workforce_code ILIKE $"+pos+")")
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	args = append(args, limit)
	limitPos := itoa(len(args))
	args = append(args, max(filter.Offset, 0))
	offsetPos := itoa(len(args))
	query := personSelect + " WHERE " + strings.Join(clauses, " AND ") + " ORDER BY p.created_at DESC LIMIT $" + limitPos + " OFFSET $" + offsetPos
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	people := []Person{}
	for rows.Next() {
		person, err := scanPerson(rows)
		if err != nil {
			return nil, err
		}
		people = append(people, person)
	}
	return people, rows.Err()
}

func itoa(value int) string {
	const digits = "0123456789"
	if value == 0 {
		return "0"
	}
	buffer := [20]byte{}
	index := len(buffer)
	for value > 0 {
		index--
		buffer[index] = digits[value%10]
		value /= 10
	}
	return string(buffer[index:])
}

func (s *Service) CreateSovereignLeader(ctx context.Context, operator Operator, input CreateSovereignLeaderInput, idempotencyKey, correlationID string) (SovereignLeadershipCreationResult, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	input.PositionTitle = strings.TrimSpace(input.PositionTitle)
	input.PermissionBundle = strings.TrimSpace(input.PermissionBundle)
	input.EmploymentClass = strings.TrimSpace(input.EmploymentClass)
	department, err := normalizeSovereignDepartment(input.Department)
	if err != nil || input.FullNameAr == "" || input.Username == "" || input.PhoneE164 == "" || input.PositionTitle == "" {
		return SovereignLeadershipCreationResult{}, false, ErrInvalidInput
	}
	input.Department = department
	bundle, err := s.resolveLeadershipBundle(ctx, input.PermissionBundle, input.EmploymentClass, department)
	if err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}
	input.PermissionBundle = bundle.Code
	if input.GuaranteeType == "" {
		input.GuaranteeType = "none"
	}
	if input.GuaranteeStatus == "" {
		input.GuaranteeStatus = "not_required"
	}
	if input.AssignmentStartsOn == "" {
		input.AssignmentStartsOn = time.Now().UTC().Format("2006-01-02")
	}
	if err := s.validateSupervisor(ctx, input.SupervisorActorID, "", "employee"); err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}

	requestHash := hashRequest(input)
	if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "create_sovereign_leader", idempotencyKey, requestHash); err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	} else if replayed {
		var result SovereignLeadershipCreationResult
		if err := json.Unmarshal(stored, &result); err != nil {
			return SovereignLeadershipCreationResult{}, false, err
		}
		return result, true, nil
	}

	workforceCode, err := s.repo.NextWorkforceCode(ctx, "employee")
	if err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}
	if s.identity == nil {
		return SovereignLeadershipCreationResult{}, false, identityclient.ErrUnavailable
	}
	actor, err := s.identity.ProvisionEmployee(ctx, identityclient.EmployeeProvisionInput{
		Username: input.Username, PhoneE164: input.PhoneE164,
		PermissionBundle: input.PermissionBundle, DepartmentScope: department,
	})
	if err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return SovereignLeadershipCreationResult{}, false, identityclient.ErrInvalidActor
	}
	actorID := actor.ActorID
	identityCreated := actor.Created
	compensate := func() {
		if !identityCreated {
			return
		}
		if compensationErr := s.identity.Deprovision(ctx, actorID); compensationErr != nil {
			log.Printf("[workforce] leadership identity compensation failed actor=%s: %v", actorID, compensationErr)
		}
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
		if existing.EmployeeProfile == nil {
			return SovereignLeadershipCreationResult{}, false, ErrWorkforceKindConflict
		}
		return SovereignLeadershipCreationResult{}, false, identityclient.ErrProvisionConflict
	}

	if actorID == "" {
		return SovereignLeadershipCreationResult{}, false, ErrInvalidInput
	}

	person, personErr := s.repo.PersonByActorID(ctx, actorID)
	if errors.Is(personErr, ErrNotFound) {
		person, personErr = s.repo.CreateEmployee(ctx, actorID, workforceCode, CreateEmployeeInput{
			FullNameAr: input.FullNameAr, FullNameEn: input.FullNameEn, Username: input.Username, PhoneE164: input.PhoneE164,
			EngagementType: "employee", EngagementStartDate: input.EngagementStartDate,
			Department: department, Role: input.PositionTitle, OfficeLocation: input.OfficeLocation,
			SupervisorActorID: input.SupervisorActorID,
		})
	}
	if personErr != nil {
		compensate()
		return SovereignLeadershipCreationResult{}, false, personErr
	}

	governanceVersion := 0
	if existing, err := s.repo.EmployeeGovernanceByActorID(ctx, actorID); err == nil {
		governanceVersion = existing.Version
	} else if !errors.Is(err, ErrNotFound) {
		compensate()
		return SovereignLeadershipCreationResult{}, false, err
	}
	governance, err := s.repo.UpsertEmployeeGovernance(ctx, actorID, operator.ActorID, operator.Role, correlationID, idempotencyKey+":governance", UpsertEmployeeGovernanceInput{
		ExpectedVersion: governanceVersion, PositionTitle: input.PositionTitle, JobGrade: input.JobGrade,
		EmploymentClass: input.EmploymentClass, GuaranteeType: input.GuaranteeType,
		GuaranteeStatus: input.GuaranteeStatus, GuaranteeReference: input.GuaranteeReference,
		ResponsibilityScopes:   cleanScopeValues(input.ResponsibilityScopes),
		ManagedDepartmentCodes: []string{department}, Notes: input.Notes,
	})
	if err != nil {
		compensate()
		return SovereignLeadershipCreationResult{}, false, err
	}
	assignmentVersion := 0
	if existing, err := s.repo.SovereignAssignmentByActorID(ctx, actorID); err == nil {
		assignmentVersion = existing.Version
	}
	assignment, err := s.repo.UpsertSovereignAssignment(ctx, actorID, operator.ActorID, assignmentVersion,
		input.PermissionBundle, department, input.AssignmentStartsOn, input.AssignmentEndsOn)
	if err != nil {
		compensate()
		return SovereignLeadershipCreationResult{}, false, err
	}
	activation, err := s.identity.IssueActivation(ctx, actorID, operator.ActorID, "employee", "webapp", idempotencyKey+":activation", correlationID)
	if err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}
	result := SovereignLeadershipCreationResult{
		Leadership: SovereignLeadershipRecord{Employee: person, Governance: governance, Assignment: assignment},
		Activation: activation,
	}
	if err := s.repo.RecordAudit(ctx, operator.OperatorContextID, operator.ActorID, operator.Role, actorID,
		"sovereign_leadership.created", "create_sovereign_leader", nil, result.Leadership, input.Notes, correlationID, idempotencyKey); err != nil {
		return SovereignLeadershipCreationResult{}, false, err
	}
	if encoded, err := json.Marshal(result); err == nil {
		_ = s.repo.StoreIdempotentResponse(ctx, operator.ActorID, "create_sovereign_leader", idempotencyKey, requestHash, encoded)
	}
	return result, false, nil
}

func (s *Service) CreateDepartmentEmployee(ctx context.Context, operator Operator, input CreateEmployeeInput, idempotencyKey, correlationID string) (DepartmentEmployeeCreationResult, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	department, err := normalizeSovereignDepartment(input.Department)
	if err != nil || input.FullNameAr == "" || input.Username == "" || input.PhoneE164 == "" || strings.TrimSpace(input.Role) == "" {
		return DepartmentEmployeeCreationResult{}, false, ErrInvalidInput
	}
	input.Department = department
	input.EngagementType = "employee"
	if err := s.validateSupervisor(ctx, input.SupervisorActorID, "", "employee"); err != nil {
		return DepartmentEmployeeCreationResult{}, false, err
	}
	requestHash := hashRequest(input)
	if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "create_department_employee", idempotencyKey, requestHash); err != nil {
		return DepartmentEmployeeCreationResult{}, false, err
	} else if replayed {
		var result DepartmentEmployeeCreationResult
		if err := json.Unmarshal(stored, &result); err != nil {
			return DepartmentEmployeeCreationResult{}, false, err
		}
		return result, true, nil
	}
	workforceCode, err := s.repo.NextWorkforceCode(ctx, "employee")
	if err != nil {
		return DepartmentEmployeeCreationResult{}, false, err
	}
	if s.identity == nil {
		return DepartmentEmployeeCreationResult{}, false, identityclient.ErrUnavailable
	}
	actor, err := s.identity.ProvisionEmployee(ctx, identityclient.EmployeeProvisionInput{
		Username: input.Username, PhoneE164: input.PhoneE164,
		PermissionBundle: "staff", DepartmentScope: department,
	})
	if err != nil {
		return DepartmentEmployeeCreationResult{}, false, err
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return DepartmentEmployeeCreationResult{}, false, identityclient.ErrInvalidActor
	}
	actorID := actor.ActorID
	identityCreated := actor.Created
	compensate := func() {
		if !identityCreated {
			return
		}
		if compensationErr := s.identity.Deprovision(ctx, actorID); compensationErr != nil {
			log.Printf("[workforce] employee identity compensation failed actor=%s: %v", actorID, compensationErr)
		}
	}
	person, personErr := s.repo.PersonByActorID(ctx, actorID)
	if errors.Is(personErr, ErrNotFound) {
		person, personErr = s.repo.CreateEmployee(ctx, actorID, workforceCode, input)
	} else if personErr == nil && person.EmployeeProfile == nil {
		return DepartmentEmployeeCreationResult{}, false, ErrWorkforceKindConflict
	}
	if personErr != nil {
		compensate()
		return DepartmentEmployeeCreationResult{}, false, personErr
	}
	activation, err := s.identity.IssueActivation(ctx, actorID, operator.ActorID, "employee", "webapp", idempotencyKey+":activation", correlationID)
	if err != nil {
		compensate()
		return DepartmentEmployeeCreationResult{}, false, err
	}
	result := DepartmentEmployeeCreationResult{Employee: person, Activation: activation}
	if err := s.repo.RecordAudit(ctx, operator.OperatorContextID, operator.ActorID, operator.Role, actorID,
		"department_employee.created", "create_department_employee", nil, person, "", correlationID, idempotencyKey); err != nil {
		return DepartmentEmployeeCreationResult{}, false, err
	}
	if encoded, err := json.Marshal(result); err == nil {
		_ = s.repo.StoreIdempotentResponse(ctx, operator.ActorID, "create_department_employee", idempotencyKey, requestHash, encoded)
	}
	return result, false, nil
}
