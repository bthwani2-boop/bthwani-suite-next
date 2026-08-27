package workforce

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"workforce-api/internal/dshclient"
	"workforce-api/internal/identityclient"
)

var (
	ErrStatusNotIssuable     = errors.New("engagement status does not allow activation issuance")
	ErrProfileIncomplete     = errors.New("profile is incomplete")
	ErrSuspended             = errors.New("engagement suspended")
	ErrInvalidInput          = errors.New("invalid input")
	ErrInvalidSupervisor     = errors.New("supervisor actor is missing, inactive, or invalid")
	ErrWorkforceKindConflict = errors.New("actor already holds a profile of another workforce kind")
	ErrActivationReplay      = errors.New("activation was already issued; submit a new idempotency key")
)

// Service orchestrates the workforce lifecycle across Workforce (sovereign
// profile) and Identity (auth actor). All Identity access goes through the
// internal service-token API; the frontend never references phones directly.
type Service struct {
	repo     *Repository
	identity *identityclient.Client
	dsh      *dshclient.Client
}

func NewService(repo *Repository, identity *identityclient.Client, dsh *dshclient.Client) *Service {
	return &Service{repo: repo, identity: identity, dsh: dsh}
}

// validateSupervisor confirms a supervisor actor (when supplied) exists and
// is active, has the correct supervisor role, and is not the workforce member itself.
func (s *Service) validateSupervisor(ctx context.Context, supervisorActorID, workforceActorID, workforceKind string) error {
	if supervisorActorID == "" {
		return nil
	}
	if supervisorActorID == workforceActorID {
		return ErrInvalidSupervisor
	}
	actor, err := s.identity.Actor(ctx, supervisorActorID)
	if err != nil {
		if errors.Is(err, identityclient.ErrActorNotFound) {
			return ErrInvalidSupervisor
		}
		return err
	}
	if !actor.IsActive() {
		return ErrInvalidSupervisor
	}
	expectedRole := "workforce.supervise.field"
	if workforceKind == "captain" {
		expectedRole = "workforce.supervise.captain"
	} else if workforceKind == "employee" {
		expectedRole = "workforce.supervise.employee"
	}
	hasRole := false
	for _, r := range actor.Roles {
		if r == expectedRole {
			hasRole = true
			break
		}
	}
	if !hasRole {
		return ErrInvalidSupervisor
	}
	return nil
}

// SupervisorCandidate is the operator-facing projection returned by the
// supervisor picker (masked phone, no raw actor plumbing exposed).
type SupervisorCandidate struct {
	ActorID  string `json:"actorId"`
	Username string `json:"username"`
	Phone    string `json:"phoneMasked,omitempty"`
	Active   bool   `json:"active"`
}

// SearchSupervisors backs the HR/Partners supervisor picker: it never
// returns raw actor IDs for free-text entry, only a searchable, validated
// candidate list.
func (s *Service) SearchSupervisors(ctx context.Context, kind, query string) ([]SupervisorCandidate, error) {
	expectedRole := "workforce.supervise.field"
	if kind == "captain" {
		expectedRole = "workforce.supervise.captain"
	} else if kind == "employee" {
		expectedRole = "workforce.supervise.employee"
	}
	actors, _, err := s.identity.SearchActors(ctx, expectedRole, query, "")
	if err != nil {
		return nil, err
	}
	candidates := make([]SupervisorCandidate, 0, len(actors))
	for _, actor := range actors {
		candidates = append(candidates, SupervisorCandidate{
			ActorID:  actor.ActorID,
			Username: actor.Username,
			Phone:    maskPhone(actor.PhoneE164),
			Active:   actor.IsActive(),
		})
	}
	return candidates, nil
}

// ensureServiceZoneCity mirrors the DSH platform zone's city into the local
// workforce_cities table so the existing FK on city_code keeps working even
// though the operator now picks a zone, not a Workforce-owned city.
func (s *Service) ensureServiceZoneCity(ctx context.Context, cityCode string) error {
	if cityCode == "" {
		return nil
	}
	return s.repo.EnsureCity(ctx, cityCode, cityCode)
}

