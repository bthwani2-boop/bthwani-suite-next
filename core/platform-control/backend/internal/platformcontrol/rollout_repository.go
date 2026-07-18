package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

var ErrHealthGate = errors.New("platform rollout health gate failed")

const rolloutSelect = `
SELECT id::text, change_set_id::text, feature_flag_key, status,
       target_scope_json, steps, current_step_index, current_percentage,
       health_gate_json, baseline_enabled, baseline_targeting_json,
       flag_revision, created_by_actor_id, updated_by_actor_id, version,
       created_at, updated_at, started_at, paused_at, completed_at,
       aborted_at, rolled_back_at
FROM platform_rollouts`

func validateRolloutInput(input CreateRolloutInput) error {
	if strings.TrimSpace(input.ChangeSetID) == "" || strings.TrimSpace(input.FeatureFlagKey) == "" {
		return ErrValidation
	}
	if len(input.Steps) == 0 {
		return ErrValidation
	}
	previous := 0
	for _, step := range input.Steps {
		if step <= previous || step < 1 || step > 100 {
			return ErrValidation
		}
		previous = step
	}
	if input.Steps[len(input.Steps)-1] != 100 {
		return ErrValidation
	}
	return nil
}

func (r *Repository) Rollouts(ctx context.Context) ([]Rollout, error) {
	rows, err := r.db.QueryContext(ctx, rolloutSelect+` ORDER BY updated_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rollouts := make([]Rollout, 0)
	for rows.Next() {
		rollout, scanErr := scanRollout(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		rollouts = append(rollouts, rollout)
	}
	return rollouts, rows.Err()
}

func (r *Repository) GetRollout(ctx context.Context, id string) (Rollout, error) {
	rollout, err := scanRollout(r.db.QueryRowContext(ctx, rolloutSelect+` WHERE id = $1::uuid`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Rollout{}, ErrNotFound
	}
	return rollout, err
}

func scanRollout(row rowScanner) (Rollout, error) {
	var rollout Rollout
	var rawStatus string
	var targetScopeRaw, healthGateRaw, baselineTargetingRaw []byte
	if err := row.Scan(
		&rollout.ID,
		&rollout.ChangeSetID,
		&rollout.FeatureFlagKey,
		&rawStatus,
		&targetScopeRaw,
		pq.Array(&rollout.Steps),
		&rollout.CurrentStepIndex,
		&rollout.CurrentPercentage,
		&healthGateRaw,
		&rollout.BaselineEnabled,
		&baselineTargetingRaw,
		&rollout.Version,
		&rollout.CreatedByActorID,
		&rollout.UpdatedByActorID,
		&rollout.Version,
		&rollout.CreatedAt,
		&rollout.UpdatedAt,
		&rollout.StartedAt,
		&rollout.PausedAt,
		&rollout.CompletedAt,
		&rollout.AbortedAt,
		&rollout.RolledBackAt,
	); err != nil {
		return Rollout{}, err
	}
	rollout.Status = RolloutStatus(rawStatus)
	if err := json.Unmarshal(targetScopeRaw, &rollout.TargetScope); err != nil {
		return Rollout{}, err
	}
	if err := json.Unmarshal(healthGateRaw, &rollout.HealthGate); err != nil {
		return Rollout{}, err
	}
	if err := json.Unmarshal(baselineTargetingRaw, &rollout.BaselineTargeting); err != nil {
		return Rollout{}, err
	}
	return rollout, nil
}

func (r *Repository) CreateRollout(
	ctx context.Context,
	actorID string,
	actorRoles []string,
	correlationID string,
	input CreateRolloutInput,
) (Rollout, error) {
	if err := validateRolloutInput(input); err != nil {
		return Rollout{}, err
	}
	targetScopeRaw, err := json.Marshal(input.TargetScope)
	if err != nil {
		return Rollout{}, ErrValidation
	}
	healthGateRaw, err := json.Marshal(input.HealthGate)
	if err != nil {
		return Rollout{}, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return Rollout{}, err
	}
	defer tx.Rollback()

	var changeSetStatus string
	var itemCount int
	if err := tx.QueryRowContext(ctx, `
SELECT cs.status, COUNT(csi.id)
FROM platform_change_sets cs
JOIN platform_change_set_items csi ON csi.change_set_id = cs.id
WHERE cs.id = $1::uuid
  AND csi.target_type = 'feature_flag'
  AND csi.target_key = $2
GROUP BY cs.id, cs.status`, input.ChangeSetID, input.FeatureFlagKey).Scan(&changeSetStatus, &itemCount); errors.Is(err, sql.ErrNoRows) {
		return Rollout{}, ErrValidation
	} else if err != nil {
		return Rollout{}, err
	}
	if ChangeSetStatus(changeSetStatus) != ChangeSetApplied || itemCount == 0 {
		return Rollout{}, ErrInvalidTransition
	}

	var baselineEnabled bool
	var baselineTargetingRaw []byte
	var flagRevision int64
	if err := tx.QueryRowContext(ctx, `
SELECT enabled, targeting_json, revision
FROM platform_feature_flags
WHERE flag_key = $1
FOR UPDATE`, input.FeatureFlagKey).Scan(&baselineEnabled, &baselineTargetingRaw, &flagRevision); errors.Is(err, sql.ErrNoRows) {
		return Rollout{}, ErrNotFound
	} else if err != nil {
		return Rollout{}, err
	}

	var id string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO platform_rollouts
    (change_set_id, feature_flag_key, target_scope_json, steps,
     health_gate_json, baseline_enabled, baseline_targeting_json,
     flag_revision, created_by_actor_id, updated_by_actor_id)
VALUES ($1::uuid, $2, $3::jsonb, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $9)
RETURNING id::text`,
		input.ChangeSetID,
		input.FeatureFlagKey,
		targetScopeRaw,
		pq.Array(input.Steps),
		healthGateRaw,
		baselineEnabled,
		baselineTargetingRaw,
		flagRevision,
		actorID,
	).Scan(&id); err != nil {
		if isUniqueViolation(err) {
			return Rollout{}, ErrInvalidTransition
		}
		return Rollout{}, err
	}
	if err := insertAudit(ctx, tx, input.ChangeSetID, "rollout_created", actorID, actorRoles, string(RolloutRunning), id, correlationID, nil, input); err != nil {
		return Rollout{}, err
	}
	if err := tx.Commit(); err != nil {
		return Rollout{}, err
	}
	return r.GetRollout(ctx, id)
}

