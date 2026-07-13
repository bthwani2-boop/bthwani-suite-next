package workforce

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"workforce-api/internal/dshclient"
	"workforce-api/internal/identityclient"
)

var (
	ErrStatusNotIssuable    = errors.New("engagement status does not allow activation issuance")
	ErrProfileIncomplete    = errors.New("profile is incomplete")
	ErrSuspended            = errors.New("engagement suspended")
	ErrInvalidInput         = errors.New("invalid input")
	ErrInvalidSupervisor    = errors.New("supervisor actor is missing, inactive, or invalid")
	ErrProviderKindConflict = errors.New("actor already holds a profile of the other provider kind")
)

// Service orchestrates the provider lifecycle across Workforce (sovereign
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
// is active, has the correct supervisor role, and is not the provider itself.
func (s *Service) validateSupervisor(ctx context.Context, supervisorActorID, providerActorID, providerKind string) error {
	if supervisorActorID == "" {
		return nil
	}
	if supervisorActorID == providerActorID {
		return ErrInvalidSupervisor
	}
	actor, err := s.identity.Actor(ctx, supervisorActorID)
	if err != nil {
		if errors.Is(err, identityclient.ErrActorNotFound) {
			return ErrInvalidSupervisor
		}
		return err
	}
	if !actor.Active {
		return ErrInvalidSupervisor
	}
	expectedRole := "workforce.supervise.field"
	if providerKind == "captain" {
		expectedRole = "workforce.supervise.captain"
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
	}
	actors, err := s.identity.SearchActors(ctx, expectedRole, query)
	if err != nil {
		return nil, err
	}
	candidates := make([]SupervisorCandidate, 0, len(actors))
	for _, actor := range actors {
		candidates = append(candidates, SupervisorCandidate{
			ActorID:  actor.ActorID,
			Username: actor.Username,
			Phone:    maskPhone(actor.PhoneE164),
			Active:   actor.Active,
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

// CreateFieldAgent provisions the Identity actor first (idempotent on
// phone+role, returns the actor id that keys everything), then writes the
// sovereign profile. If the local write fails the provisioned actor stays
// inactive and unbound to any profile — a retry with the same phone reuses
// it via idempotent provisioning, so no orphaned live credentials exist.
// The provider code is generated server-side and never accepted from the
// caller.
func (s *Service) CreateFieldAgent(ctx context.Context, operator Operator, input CreateFieldAgentInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	if input.EngagementType == "" {
		input.EngagementType = "independent_contractor"
	}
	if input.FullNameAr == "" {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" && input.EngagementType != "agency_contractor" {
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
	if err := s.ensureServiceZoneCity(ctx, zone.CityCode); err != nil {
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

	providerCode, err := s.repo.NextProviderCode(ctx, "field")
	if err != nil {
		return Person{}, false, err
	}

	actor, err := s.identity.Provision(ctx, identityclient.ProvisionInput{
		Username:  providerCode,
		PhoneE164: input.PhoneE164,
		Role:      "field",
	})
	if err != nil {
		return Person{}, false, err
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actor.ActorID); lookupErr == nil {
		return existing, true, nil
	}

	person, err := s.repo.CreatePerson(ctx, actor.ActorID, providerCode, zone.CityCode, input)
	if err != nil {
		if errors.Is(err, ErrDuplicateProviderCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actor.ActorID); lookupErr == nil {
				return existing, true, nil
			}
		}
		return Person{}, false, err
	}

	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actor.ActorID,
		"field_agent.created", nil, person, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in CreateFieldAgent: %v", err)
	}
	if encoded, err := json.Marshal(person); err == nil {
		_ = s.repo.StoreIdempotentResponse(ctx, operator.ActorID, "create_field_agent", idempotencyKey, requestHash, encoded)
	}
	return person, false, nil
}

func (s *Service) CreateCaptain(ctx context.Context, operator Operator, input CreateCaptainInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	if input.EngagementType == "" {
		input.EngagementType = "independent_contractor"
	}
	if input.FullNameAr == "" {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" && input.EngagementType != "agency_contractor" {
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
	if err := s.ensureServiceZoneCity(ctx, zone.CityCode); err != nil {
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

	providerCode, err := s.repo.NextProviderCode(ctx, "captain")
	if err != nil {
		return Person{}, false, err
	}

	actor, err := s.identity.Provision(ctx, identityclient.ProvisionInput{
		Username:  providerCode,
		PhoneE164: input.PhoneE164,
		Role:      "captain",
	})
	if err != nil {
		return Person{}, false, err
	}

	if existing, lookupErr := s.repo.PersonByActorID(ctx, actor.ActorID); lookupErr == nil {
		return existing, true, nil
	}

	person, err := s.repo.CreateCaptain(ctx, actor.ActorID, providerCode, zone.CityCode, input)
	if err != nil {
		if errors.Is(err, ErrDuplicateProviderCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actor.ActorID); lookupErr == nil {
				return existing, true, nil
			}
		}
		return Person{}, false, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actor.ActorID,
		"captain.created", nil, person, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in CreateCaptain: %v", err)
	}
	if encoded, err := json.Marshal(person); err == nil {
		_ = s.repo.StoreIdempotentResponse(ctx, operator.ActorID, "create_captain", idempotencyKey, requestHash, encoded)
	}
	return person, false, nil
}

type Operator struct {
	ActorID string
	Role    string
	Token   string
}

// UpdateFieldAgent applies sovereign edits under optimistic locking.
func (s *Service) UpdateFieldAgent(ctx context.Context, operator Operator, actorID string, input UpdateFieldAgentInput, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
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
		if err := s.ensureServiceZoneCity(ctx, zone.CityCode); err != nil {
			return Person{}, err
		}
		derivedCityCode = &zone.CityCode
	}
	person, err := s.repo.UpdatePerson(ctx, actorID, derivedCityCode, input)
	if err != nil {
		return Person{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"field_agent.updated", before, person, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in UpdateFieldAgent: %v", err)
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
		if err := s.ensureServiceZoneCity(ctx, zone.CityCode); err != nil {
			return Person{}, err
		}
		derivedCityCode = &zone.CityCode
	}
	person, err := s.repo.UpdateCaptain(ctx, actorID, derivedCityCode, input)
	if err != nil {
		return Person{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"captain.updated", before, person, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in UpdateCaptain: %v", err)
	}
	return person, nil
}

// Suspend blocks the provider operationally and revokes all authentication:
// Identity deactivation kills every live session, blocks refresh, and
// revokes pending activation codes in one transaction on the Identity side.
func (s *Service) Suspend(ctx context.Context, operator Operator, actorID string, expectedVersion int, reason, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if before.EngagementStatus == "terminated" {
		return Person{}, ErrStatusNotIssuable
	}
	person, err := s.repo.SetEngagementStatus(ctx, actorID, "suspended", expectedVersion)
	if err != nil {
		return Person{}, err
	}
	if err := s.identity.Deactivate(ctx, actorID); err != nil {
		// Identity is the auth gate: if it cannot be deactivated the
		// suspension is not effective, so roll the status back and fail.
		_, _ = s.repo.SetEngagementStatus(ctx, actorID, before.EngagementStatus, person.Version)
		return Person{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"provider.suspended", before, person, reason, correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in Suspend: %v", err)
	}
	return person, nil
}

// Reactivate restores a suspended provider to active and reopens
// authentication. If the provider never activated a device, holding
// active=true grants nothing by itself (no session, no code); issuance for
// status=active covers the fresh-device path.
func (s *Service) Reactivate(ctx context.Context, operator Operator, actorID string, expectedVersion int, reason, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	if before.EngagementStatus != "suspended" {
		return Person{}, ErrStatusNotIssuable
	}
	person, err := s.repo.SetEngagementStatus(ctx, actorID, "active", expectedVersion)
	if err != nil {
		return Person{}, err
	}
	if err := s.identity.Reactivate(ctx, actorID); err != nil {
		_, _ = s.repo.SetEngagementStatus(ctx, actorID, "suspended", person.Version)
		return Person{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"provider.reactivated", before, person, reason, correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in Reactivate: %v", err)
	}
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
	if !personHasProviderKind(person, expectedActorType) || expectedSurfaceForProviderKind(expectedActorType) != expectedSurface {
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
	if !sovereignFieldsComplete(person) {
		return identityclient.ActivationCode{}, ErrProfileIncomplete
	}
	code, err := s.identity.IssueActivation(ctx, actorID, operator.ActorID, expectedActorType, expectedSurface, idempotencyKey, correlationID)
	if err != nil {
		return identityclient.ActivationCode{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"provider.activation_issued", nil, map[string]string{"activationId": code.ActivationID}, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in IssueActivation: %v", err)
	}
	return code, nil
}

func expectedSurfaceForProviderKind(providerKind string) string {
	switch providerKind {
	case "field":
		return "app-field"
	case "captain":
		return "app-captain"
	default:
		return ""
	}
}

func personHasProviderKind(person Person, providerKind string) bool {
	switch providerKind {
	case "field":
		return person.FieldProfile != nil
	case "captain":
		return person.CaptainProfile != nil
	default:
		return false
	}
}

// RevokeActivation cancels all pending codes for the provider.
func (s *Service) RevokeActivation(ctx context.Context, operator Operator, actorID, correlationID string) error {
	if _, err := s.repo.PersonByActorID(ctx, actorID); err != nil {
		return err
	}
	if err := s.identity.RevokeActivations(ctx, actorID); err != nil {
		return err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"provider.activation_revoked", nil, nil, "", correlationID); err != nil {
		log.Printf("[workforce] RecordAudit error in RevokeActivation: %v", err)
	}
	return nil
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
	person, err := s.repo.UpdateSelf(ctx, actorID, input)
	if err != nil {
		return MeView{}, err
	}
	if err := s.repo.RecordAudit(ctx, actorID, "field", actorID,
		"field_agent.self_updated", before.FieldProfile, person.FieldProfile, "", correlationID); err != nil {
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
		Person:       person,
		ReadyToIssue: person.EngagementStatus == "pending_activation" && sovereignFieldsComplete(person),
	}
	if actor, err := s.identity.Actor(ctx, actorID); err == nil {
		detail.PhoneMasked = maskPhone(actor.PhoneE164)
		detail.AuthActive = actor.Active
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
	return detail, nil
}

// sovereignFieldsComplete is the issuance-readiness policy: an operator must
// have filled the sovereign minimum before any activation code exists.
func sovereignFieldsComplete(person Person) bool {
	if person.FullNameAr == "" || person.ProviderCode == "" {
		return false
	}
	if person.FieldProfile != nil {
		return person.FieldProfile.CityCode != "" && person.FieldProfile.ShiftCode != ""
	}
	if person.CaptainProfile != nil {
		return person.CaptainProfile.VehicleType != "" &&
			person.CaptainProfile.VehicleIdentifier != "" &&
			person.CaptainProfile.LicenseStatus == "valid" &&
			isLicenseNotExpired(person.CaptainProfile.LicenseExpiresAt) &&
			person.CaptainProfile.OperatingCityCode != ""
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