// CreateFieldAgent records a durable local intent before provisioning the
// Identity actor. The durable case records the remote outcome and is completed
// atomically with the sovereign profile, audit, and idempotent response, so a
// crash never relies on best-effort deletion of a remotely committed actor.
// The workforce code is generated server-side and never accepted from the
// caller.
func (s *Service) CreateFieldAgent(ctx context.Context, operator Operator, input CreateFieldAgentInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	if input.EngagementType == "" {
		input.EngagementType = "independent_contractor"
	}
	if input.FullNameAr == "" || input.Username == "" || input.PhoneE164 == "" {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" {
		return Person{}, false, ErrInvalidInput
	}
	if err := s.validateSupervisor(ctx, input.SupervisorActorID, "", "field"); err != nil {
		return Person{}, false, err
	}
	zone, err := s.dsh.ValidateZone(ctx, input.ServiceZoneID, operator.Token)
	if err != nil {
		if errors.Is(err, dshclient.ErrZoneInactive) || errors.Is(err, dshclient.ErrZoneNotFound) {
			return Person{}, false, ErrInvalidInput
		}
		return Person{}, false, err
	}
	if err := s.ensureServiceZoneCity(ctx, zone.ServiceAreaCode); err != nil {
		return Person{}, false, err
	}

	requestHash := hashRequest(input)
	if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "create_field_agent", idempotencyKey, requestHash); err != nil {
		return Person{}, false, err
	} else if replayed {
		var person Person
		if err := json.Unmarshal(stored, &person); err != nil {
			return Person{}, false, err
		}
		return person, true, nil
	}

	workforceCode, err := s.repo.NextWorkforceCode(ctx, "field")
	if err != nil {
		return Person{}, false, err
	}
	boundaryCase, err := s.repo.beginIdentityBoundaryCase(ctx, identityBoundaryCaseInput{
		OperatorContextID: operator.OperatorContextID, Operation: "create_field_agent", WorkforceKind: "field",
		WorkforceCode: workforceCode, RequestHash: requestHash, IdempotencyKey: idempotencyKey,
		RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role, CorrelationID: correlationID,
		Payload: fieldIdentityBoundaryPayload{Input: input, CityCode: zone.ServiceAreaCode},
	})
	if err != nil {
		return Person{}, false, err
	}
	if boundaryCase.WorkforceCode != "" {
		workforceCode = boundaryCase.WorkforceCode
	}

	if s.identity == nil {
		return Person{}, false, identityclient.ErrUnavailable
	}
	actor, err := s.identity.Provision(ctx, identityclient.ProvisionInput{
		Username:  input.Username,
		PhoneE164: input.PhoneE164,
		Role:      "field",
	})
	if err != nil {
		return Person{}, false, err
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return Person{}, false, identityclient.ErrInvalidActor
	}
	actorID := actor.ActorID
	if err := s.repo.markIdentityBoundaryRemote(ctx, boundaryCase.ID, actorID, workforceCode, actor); err != nil {
		return Person{}, false, err
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
		if existing.FieldProfile == nil {
			// The actor exists under another workforce kind: a field replay
			// must never surface a foreign profile as its own (root #10).
			return Person{}, false, ErrWorkforceKindConflict
		}
		return existing, true, nil
	}

	// One governed transaction: sovereign profile rows + audit + idempotent
	// response commit atomically, or nothing commits at all.
	var person Person
	unitErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = createPersonTx(ctx, tx, actorID, workforceCode, zone.ServiceAreaCode, input)
		if err != nil {
			return err
		}
		encoded, err := json.Marshal(person)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "field_agent.created", Operation: "create_field_agent",
			ToState: person, CorrelationID: correlationID, IdempotencyKey: idempotencyKey,
		}); err != nil {
			return err
		}
		if err := storeIdempotentResponseTx(ctx, tx, operator.ActorID, "create_field_agent", idempotencyKey, requestHash, encoded); err != nil {
			return err
		}
		return completeIdentityBoundaryTx(ctx, tx, boundaryCase.ID)

	})
	if unitErr != nil {
		if errors.Is(unitErr, ErrDuplicateWorkforceCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
				if existing.FieldProfile == nil {
					return Person{}, false, ErrWorkforceKindConflict
				}
				return existing, true, nil
			}
		}
		// The remote actor is deliberately retained. The durable case is the
		// recovery authority; deleting the actor here would recreate the
		// remote-success/local-failure crash window.
		return Person{}, false, unitErr

	}
	return person, false, nil
}

