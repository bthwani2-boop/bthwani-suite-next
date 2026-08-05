package workforce

import (
	"context"
	"errors"
	"time"
)

// EvaluateReadiness orchestrates checking the dependencies Workforce can
// answer today: Identity activation status and the professional profile
// (employment status, documents, supervisor assignment).
//
// J012/J013 also require DSH active-assignment and WLT financial-eligibility
// signals in the same gate. Neither dshclient nor wltclient currently exposes
// a read for those, so this evaluation does not claim them: it reports a
// gate scoped to what it can verify rather than fabricating an assignment or
// eligibility check against a call that does not exist. Adding those signals
// is J012/J013 journey work, not part of restoring a green build.
func (s *Service) EvaluateReadiness(ctx context.Context, actorID string) (*ReadinessGate, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			// Fast path for non-workforce actors.
			return &ReadinessGate{
				ActorID:        actorID,
				Status:         ReadinessBlocked,
				BlockerReasons: []BlockerReason{BlockerProfileIncomplete},
				CheckedAt:      time.Now(),
			}, nil
		}
		return nil, err
	}

	gate := &ReadinessGate{
		ActorID:        actorID,
		WorkforceKind:  person.WorkforceKind,
		Status:         ReadinessAllowed, // Default to allowed until a blocker is found.
		BlockerReasons: make([]BlockerReason, 0),
		CheckedAt:      time.Now(),
	}

	// Identity status. An Identity lookup failure is treated the same as an
	// inactive actor: J001/J012 require failing closed, not assuming healthy.
	actor, err := s.identity.Actor(ctx, actorID)
	if err != nil || !actor.Active {
		gate.BlockerReasons = append(gate.BlockerReasons, BlockerIdentitySuspended)
	}

	// Employment status.
	if person.EngagementStatus == "terminated" || person.EngagementStatus == "suspended" {
		gate.BlockerReasons = append(gate.BlockerReasons, BlockerEmploymentTerminated)
	}

	// Profile documents and role-specific requirements.
	if person.WorkforceKind == "captain" && person.CaptainProfile != nil {
		if person.CaptainProfile.LicenseStatus == "expired" {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerDocumentsExpired)
		}
		if len(person.CaptainProfile.DocumentMediaRefs) == 0 {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}
	}

	if person.WorkforceKind == "field_agent" && person.FieldProfile != nil {
		if len(person.FieldProfile.DocumentMediaRefs) == 0 {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}
		if person.FieldProfile.SupervisorActorID == "" {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}
	}

	if len(gate.BlockerReasons) > 0 {
		gate.Status = ReadinessBlocked
	}

	return gate, nil
}
