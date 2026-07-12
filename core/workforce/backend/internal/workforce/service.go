package workforce

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"workforce-api/internal/identityclient"
)

var (
	ErrStatusNotIssuable = errors.New("engagement status does not allow activation issuance")
	ErrProfileIncomplete = errors.New("profile is incomplete")
	ErrSuspended         = errors.New("engagement suspended")
	ErrInvalidInput      = errors.New("invalid input")
)

// Service orchestrates the provider lifecycle across Workforce (sovereign
// profile) and Identity (auth actor). All Identity access goes through the
// internal service-token API; the frontend never references phones directly.
type Service struct {
	repo     *Repository
	identity *identityclient.Client
}

func NewService(repo *Repository, identity *identityclient.Client) *Service {
	return &Service{repo: repo, identity: identity}
}

var providerCodePattern = regexp.MustCompile(`^[A-Za-z0-9_-]{2,32}$`)

// CreateFieldAgent provisions the Identity actor first (idempotent on
// phone+role, returns the actor id that keys everything), then writes the
// sovereign profile. If the local write fails the provisioned actor stays
// inactive and unbound to any profile — a retry with the same phone reuses
// it via idempotent provisioning, so no orphaned live credentials exist.
func (s *Service) CreateFieldAgent(ctx context.Context, operator Operator, input CreateFieldAgentInput, idempotencyKey, correlationID string) (Person, bool, error) {
	input.FullNameAr = strings.TrimSpace(input.FullNameAr)
	input.FullNameEn = strings.TrimSpace(input.FullNameEn)
	input.ProviderCode = strings.TrimSpace(input.ProviderCode)
	if input.EngagementType == "" {
		input.EngagementType = "independent_contractor"
	}
	if input.FullNameAr == "" || !providerCodePattern.MatchString(input.ProviderCode) {
		return Person{}, false, ErrInvalidInput
	}
	if input.EngagementType != "independent_contractor" && input.EngagementType != "agency_contractor" {
		return Person{}, false, ErrInvalidInput
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

	actor, err := s.identity.Provision(ctx, identityclient.ProvisionInput{
		Username:  input.ProviderCode,
		PhoneE164: input.PhoneE164,
		Role:      "field",
	})
	if err != nil {
		return Person{}, false, err
	}

	person, err := s.repo.CreatePerson(ctx, actor.ActorID, input)
	if err != nil {
		// A duplicate profile for the same actor means an earlier attempt
		// already completed but the idempotency record was lost/absent —
		// surface the existing profile instead of failing the operator.
		if errors.Is(err, ErrDuplicateProviderCode) {
			if existing, lookupErr := s.repo.PersonByActorID(ctx, actor.ActorID); lookupErr == nil && existing.ProviderCode == input.ProviderCode {
				return existing, true, nil
			}
		}
		return Person{}, false, err
	}

	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actor.ActorID,
		"field_agent.created", nil, person, "", correlationID); err != nil {
		return Person{}, false, err
	}
	if encoded, err := json.Marshal(person); err == nil {
		_ = s.repo.StoreIdempotentResponse(ctx, operator.ActorID, "create_field_agent", idempotencyKey, requestHash, encoded)
	}
	return person, false, nil
}

type Operator struct {
	ActorID string
	Role    string
}

// UpdateFieldAgent applies sovereign edits under optimistic locking.
func (s *Service) UpdateFieldAgent(ctx context.Context, operator Operator, actorID string, input UpdateFieldAgentInput, correlationID string) (Person, error) {
	before, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return Person{}, err
	}
	person, err := s.repo.UpdatePerson(ctx, actorID, input)
	if err != nil {
		return Person{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"field_agent.updated", before, person, "", correlationID); err != nil {
		return Person{}, err
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
		"field_agent.suspended", before, person, reason, correlationID); err != nil {
		return Person{}, err
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
		"field_agent.reactivated", before, person, reason, correlationID); err != nil {
		return Person{}, err
	}
	return person, nil
}

// IssueActivation issues a one-time activation code for a ready provider.
// The phone is never accepted from the caller: Identity resolves it from the
// actor record, eliminating operator typos and HR/Identity phone drift.
func (s *Service) IssueActivation(ctx context.Context, operator Operator, actorID string, expectedVersion int, idempotencyKey, correlationID string) (identityclient.ActivationCode, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		return identityclient.ActivationCode{}, err
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
	code, err := s.identity.IssueActivation(ctx, actorID, operator.ActorID, idempotencyKey, correlationID)
	if err != nil {
		return identityclient.ActivationCode{}, err
	}
	if err := s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"field_agent.activation_issued", nil, map[string]string{"activationId": code.ActivationID}, "", correlationID); err != nil {
		return identityclient.ActivationCode{}, err
	}
	return code, nil
}

// RevokeActivation cancels all pending codes for the provider.
func (s *Service) RevokeActivation(ctx context.Context, operator Operator, actorID, correlationID string) error {
	if _, err := s.repo.PersonByActorID(ctx, actorID); err != nil {
		return err
	}
	if err := s.identity.RevokeActivations(ctx, actorID); err != nil {
		return err
	}
	return s.repo.RecordAudit(ctx, operator.ActorID, operator.Role, actorID,
		"field_agent.activation_revoked", nil, nil, "", correlationID)
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
	PhoneMasked string `json:"phoneMasked,omitempty"`
	AuthActive  bool   `json:"authActive"`
	ReadyToIssue bool  `json:"readyToIssue"`
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
	return detail, nil
}

// sovereignFieldsComplete is the issuance-readiness policy: an operator must
// have filled the sovereign minimum before any activation code exists.
func sovereignFieldsComplete(person Person) bool {
	if person.FullNameAr == "" || person.ProviderCode == "" {
		return false
	}
	if person.FieldProfile == nil {
		return false
	}
	return person.FieldProfile.CityCode != "" && person.FieldProfile.ShiftCode != ""
}

// selfFieldsComplete drives the in-app completion screen: the provider owns
// these non-sovereign fields.
func selfFieldsComplete(person Person) bool {
	if person.PhotoMediaRef == "" || person.FieldProfile == nil {
		return false
	}
	return person.FieldProfile.EmergencyContactPhone != "" && person.FieldProfile.PolicyConsentAt != ""
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