func (s *Service) CreateCaptain(ctx context.Context, operator Operator, input CreateCaptainInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	if input.EngagementType == "" {
		input.EngagementType = "independent_contractor"
	}
	if input.FullNameAr == "" || input.Username == "" || input.PhoneE164 == "" {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" && input.EngagementType != "employee" {
		return Person{}, false, ErrInvalidInput
	}
	if err := s.validateSupervisor(ctx, input.SupervisorActorID, "", "captain"); err != nil {
		return Person{}, false, err
	}
	zone, err := s.dsh.ValidateZone(ctx, input.ServiceZoneID, operator.Token)
	if err != nil {
		if errors.Is(err, dshclient.ErrZoneInactive) || errors.Is(err, dshclient.ErrZoneNotFound) {
			return Person{}, false, ErrInvalidInput
		}
		return Person{}, false, err
	}
	if err := s.ensureServiceZoneCity(ctx, zone.ServiceAreaCode); err != nil {
		return Person{}, false, err
	}

	requestHash := hashRequest(input)
	if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "create_captain", idempotencyKey, requestHash); err != nil {
		return Person{}, false, err
	} else if replayed {
		var person Person
		if err := json.Unmarshal(stored, &person); err != nil {
			return Person{}, false, err
		}
		return person, true, nil
	}

	workforceCode, err := s.repo.NextWorkforceCode(ctx, "captain")
	if err != nil {
		return Person{}, false, err
	}
	boundaryCase, err := s.repo.beginIdentityBoundaryCase(ctx, identityBoundaryCaseInput{
		OperatorContextID: operator.OperatorContextID, Operation: "create_captain", WorkforceKind: "captain",
		WorkforceCode: workforceCode, RequestHash: requestHash, IdempotencyKey: idempotencyKey,
		RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role, CorrelationID: correlationID,
		Payload: captainIdentityBoundaryPayload{Input: input, CityCode: zone.ServiceAreaCode},
	})
	if err != nil {
		return Person{}, false, err
	}
	if boundaryCase.WorkforceCode != "" {
		workforceCode = boundaryCase.WorkforceCode
	}
	if s.identity == nil {
		return Person{}, false, identityclient.ErrUnavailable
	}
	actor, err := s.identity.Provision(ctx, identityclient.ProvisionInput{
		Username: input.Username, PhoneE164: input.PhoneE164, Role: "captain",
	})
	if err != nil {
		return Person{}, false, err
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return Person{}, false, identityclient.ErrInvalidActor
	}
	actorID := actor.ActorID
	if err := s.repo.markIdentityBoundaryRemote(ctx, boundaryCase.ID, actorID, workforceCode, actor); err != nil {
		return Person{}, false, err
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
		if existing.CaptainProfile == nil {
			return Person{}, false, ErrWorkforceKindConflict
		}
		return existing, true, nil
	}

	// One governed transaction: sovereign captain rows + audit + idempotent
	// response commit atomically.
	var person Person
	unitErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = createCaptainTx(ctx, tx, actorID, workforceCode, zone.ServiceAreaCode, input)
		if err != nil {
			return err
		}
		encoded, err := json.Marshal(person)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "captain.created", Operation: "create_captain",
			ToState: person, CorrelationID: correlationID, IdempotencyKey: idempotencyKey,
		}); err != nil {
			return err
		}
		if err := storeIdempotentResponseTx(ctx, tx, operator.ActorID, "create_captain", idempotencyKey, requestHash, encoded); err != nil {
			return err
		}
		return completeIdentityBoundaryTx(ctx, tx, boundaryCase.ID)

	})
	if unitErr != nil {
		if errors.Is(unitErr, ErrDuplicateWorkforceCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
				if existing.CaptainProfile == nil {
					return Person{}, false, ErrWorkforceKindConflict
				}
				return existing, true, nil
			}
		}
		// The durable identity-boundary case remains the recovery authority;
		// best-effort remote deletion is not a valid final design.
		return Person{}, false, unitErr
	}
	return person, false, nil
}

func (s *Service) CreateEmployee(ctx context.Context, operator Operator, input CreateEmployeeInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.Username = strings.TrimSpace(input.Username)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	if input.EngagementType == "" {
		input.EngagementType = "employee"
	}
	if input.FullNameAr == "" || input.Username == "" || input.PhoneE164 == "" {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" && input.EngagementType != "employee" {
		return Person{}, false, ErrInvalidInput
	}
	if err := s.validateSupervisor(ctx, input.SupervisorActorID, "", "employee"); err != nil {
		return Person{}, false, err
	}

	requestHash := hashRequest(input)
	if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "create_employee", idempotencyKey, requestHash); err != nil {
		return Person{}, false, err
	} else if replayed {
		var person Person
		if err := json.Unmarshal(stored, &person); err != nil {
			return Person{}, false, err
		}
		return person, true, nil
	}

	workforceCode, err := s.repo.NextWorkforceCode(ctx, "employee")
	if err != nil {
		return Person{}, false, err
	}
	boundaryCase, err := s.repo.beginIdentityBoundaryCase(ctx, identityBoundaryCaseInput{
		OperatorContextID: operator.OperatorContextID, Operation: "create_employee", WorkforceKind: "employee",
		WorkforceCode: workforceCode, RequestHash: requestHash, IdempotencyKey: idempotencyKey,
		RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role, CorrelationID: correlationID,
		Payload: employeeIdentityBoundaryPayload{Input: input, PermissionBundle: input.PermissionBundle},
	})
	if err != nil {
		return Person{}, false, err
	}
	if boundaryCase.WorkforceCode != "" {
		workforceCode = boundaryCase.WorkforceCode
	}

	if s.identity == nil {
		return Person{}, false, identityclient.ErrUnavailable
	}
	actor, err := s.identity.ProvisionEmployee(ctx, identityclient.EmployeeProvisionInput{
		Username: input.Username, PhoneE164: input.PhoneE164,
		PermissionBundle: input.PermissionBundle, DepartmentScope: input.Department,
	})
	if err != nil {
		return Person{}, false, err
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return Person{}, false, identityclient.ErrInvalidActor
	}
	actorID := actor.ActorID
	if err := s.repo.markIdentityBoundaryRemote(ctx, boundaryCase.ID, actorID, workforceCode, actor); err != nil {
		return Person{}, false, err
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
		if existing.EmployeeProfile == nil {
			return Person{}, false, ErrWorkforceKindConflict
		}
		return existing, true, nil
	}

	// One governed transaction: sovereign employee rows + audit + idempotent
	// response commit atomically.
	var person Person
	unitErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = createEmployeeTx(ctx, tx, actorID, workforceCode, input)
		if err != nil {
			return err
		}
		encoded, err := json.Marshal(person)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "employee.created", Operation: "create_employee",
			ToState: person, CorrelationID: correlationID, IdempotencyKey: idempotencyKey,
		}); err != nil {
			return err
		}
		if err := storeIdempotentResponseTx(ctx, tx, operator.ActorID, "create_employee", idempotencyKey, requestHash, encoded); err != nil {
			return err
		}
		return completeIdentityBoundaryTx(ctx, tx, boundaryCase.ID)

	})
	if unitErr != nil {
		if errors.Is(unitErr, ErrDuplicateWorkforceCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actorID); lookupErr == nil {
				if existing.EmployeeProfile == nil {
					return Person{}, false, ErrWorkforceKindConflict
				}
				return existing, true, nil
			}
		}
		// The durable identity-boundary case remains the recovery authority;
		// best-effort remote deletion is not a valid final design.
		return Person{}, false, unitErr
	}
	return person, false, nil
}