func (r *Repository) AdvanceRollout(
	ctx context.Context,
	id, actorID string,
	actorRoles []string,
	correlationID string,
) (Rollout, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return Rollout{}, err
	}
	defer tx.Rollback()

	rollout, err := lockRollout(ctx, tx, id)
	if err != nil {
		return Rollout{}, err
	}
	if rollout.Status != RolloutRunning && rollout.Status != RolloutPaused {
		return Rollout{}, ErrInvalidTransition
	}
	nextIndex := rollout.CurrentStepIndex + 1
	if nextIndex < 0 || nextIndex >= len(rollout.Steps) {
		return Rollout{}, ErrInvalidTransition
	}
	nextPercentage := rollout.Steps[nextIndex]
	nextTargeting := map[string]any{
		"rolloutId":  rollout.ID,
		"percentage": nextPercentage,
		"scope":      rollout.TargetScope,
	}
	nextTargetingRaw, err := json.Marshal(nextTargeting)
	if err != nil {
		return Rollout{}, err
	}
	result, err := tx.ExecContext(ctx, `
UPDATE platform_feature_flags
SET enabled = true, targeting_json = $2::jsonb, revision = revision + 1, updated_at = NOW()
WHERE flag_key = $1 AND revision = $3`, rollout.FeatureFlagKey, nextTargetingRaw, rollout.Version)
	if err != nil {
		return Rollout{}, err
	}
	if err := requireOneRow(result, nil); err != nil {
		return Rollout{}, ErrVersionConflict
	}
	nextFlagRevision := rollout.Version + 1
	nextStatus := RolloutRunning
	completedExpression := "NULL"
	if nextIndex == len(rollout.Steps)-1 {
		nextStatus = RolloutCompleted
		completedExpression = "NOW()"
	}
	query := fmt.Sprintf(`
UPDATE platform_rollouts
SET status = $2, current_step_index = $3, current_percentage = $4,
    flag_revision = $5, updated_by_actor_id = $6, updated_at = NOW(),
    paused_at = NULL, completed_at = %s, version = version + 1
WHERE id = $1::uuid`, completedExpression)
	if _, err := tx.ExecContext(ctx, query, id, nextStatus, nextIndex, nextPercentage, nextFlagRevision, actorID); err != nil {
		return Rollout{}, err
	}
	if err := insertAudit(ctx, tx, rollout.ChangeSetID, "rollout_advanced", actorID, actorRoles, string(nextStatus), id, correlationID,
		map[string]any{"percentage": rollout.CurrentPercentage}, map[string]any{"percentage": nextPercentage}); err != nil {
		return Rollout{}, err
	}
	if err := tx.Commit(); err != nil {
		return Rollout{}, err
	}
	return r.GetRollout(ctx, id)
}

