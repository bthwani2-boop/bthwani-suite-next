package workforce

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var ErrCurrentProviderReadinessDependencyUnavailable = errors.New("workforce current provider readiness dependency unavailable")

func identityCurrentProviderReadinessBlocker(active bool) (CurrentProviderReadinessBlockerReason, bool) {
	if !active {
		return CurrentProviderBlockerIdentitySuspended, true
	}
	return "", false
}

// EvaluateCurrentProviderReadiness evaluates only the Workforce-owned current provider readiness
// boundary: Identity lifecycle, engagement state, and the sovereign professional
// profile. DSH assignment/area state and WLT financial eligibility are separate
// authorities and cannot be represented by this decision.
//
// Dependency failure is not a business denial. If Identity cannot be verified,
// the evaluation returns ErrCurrentProviderReadinessDependencyUnavailable so the HTTP boundary
// can expose 503 instead of fabricating a BLOCKED decision.
func (s *Service) EvaluateCurrentProviderReadiness(ctx context.Context, actorID string) (*CurrentProviderReadiness, error) {
	person, err := s.repo.PersonByActorID(ctx, actorID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return &CurrentProviderReadiness{
				ActorID:        actorID,
				Status:         CurrentProviderReadinessBlocked,
				BlockerReasons: []CurrentProviderReadinessBlockerReason{CurrentProviderBlockerProfileIncomplete},
				CheckedAt:      time.Now(),
			}, nil
		}
		return nil, err
	}

	readiness := &CurrentProviderReadiness{
		ActorID:        actorID,
		WorkforceKind:  person.WorkforceKind,
		Status:         CurrentProviderReadinessAllowed,
		BlockerReasons: make([]CurrentProviderReadinessBlockerReason, 0),
		CheckedAt:      time.Now(),
	}

	actor, err := s.identity.Actor(ctx, actorID)
	if err != nil {
		return nil, fmt.Errorf("%w: identity: %v", ErrCurrentProviderReadinessDependencyUnavailable, err)
	}
	if reason, blocked := identityCurrentProviderReadinessBlocker(actor.IsActive()); blocked {
		readiness.BlockerReasons = append(readiness.BlockerReasons, reason)
	}

	if person.EngagementStatus == "terminated" || person.EngagementStatus == "suspended" {
		readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerEngagementInactive)
	}

	switch person.WorkforceKind {
	case "captain":
		profile := person.CaptainProfile
		if profile == nil {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerProfileIncomplete)
			break
		}
		if profile.LicenseStatus == "expired" ||
			(profile.LicenseStatus == "valid" && !isLicenseNotExpired(profile.LicenseExpiresAt)) {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerDocumentsExpired)
		} else if profile.LicenseStatus != "valid" {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerProfileIncomplete)
		}
		if len(profile.DocumentMediaRefs) == 0 || profile.VehicleType == "" || profile.ServiceZoneID == "" {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerProfileIncomplete)
		}

	case "field":
		profile := person.FieldProfile
		if profile == nil {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerProfileIncomplete)
			break
		}
		if len(profile.DocumentMediaRefs) == 0 || profile.ServiceAreaCode == "" || profile.ServiceZoneID == "" {
			readiness.BlockerReasons = append(readiness.BlockerReasons, CurrentProviderBlockerProfileIncomplete)
		}
	}

	if len(readiness.BlockerReasons) > 0 {
		readiness.Status = CurrentProviderReadinessBlocked
	}

	return readiness, nil
}