type Operator struct {
	ActorID           string
	Role              string
	Token             string
	OperatorContextID string
}

// UpdateFieldAgent applies sovereign edits under optimistic locking.
func (s *Service) UpdateFieldAgent(ctx context.Context, operator Operator, actorID string, input UpdateFieldAgentInput, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if input.EngagementType != nil && *input.EngagementType != "independent_contractor" {
		return Person{}, ErrInvalidInput
	}
	if input.SupervisorActorID != nil {
		if err := s.validateSupervisor(ctx, *input.SupervisorActorID, actorID, "field"); err != nil {
			return Person{}, err
		}
	}
	var derivedCityCode *string
	if input.ServiceZoneID != nil {
		zone, err := s.dsh.ValidateZone(ctx, *input.ServiceZoneID, operator.Token)
		if err != nil {
			if errors.Is(err, dshclient.ErrZoneInactive) || errors.Is(err, dshclient.ErrZoneNotFound) {
				return Person{}, ErrInvalidInput
			}
			return Person{}, err
		}
		if err := s.ensureServiceZoneCity(ctx, zone.ServiceAreaCode); err != nil {
			return Person{}, err
		}
		derivedCityCode = &zone.ServiceAreaCode
	}
	var person Person
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = updatePersonTx(ctx, tx, actorID, derivedCityCode, input)
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "field_agent.updated", Operation: "update_field_agent",
			FromState: before, ToState: person, CorrelationID: correlationID,
		})
	}); err != nil {
		return Person{}, err
	}
	return person, nil
}

func (s *Service) UpdateCaptain(ctx context.Context, operator Operator, actorID string, input UpdateCaptainInput, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if input.SupervisorActorID != nil {
		if err := s.validateSupervisor(ctx, *input.SupervisorActorID, actorID, "captain"); err != nil {
			return Person{}, err
		}
	}
	var derivedCityCode *string
	if input.ServiceZoneID != nil {
		zone, err := s.dsh.ValidateZone(ctx, *input.ServiceZoneID, operator.Token)
		if err != nil {
			if errors.Is(err, dshclient.ErrZoneInactive) || errors.Is(err, dshclient.ErrZoneNotFound) {
				return Person{}, ErrInvalidInput
			}
			return Person{}, err
		}
		if err := s.ensureServiceZoneCity(ctx, zone.ServiceAreaCode); err != nil {
			return Person{}, err
		}
		derivedCityCode = &zone.ServiceAreaCode
	}
	var person Person
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = updateCaptainTx(ctx, tx, actorID, derivedCityCode, input)
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "captain.updated", Operation: "update_captain",
			FromState: before, ToState: person, CorrelationID: correlationID,
		})
	}); err != nil {
		return Person{}, err
	}
	return person, nil
}

func (s *Service) UpdateEmployee(ctx context.Context, operator Operator, actorID string, input UpdateEmployeeInput, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if input.SupervisorActorID != nil {
		if err := s.validateSupervisor(ctx, *input.SupervisorActorID, actorID, "employee"); err != nil {
			return Person{}, err
		}
	}
	var person Person
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = updateEmployeeTx(ctx, tx, actorID, input)
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "employee.updated", Operation: "update_employee",
			FromState: before, ToState: person, CorrelationID: correlationID,
		})
	}); err != nil {
		return Person{}, err
	}
	return person, nil
}

// EmployeeGovernanceByActorID reads the governance profile through the
// service boundary so HTTP surfaces never touch the repository directly.
func (s *Service) EmployeeGovernanceByActorID(ctx context.Context, actorID string) (EmployeeGovernanceProfile, error) {
	return s.repo.EmployeeGovernanceByActorID(ctx, actorID)
}