func (r *Repository) PauseRollout(ctx context.Context, id, actorID string, actorRoles []string, correlationID string) (Rollout, error) {
	return r.updateRolloutStatus(ctx, id, actorID, actorRoles, correlationID, []RolloutStatus{RolloutRunning}, RolloutPaused, "paused_at", "rollout_paused")
}

func (r *Repository) AbortRollout(ctx context.Context, id, actorID string, actorRoles []string, correlationID string) (Rollout, error) {
	return r.restoreRolloutBaseline(ctx, id, actorID, actorRoles, correlationID, []RolloutStatus{RolloutRunning, RolloutPaused}, RolloutAborted, "aborted_at", "rollout_aborted")
}

func (r *Repository) RollbackRollout(ctx context.Context, id, actorID string, actorRoles []string, correlationID string) (Rollout, error) {
	return r.restoreRolloutBaseline(ctx, id, actorID, actorRoles, correlationID, []RolloutStatus{RolloutCompleted}, RolloutRolledBack, "rolled_back_at", "rollout_rolled_back")
}

func (r *Repository) updateRolloutStatus(
	ctx context.Context,
	id, actorID string,
	actorRoles []string,
	correlationID string,
	allowed []RolloutStatus,
	next RolloutStatus,
	timestampColumn, action string,
) (Rollout, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return Rollout{}, err
	}
	defer tx.Rollback()
	rollout, err := lockRollout(ctx, tx, id)
	if err != nil {
		return Rollout{}, err
	}
	if !rolloutStatusAllowed(rollout.Status, allowed) {
		return Rollout{}, ErrInvalidTransition
	}
	query := fmt.Sprintf(`
UPDATE platform_rollouts
SET status = $2, %s = NOW(), updated_by_actor_id = $3,
    updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, timestampColumn)
	if _, err := tx.ExecContext(ctx, query, id, next, actorID); err != nil {
		return Rollout{}, err
	}
	if err := insertAudit(ctx, tx, rollout.ChangeSetID, action, actorID, actorRoles, string(next), id, correlationID,
		map[string]any{"status": rollout.Status}, map[string]any{"status": next}); err != nil {
		return Rollout{}, err
	}
	if err := tx.Commit(); err != nil {
		return Rollout{}, err
	}
	return r.GetRollout(ctx, id)
}

func (r *Repository) restoreRolloutBaseline(
	ctx context.Context,
	id, actorID string,
	actorRoles []string,
	correlationID string,
	allowed []RolloutStatus,
	next RolloutStatus,
	timestampColumn, action string,
) (Rollout, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return Rollout{}, err
	}
	defer tx.Rollback()
	rollout, err := lockRollout(ctx, tx, id)
	if err != nil {
		return Rollout{}, err
	}
	if !rolloutStatusAllowed(rollout.Status, allowed) {
		return Rollout{}, ErrInvalidTransition
	}
	baselineTargetingRaw, err := json.Marshal(rollout.BaselineTargeting)
	if err != nil {
		return Rollout{}, err
	}
	result, err := tx.ExecContext(ctx, `
UPDATE platform_feature_flags
SET enabled = $2, targeting_json = $3::jsonb, revision = revision + 1, updated_at = NOW()
WHERE flag_key = $1 AND revision = $4`, rollout.FeatureFlagKey, rollout.BaselineEnabled, baselineTargetingRaw, rollout.Version)
	if err != nil {
		return Rollout{}, err
	}
	if err := requireOneRow(result, nil); err != nil {
		return Rollout{}, ErrVersionConflict
	}
	nextFlagRevision := rollout.Version + 1
	query := fmt.Sprintf(`
UPDATE platform_rollouts
SET status = $2, %s = NOW(), flag_revision = $3,
    updated_by_actor_id = $4, updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, timestampColumn)
	if _, err := tx.ExecContext(ctx, query, id, next, nextFlagRevision, actorID); err != nil {
		return Rollout{}, err
	}
	if err := insertAudit(ctx, tx, rollout.ChangeSetID, action, actorID, actorRoles, string(next), id, correlationID,
		map[string]any{"percentage": rollout.CurrentPercentage}, map[string]any{"percentage": 0}); err != nil {
		return Rollout{}, err
	}
	if err := tx.Commit(); err != nil {
		return Rollout{}, err
	}
	return r.GetRollout(ctx, id)
}

func lockRollout(ctx context.Context, tx *sql.Tx, id string) (Rollout, error) {
	rollout, err := scanRollout(tx.QueryRowContext(ctx, rolloutSelect+` WHERE id = $1::uuid FOR UPDATE`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Rollout{}, ErrNotFound
	}
	return rollout, err
}

func rolloutStatusAllowed(current RolloutStatus, allowed []RolloutStatus) bool {
	for _, candidate := range allowed {
		if current == candidate {
			return true
		}
	}
	return false
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}
