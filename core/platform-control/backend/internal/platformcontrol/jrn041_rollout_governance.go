package platformcontrol

import (
	"context"
	"fmt"
	"strings"
)

// RolloutRecoveryGuide is the canonical support read model for restoring or
// continuing a rollout without inventing state in the control panel.
type RolloutRecoveryGuide struct {
	RolloutID          string               `json:"rolloutId"`
	ChangeSetID        string               `json:"changeSetId"`
	FeatureFlagKey     string               `json:"featureFlagKey"`
	Status             RolloutStatus        `json:"status"`
	HealthState        PlatformControlState `json:"healthState"`
	CurrentPercentage  int64                `json:"currentPercentage"`
	CanAdvance         bool                 `json:"canAdvance"`
	CanPause           bool                 `json:"canPause"`
	CanResume          bool                 `json:"canResume"`
	CanAbort           bool                 `json:"canAbort"`
	CanRollback        bool                 `json:"canRollback"`
	RecommendedAction  string               `json:"recommendedAction"`
	RollbackPlan       string               `json:"rollbackPlan"`
	RecoverySteps      []string             `json:"recoverySteps"`
	RequiredPermission string               `json:"requiredPermission"`
}

func validateRolloutTargetScope(scope map[string]any) error {
	if len(scope) == 0 {
		return ErrValidation
	}

	hasSelector := false
	for key, value := range scope {
		switch key {
		case "audience", "city", "surface":
			text, ok := value.(string)
			if !ok || strings.TrimSpace(text) == "" {
				return ErrValidation
			}
			hasSelector = true
		case "audienceIds", "regions", "surfaces":
			values, ok := stringSlice(value)
			if !ok || len(values) == 0 {
				return ErrValidation
			}
			for _, item := range values {
				if strings.TrimSpace(item) == "" {
					return ErrValidation
				}
			}
			hasSelector = true
		default:
			return ErrValidation
		}
	}
	if !hasSelector {
		return ErrValidation
	}
	return nil
}

func (s *Service) ResumeRollout(
	ctx context.Context,
	id string,
	actorID string,
	roles []string,
	correlationID string,
) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.ResumeRollout(ctx, id, actorID, roles, correlationID)
}

func (r *Repository) ResumeRollout(
	ctx context.Context,
	id string,
	actorID string,
	actorRoles []string,
	correlationID string,
) (Rollout, error) {
	return r.updateRolloutStatus(
		ctx,
		id,
		actorID,
		actorRoles,
		correlationID,
		[]RolloutStatus{RolloutPaused},
		RolloutRunning,
		"started_at",
		"rollout_resumed",
	)
}

func (r *Repository) RecordRolloutHealthGateFailure(
	ctx context.Context,
	rollout Rollout,
	actorID string,
	actorRoles []string,
	correlationID string,
	gateErr error,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	reason := "health gate blocked rollout advance"
	if gateErr != nil {
		reason = gateErr.Error()
	}
	if err := insertAudit(
		ctx,
		tx,
		rollout.ChangeSetID,
		"rollout_health_gate_blocked",
		actorID,
		actorRoles,
		"health_blocked",
		rollout.ID,
		correlationID,
		map[string]any{
			"status":            rollout.Status,
			"currentPercentage": rollout.CurrentPercentage,
			"healthGate":        rollout.HealthGate,
		},
		map[string]any{
			"status": rollout.Status,
			"reason": reason,
		},
	); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) GetRolloutRecoveryGuide(ctx context.Context, id string) (RolloutRecoveryGuide, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return RolloutRecoveryGuide{}, err
	}
	guide, err := repository.GetRolloutRecoveryGuide(ctx, id)
	if err != nil {
		return RolloutRecoveryGuide{}, err
	}
	guide.HealthState = s.Health(ctx).State
	guide.CanAdvance = guide.Status == RolloutRunning && guide.HealthState == StateOperational
	return guide, nil
}

func (r *Repository) GetRolloutRecoveryGuide(ctx context.Context, id string) (RolloutRecoveryGuide, error) {
	rollout, err := r.GetRollout(ctx, id)
	if err != nil {
		return RolloutRecoveryGuide{}, err
	}
	changeSet, err := r.GetChangeSet(ctx, rollout.ChangeSetID)
	if err != nil {
		return RolloutRecoveryGuide{}, err
	}

	guide := RolloutRecoveryGuide{
		RolloutID:          rollout.ID,
		ChangeSetID:        rollout.ChangeSetID,
		FeatureFlagKey:     rollout.FeatureFlagKey,
		Status:             rollout.Status,
		CurrentPercentage:  rollout.CurrentPercentage,
		CanAdvance:         rollout.Status == RolloutRunning,
		CanPause:           rollout.Status == RolloutRunning,
		CanResume:          rollout.Status == RolloutPaused,
		CanAbort:           rollout.Status == RolloutRunning || rollout.Status == RolloutPaused,
		CanRollback:        rollout.Status == RolloutCompleted,
		RollbackPlan:       changeSet.RollbackPlan,
		RequiredPermission: "platform:rollouts:manage",
	}

	switch rollout.Status {
	case RolloutRunning:
		guide.RecommendedAction = "evaluate_health_then_advance_or_pause"
		guide.RecoverySteps = []string{
			"Inspect the configured aggregate and required-service health gate.",
			"Pause the rollout before investigation when risk is suspected.",
			"Abort to restore the captured baseline when risk is confirmed.",
		}
	case RolloutPaused:
		guide.RecommendedAction = "resume_after_health_or_abort"
		guide.RecoverySteps = []string{
			"Resolve the incident while the rollout percentage remains unchanged.",
			"Resume only after health is operational; resume does not advance percentage.",
			"Abort to restore the captured baseline if the risk remains.",
		}
	case RolloutCompleted:
		guide.RecommendedAction = "rollback_if_post_release_risk"
		guide.RecoverySteps = []string{
			"Confirm the incident is caused by the completed feature release.",
			"Rollback the rollout to restore its captured baseline under revision control.",
			"Verify effective runtime configuration and target-surface readback.",
		}
	case RolloutAborted, RolloutRolledBack:
		guide.RecommendedAction = "verify_baseline_and_close"
		guide.RecoverySteps = []string{
			"Verify the feature flag equals the captured baseline.",
			"Inspect the correlated audit events and effective runtime configuration.",
			"Close the incident only after affected surfaces read the restored state.",
		}
	case RolloutFailed:
		guide.RecommendedAction = "inspect_audit_and_restore_manually"
		guide.RecoverySteps = []string{
			"Inspect revision conflicts and correlated audit events.",
			"Do not overwrite a newer feature-flag revision.",
			"Use an independently approved corrective change when automatic restoration is unsafe.",
		}
	default:
		return RolloutRecoveryGuide{}, fmt.Errorf("%w: unsupported rollout status %s", ErrInvalidTransition, rollout.Status)
	}
	return guide, nil
}