// UpsertEmployeeGovernance is the canonical governed write for the employee
// governance profile: the mutation, its audit and (when the command carries an
// idempotency key) its idempotent response commit in ONE transaction.
// Correlation provenance falls back to the idempotency key when the caller
// supplied no X-Correlation-ID header.
func (s *Service) UpsertEmployeeGovernance(ctx context.Context, operator Operator, actorID string, input UpsertEmployeeGovernanceInput, idempotencyKey, correlationID string) (EmployeeGovernanceProfile, error) {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" || operator.ActorID == "" {
		return EmployeeGovernanceProfile{}, ErrInvalidInput
	}
	if correlationID == "" {
		correlationID = strings.TrimSpace(idempotencyKey)
	}
	if correlationID == "" {
		return EmployeeGovernanceProfile{}, ErrInvalidInput
	}
	if idempotencyKey != "" {
		requestHash := hashRequest(input)
		if stored, replayed, err := s.repo.IdempotentReplay(ctx, operator.ActorID, "upsert_employee_governance", idempotencyKey, requestHash); err != nil {
			return EmployeeGovernanceProfile{}, err
		} else if replayed {
			var profile EmployeeGovernanceProfile
			if err := json.Unmarshal(stored, &profile); err != nil {
				return EmployeeGovernanceProfile{}, err
			}
			return profile, nil
		}
	}
	var profile EmployeeGovernanceProfile
	unitErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		profile, err = upsertEmployeeGovernanceTx(ctx, tx, actorID, operator.ActorID, input)
		if err != nil {
			return err
		}
		encoded, err := json.Marshal(profile)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "employee.governance_upserted", Operation: "upsert_employee_governance",
			ToState: profile, CorrelationID: correlationID, IdempotencyKey: idempotencyKey,
		}); err != nil {
			return err
		}
		return storeIdempotentResponseTx(ctx, tx, operator.ActorID, "upsert_employee_governance", idempotencyKey, hashRequest(input), encoded)
	})
	if unitErr != nil {
		return EmployeeGovernanceProfile{}, unitErr
	}
	return profile, nil
}

// Suspend blocks the provider operationally and revokes all authentication:
// Identity deactivation kills every live session, blocks refresh, and
// revokes pending activation codes in one transaction on the Identity side.
// The local status change, its audit, and the durable lifecycle command
// commit atomically (workforce-029) BEFORE the identity call, so a crash
// between the two sovereigns always leaves a recoverable command that the
// reconciler drives to COMPLETED, COMPENSATED, SUPERSEDED, or FAILED.
func (s *Service) Suspend(ctx context.Context, operator Operator, actorID string, expectedVersion int, reason, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if before.EngagementStatus == "terminated" {
		return Person{}, ErrStatusNotIssuable
	}
	// Idempotent replay: a second suspend of an already suspended actor is a
	// success no-op. If a prior command is still IN_FLIGHT the durable intent
	// already exists and the reconciler converges identity; nothing to write.
	if before.EngagementStatus == "suspended" {
		return before, nil
	}
	// Governed unit 1: the suspension status change, its audit, and the
	// durable lifecycle command commit atomically.
	var person Person
	var commandID string
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = setEngagementStatusTx(ctx, tx, actorID, "suspended", expectedVersion)
		if err != nil {
			return err
		}
		commandID, err = insertLifecycleCommandTx(ctx, tx, lifecycleCommandInput{
			OperatorContextID: operator.OperatorContextID, ActorID: actorID, Operation: "suspend",
			FromStatus: before.EngagementStatus, ToStatus: "suspended", PersonVersionAfter: person.Version,
			Reason: reason, RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role,
			CorrelationID:  correlationID,
			IdempotencyKey: lifecycleCommandIdempotencyKey(operator.OperatorContextID, actorID, "suspend", expectedVersion),
			NextRetryAt:    time.Now().Add(lifecycleGraceWindow),
		})
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "workforce.suspended", Operation: "suspend_workforce_actor",
			FromState: before, ToState: person, Reason: reason, CorrelationID: correlationID,
			LifecycleCommandID: commandID,
		})
	}); err != nil {
		return Person{}, err
	}
	if err := s.identity.Deactivate(ctx, actorID, operator.ActorID, reason, correlationID); err != nil {
		// Identity is the auth gate: if it cannot be deactivated the suspension
		// is not effective, so compensate with an audited governed revert that
		// terminates the command as COMPENSATED, or leave the durable command
		// IN_FLIGHT for the reconciler when the compensation unit itself fails.
		return Person{}, s.compensateLifecycleCommand(ctx, operator, actorID, "suspend", commandID, before, person, reason, correlationID, err)
	}
	s.confirmLifecycleCommand(ctx, operator, actorID, "suspend", commandID, person, reason, correlationID)
	return person, nil
}

// Reactivate restores a suspended provider to active and reopens
// authentication. If the provider never activated a device, holding
// active=true grants nothing by itself (no session, no code); issuance for
// status=active covers the fresh-device path. Mirrors Suspend's durable
// lifecycle command discipline (workforce-029).
func (s *Service) Reactivate(ctx context.Context, operator Operator, actorID string, expectedVersion int, reason, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if before.EngagementStatus != "suspended" {
		return Person{}, ErrStatusNotIssuable
	}
	// Governed unit 1: the reactivation status change, its audit, and the
	// durable lifecycle command commit atomically.
	var person Person
	var commandID string
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = setEngagementStatusTx(ctx, tx, actorID, "active", expectedVersion)
		if err != nil {
			return err
		}
		commandID, err = insertLifecycleCommandTx(ctx, tx, lifecycleCommandInput{
			OperatorContextID: operator.OperatorContextID, ActorID: actorID, Operation: "reactivate",
			FromStatus: before.EngagementStatus, ToStatus: "active", PersonVersionAfter: person.Version,
			Reason: reason, RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role,
			CorrelationID:  correlationID,
			IdempotencyKey: lifecycleCommandIdempotencyKey(operator.OperatorContextID, actorID, "reactivate", expectedVersion),
			NextRetryAt:    time.Now().Add(lifecycleGraceWindow),
		})
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "workforce.reactivated", Operation: "reactivate_workforce_actor",
			FromState: before, ToState: person, Reason: reason, CorrelationID: correlationID,
			LifecycleCommandID: commandID,
		})
	}); err != nil {
		return Person{}, err
	}
	if err := s.identity.Reactivate(ctx, actorID, operator.ActorID, reason, correlationID); err != nil {
		// If identity cannot be reactivated the local active projection is a
		// lie, so compensate with an audited governed revert terminating the
		// command as COMPENSATED (or leave it IN_FLIGHT for the reconciler).
		return Person{}, s.compensateLifecycleCommand(ctx, operator, actorID, "reactivate", commandID, before, person, reason, correlationID, err)
	}
	s.confirmLifecycleCommand(ctx, operator, actorID, "reactivate", commandID, person, reason, correlationID)
	return person, nil
}

