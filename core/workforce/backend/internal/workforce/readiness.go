package workforce

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var ErrReadinessDependencyUnavailable = errors.New("workforce readiness dependency unavailable")

func identityReadinessBlocker(active bool) (BlockerReason, bool) {
	if !active {
		return BlockerIdentitySuspended, true
	}
	return "", false
}

// EvaluateReadiness evaluates only the Workforce-owned provider readiness
// boundary: Identity lifecycle, engagement state, and the sovereign professional
// profile. DSH assignment/area state and WLT financial eligibility are separate
// authorities and cannot be represented by this decision.
//
// Dependency failure is not a business denial. If Identity cannot be verified,
// the evaluation returns ErrReadinessDependencyUnavailable so the HTTP boundary
// can expose 503 instead of fabricating a BLOCKED decision.
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

	actor, err := s.identity.Actor(ctx, actorID)
	if err != nil {
		return nil, fmt.Errorf("%w: identity: %v", ErrReadinessDependencyUnavailable, err)
	}
	if reason, blocked := identityReadinessBlocker(actor.IsActive()); blocked {
		gate.BlockerReasons = append(gate.BlockerReasons, reason)
	}

	if person.EngagementStatus == "terminated" || person.EngagementStatus == "suspended" {
		gate.BlockerReasons = append(gate.BlockerReasons, BlockerEngagementInactive)
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
