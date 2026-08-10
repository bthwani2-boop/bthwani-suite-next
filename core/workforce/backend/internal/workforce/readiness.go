package workforce

import (
	"context"
	"errors"
	"time"
)

func identityReadinessBlocker(active bool, err error) (BlockerReason, bool) {
	if err != nil {
		return BlockerEligibilityUnavailable, true
	}
	if !active {
		return BlockerIdentitySuspended, true
	}
	return "", false
}

// EvaluateReadiness orchestrates the Workforce-owned portion of provider
// readiness: Identity activation state, engagement state, and the sovereign
// professional profile. It deliberately fails closed when a role projection is
// missing or incomplete.
//
// DSH active-assignment and WLT financial-eligibility are separate authorities
// and are not fabricated here. They must be composed by the operational journey
// that owns those cross-service decisions.
func (s *Service) EvaluateReadiness(ctx context.Context, actorID string) (*ReadinessGate, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
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
		Status:         ReadinessAllowed,
		BlockerReasons: make([]BlockerReason, 0),
		CheckedAt:      time.Now(),
	}

	// Identity lifecycle truth comes from the canonical status field. Dependency
	// failure is not a suspension: it blocks readiness as unavailable instead.
	actor, err := s.identity.Actor(ctx, actorID)
	if reason, blocked := identityReadinessBlocker(actor.IsActive(), err); blocked {
		gate.BlockerReasons = append(gate.BlockerReasons, reason)
	}

	if person.EngagementStatus == "terminated" || person.EngagementStatus == "suspended" {
		gate.BlockerReasons = append(gate.BlockerReasons, BlockerEmploymentTerminated)
	}

	switch person.WorkforceKind {
	case "captain":
		profile := person.CaptainProfile
		if profile == nil {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
			break
		}
		if profile.LicenseStatus == "expired" ||
			(profile.LicenseStatus == "valid" && !isLicenseNotExpired(profile.LicenseExpiresAt)) {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerDocumentsExpired)
		} else if profile.LicenseStatus != "valid" {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}
		if len(profile.DocumentMediaRefs) == 0 || profile.VehicleType == "" || profile.ServiceZoneID == "" {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}

	case "field":
		profile := person.FieldProfile
		if profile == nil {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
			break
		}
		if len(profile.DocumentMediaRefs) == 0 || profile.CityCode == "" || profile.ServiceZoneID == "" {
			gate.BlockerReasons = append(gate.BlockerReasons, BlockerProfileIncomplete)
		}
	}

	if len(gate.BlockerReasons) > 0 {
		gate.Status = ReadinessBlocked
	}

	return gate, nil
}