// IssueActivation issues a one-time activation code for a ready provider.
// The phone is never accepted from the caller: Identity resolves it from the
// actor record, eliminating operator typos and HR/Identity phone drift.
func (s *Service) IssueActivation(ctx context.Context, operator Operator, actorID string, expectedVersion int, expectedActorType, expectedSurface, idempotencyKey, correlationID string) (identityclient.ActivationCode, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return identityclient.ActivationCode{}, err
	}
	if !personHasWorkforceKind(person, expectedActorType) || expectedSurfaceForWorkforceKind(expectedActorType) != expectedSurface {
		return identityclient.ActivationCode{}, identityclient.ErrInvalidActor
	}
	if person.Version != expectedVersion {
		return identityclient.ActivationCode{}, ErrVersionConflict
	}
	switch person.EngagementStatus {
	case "pending_activation", "active":
		// active is allowed: a provider replacing a device needs a fresh code.
	case "suspended":
		return identityclient.ActivationCode{}, ErrSuspended
	default:
		return identityclient.ActivationCode{}, ErrStatusNotIssuable
	}
	if expectedActorType == "field" {
		readiness, readinessErr := s.repo.GovernedActivationReadiness(ctx, actorID)
		if readinessErr != nil {
			return identityclient.ActivationCode{}, readinessErr
		}
		actor, actorErr := s.identity.Actor(ctx, actorID)
		if actorErr != nil {
			return identityclient.ActivationCode{}, actorErr
		}
		if strings.TrimSpace(actor.PhoneE164) == "" {
			return identityclient.ActivationCode{}, ErrProfileIncomplete
		}
		if !readiness.Ready {
			return identityclient.ActivationCode{}, ErrProfileIncomplete
		}
	} else if !sovereignFieldsComplete(person) {
		return identityclient.ActivationCode{}, ErrProfileIncomplete
	} else if expectedActorType == "captain" {
		// Captain financial-dispatch eligibility is a captain-only gate:
		// captains move money on the road, employees do not (root #7).
		if s.dsh == nil {
			return identityclient.ActivationCode{}, ErrProfileIncomplete
		}
		decision, decisionErr := s.dsh.CaptainFinancialEligibility(ctx, actorID)
		if decisionErr != nil || !decision.Eligible || !decision.ExpiresAt.After(time.Now().UTC()) {
			return identityclient.ActivationCode{}, ErrProfileIncomplete
		}
	}
	// Employees: the sovereign employee minimum (department + role) IS the
	// readiness gate, symmetric with the EmployeeByID readback — no
	// captain eligibility is consulted (root #7 divergence closed).
	requestHash := hashRequest(struct {
		ActorID           string
		ExpectedVersion   int
		ExpectedActorType string
		ExpectedSurface   string
	}{actorID, expectedVersion, expectedActorType, expectedSurface})
	boundaryCase, err := s.repo.beginIdentityBoundaryCase(ctx, identityBoundaryCaseInput{
		OperatorContextID: operator.OperatorContextID, Operation: "issue_activation", WorkforceKind: expectedActorType,
		ActorID: actorID, RequestHash: requestHash, IdempotencyKey: idempotencyKey,
		RequestedByActorID: operator.ActorID, RequestedByRole: operator.Role, CorrelationID: correlationID,
		Payload: struct{ ActorID, ExpectedActorType, ExpectedSurface, IdempotencyKey string }{actorID, expectedActorType, expectedSurface, idempotencyKey},
	})
	if err != nil {
		return identityclient.ActivationCode{}, err
	}
	code, err := s.identity.IssueActivation(ctx, actorID, operator.ActorID, expectedActorType, expectedSurface, boundaryCase.CommandKey, correlationID)
	if err != nil {
		return identityclient.ActivationCode{}, err
	}
	if boundaryCase.LifecycleState == "LOCAL_COMMITTED" && idempotencyKey == "" {
		return identityclient.ActivationCode{}, ErrActivationReplay
	}
	if err := s.repo.markIdentityBoundaryRemote(ctx, boundaryCase.ID, actorID, "", map[string]string{"activationId": code.ActivationID}); err != nil {
		return identityclient.ActivationCode{}, err
	}
	// Governed unit: the activation audit is the local evidence of the issued
	// code; it is idempotent on the command's idempotency key, so a retry that
	// re-issues (identity-side idempotent) converges instead of duplicating.
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "workforce.activation_issued", Operation: "issue_activation",
			ToState: map[string]string{"activationId": code.ActivationID}, CorrelationID: correlationID, IdempotencyKey: idempotencyKey,
		}); err != nil {
			return err
		}
		return completeIdentityBoundaryTx(ctx, tx, boundaryCase.ID)
	}); err != nil {
		return identityclient.ActivationCode{}, err
	}
	return code, nil
}

func expectedSurfaceForWorkforceKind(workforceKind string) string {
	switch workforceKind {
	case "field":
		return "app-field"
	case "captain":
		return "app-captain"
	case "employee":
		return "webapp"
	default:
		return ""
	}
}

func personHasWorkforceKind(person Person, workforceKind string) bool {
	switch workforceKind {
	case "field":
		return person.FieldProfile != nil
	case "captain":
		return person.CaptainProfile != nil
	case "employee":
		return person.EmployeeProfile != nil
	default:
		return false
	}
}

// RevokeActivation cancels all pending codes for the provider.
func (s *Service) RevokeActivation(ctx context.Context, operator Operator, actorID, correlationID string) error {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return err
	}
	workforceKind := person.WorkforceKind
	requestHash := hashRequest(struct{ ActorID string }{actorID})
	boundaryCase, err := s.repo.beginIdentityBoundaryCase(ctx, identityBoundaryCaseInput{
		OperatorContextID: operator.OperatorContextID, Operation: "revoke_activation", WorkforceKind: workforceKind,
		ActorID: actorID, RequestHash: requestHash, RequestedByActorID: operator.ActorID,
		RequestedByRole: operator.Role, CorrelationID: correlationID, Payload: struct{ ActorID string }{actorID},
	})
	if err != nil {
		return err
	}
	if boundaryCase.LifecycleState == "LOCAL_COMMITTED" {
		return nil
	}
	if err := s.identity.RevokeActivations(ctx, actorID); err != nil {
		return err
	}
	if err := s.repo.markIdentityBoundaryRemote(ctx, boundaryCase.ID, actorID, "", map[string]string{"revoked": "true"}); err != nil {
		return err
	}
	// Governed unit: the revocation audit and durable case completion are the
	// local evidence of the remote revocation.
	return s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: "workforce.activation_revoked", Operation: "revoke_activation",
			CorrelationID: correlationID,
		}); err != nil {
			return err
		}
		return completeIdentityBoundaryTx(ctx, tx, boundaryCase.ID)
	})
}

// Me returns the provider-facing profile, applying the lazy
// pending_activation→active transition: holding a valid session proves the
// activation code was consumed.
func (s *Service) Me(ctx context.Context, actorID string) (MeView, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return MeView{}, err
	}
	if person.EngagementStatus == "pending_activation" {
		if err := s.repo.MarkActiveIfPending(ctx, actorID); err != nil {
			return MeView{}, err
		}
		person, err = s.repo.PersonByActorID(ctx, actorID)
		if err != nil {
			return MeView{}, err
		}
	}
	view := MeView{Person: person, ProfileComplete: selfFieldsComplete(person)}
	if actor, err := s.identity.Actor(ctx, actorID); err == nil {
		view.PhoneMasked = maskPhone(actor.PhoneE164)
	}
	return view, nil
}

// UpdateMe applies the provider's own non-sovereign edits.
func (s *Service) UpdateMe(ctx context.Context, actorID string, input UpdateSelfInput, correlationID string) (MeView, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return MeView{}, err
	}
	if before.EngagementStatus == "suspended" || before.EngagementStatus == "terminated" {
		return MeView{}, ErrSuspended
	}
	contextID, contextErr := operatorContextID(ctx)
	if contextErr != nil {
		return MeView{}, contextErr
	}
	var person Person
	if err := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		var err error
		person, err = updateSelfTx(ctx, tx, actorID, input)
		if err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: contextID, ActorID: actorID, ActorRole: "field", TargetActorID: actorID,
			Action: "field_agent.self_updated", Operation: "update_self",
			FromState: before.FieldProfile, ToState: person.FieldProfile, CorrelationID: correlationID,
		})
	}); err != nil {
		return MeView{}, err
	}
	view := MeView{Person: person, ProfileComplete: selfFieldsComplete(person)}
	if actor, err := s.identity.Actor(ctx, actorID); err == nil {
		view.PhoneMasked = maskPhone(actor.PhoneE164)
	}
	return view, nil
}

// FieldAgentDetail joins the sovereign profile with the Identity projection
// (masked phone + auth state) for operator screens.
type FieldAgentDetail struct {
	Person
	PhoneMasked      string                             `json:"phoneMasked,omitempty"`
	AuthActive       bool                               `json:"authActive"`
	ReadyToIssue     bool                               `json:"readyToIssue"`
	LatestActivation *identityclient.ActivationMetadata `json:"latestActivation,omitempty"`
}

func (s *Service) FieldAgentByID(ctx context.Context, actorID string) (FieldAgentDetail, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return FieldAgentDetail{}, err
	}
	detail := FieldAgentDetail{
		Person: person,
	}
	if actor, err := s.identity.Actor(ctx, actorID); err == nil {
		detail.PhoneMasked = maskPhone(actor.PhoneE164)
		detail.AuthActive = actor.IsActive()
		if readiness, readinessErr := s.repo.GovernedActivationReadiness(ctx, actorID); readinessErr == nil {
			detail.ReadyToIssue = person.EngagementStatus == "pending_activation" && readiness.Ready && strings.TrimSpace(actor.PhoneE164) != ""
		}
	}
	if meta, err := s.identity.LatestActivation(ctx, actorID); err == nil && meta != nil {
		detail.LatestActivation = meta
	}
	return detail, nil
}

func (s *Service) CaptainByID(ctx context.Context, actorID string) (FieldAgentDetail, error) {
	detail, err := s.FieldAgentByID(ctx, actorID)
	if err != nil {
		return FieldAgentDetail{}, err
	}
	detail.ReadyToIssue = detail.EngagementStatus == "pending_activation" && sovereignFieldsComplete(detail.Person)
	// Captain issuance additionally requires DSH financial eligibility (the
	// same gate IssueActivation enforces). The readback stays advisory — a DSH
	// outage degrades to the sovereign-only signal instead of failing the
	// whole readback — but when DSH is reachable the flag must not over-report
	// readiness the issuance path would refuse (root #7 symmetry).
	if detail.ReadyToIssue && s.dsh != nil && s.dsh.Configured() {
		if decision, decisionErr := s.dsh.CaptainFinancialEligibility(ctx, actorID); decisionErr == nil &&
			(!decision.Eligible || !decision.ExpiresAt.After(time.Now().UTC())) {
			detail.ReadyToIssue = false
		}
	}
	return detail, nil
}

func (s *Service) EmployeeByID(ctx context.Context, actorID string) (FieldAgentDetail, error) {
	detail, err := s.FieldAgentByID(ctx, actorID)
	if err != nil {
		return FieldAgentDetail{}, err
	}
	detail.ReadyToIssue = detail.EngagementStatus == "pending_activation" && sovereignFieldsComplete(detail.Person)
	return detail, nil
}

// sovereignFieldsComplete is the issuance-readiness policy: an operator must
// have filled the sovereign minimum before any activation code exists.
func sovereignFieldsComplete(person Person) bool {
	if person.FullNameAr == "" || person.WorkforceCode == "" {
		return false
	}
	if person.FieldProfile != nil {
		// Field providers no longer have shifts. Their sovereign routing minimum
		// is the canonical city plus the governed DSH service-zone binding.
		return person.FieldProfile.CityCode != "" && person.FieldProfile.ServiceZoneID != ""
	}
	if person.CaptainProfile != nil {
		return person.CaptainProfile.VehicleType != "" &&
			person.CaptainProfile.VehicleIdentifier != "" &&
			person.CaptainProfile.LicenseStatus == "valid" &&
			isLicenseNotExpired(person.CaptainProfile.LicenseExpiresAt) &&
			person.CaptainProfile.OperatingCityCode != ""
	}
	if person.EmployeeProfile != nil {
		return person.EmployeeProfile.Department != "" && person.EmployeeProfile.Role != ""
	}
	return false
}

func isLicenseNotExpired(expiresAtStr string) bool {
	if expiresAtStr == "" {
		return false
	}
	layouts := []string{"2006-01-02", time.RFC3339}
	var expiresAt time.Time
	var parsed bool
	for _, layout := range layouts {
		if t, err := time.Parse(layout, expiresAtStr); err == nil {
			expiresAt = t
			parsed = true
			break
		}
	}
	if !parsed {
		if t, err := time.Parse("2006-01-02 15:04:05 -0700 MST", expiresAtStr); err == nil {
			expiresAt = t
			parsed = true
		} else if t, err := time.Parse("2006-01-02 15:04:05.999999999 -0700 MST", expiresAtStr); err == nil {
			expiresAt = t
			parsed = true
		}
	}
	if !parsed {
		return false
	}
	currentDate := time.Now().UTC().Truncate(24 * time.Hour)
	expireDate := expiresAt.UTC().Truncate(24 * time.Hour)
	return !expireDate.Before(currentDate)
}

// selfFieldsComplete drives the in-app completion screen: the provider owns
// these non-sovereign fields.
func selfFieldsComplete(person Person) bool {
	if person.PhotoMediaRef == "" {
		return false
	}
	if person.FieldProfile != nil {
		return person.FieldProfile.EmergencyContactPhone != "" && person.FieldProfile.PolicyConsentAt != ""
	}
	if person.CaptainProfile != nil {
		return person.CaptainProfile.VehicleType != "" && person.CaptainProfile.VehicleIdentifier != ""
	}
	if person.EmployeeProfile != nil {
		return true
	}
	return false
}

func maskPhone(phone string) string {
	if len(phone) <= 6 {
		return phone
	}
	return phone[:4] + strings.Repeat("*", len(phone)-6) + phone[len(phone)-2:]
}

func hashRequest(input any) string {
	encoded, err := json.Marshal(input)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}
