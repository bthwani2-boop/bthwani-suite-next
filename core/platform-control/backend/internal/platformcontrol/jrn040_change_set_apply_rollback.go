package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

func (r *Repository) ApplyChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	status, err := lockChangeSetStatus(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if status != ChangeSetApproved { return ChangeSet{}, ErrInvalidTransition }
	items, err := loadGovernedChangeSetItemsForUpdate(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if len(items) == 0 { return ChangeSet{}, ErrValidation }
	for _, item := range items {
		if err := lockGovernedTarget(ctx, tx, item); err != nil { return ChangeSet{}, err }
		if err := applyGovernedItem(ctx, tx, item); err != nil { return ChangeSet{}, err }
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'applied', applied_by_actor_id = $2, applied_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id, actorID); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, "change_set_applied", actorID, roles, string(ChangeSetApplied), "", correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetApplied, "appliedItemCount": len(items), "valuesRedacted": true}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func applyGovernedItem(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	if item.ValidatedRevision == nil || item.ItemValidatedAt == nil { return fmt.Errorf("%w: %s", ErrValidationSnapshot, item.TargetKey) }
	snapshot, revision, _, err := readGovernedTargetSnapshot(ctx, tx, item)
	if err != nil { return err }
	if revision != *item.ValidatedRevision || !jsonEquivalent(snapshot, item.PreconditionSnapshot) { return fmt.Errorf("%w: validation snapshot for %s is stale", ErrVersionConflict, item.TargetKey) }
	beforeRaw, err := marshalNullable(snapshot)
	if err != nil { return err }
	nextRevision := revision + 1
	switch item.TargetType {
	case ChangeTargetVariable:
		proposedRaw, err := json.Marshal(item.ProposedValue)
		if err != nil { return err }
		if _, err := tx.ExecContext(ctx, `INSERT INTO platform_variables (variable_key, owner_service, value_type, classification, scope_type, scope_id, value_json, revision, status, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'active', NOW()) ON CONFLICT (variable_key, scope_type, scope_id) DO UPDATE SET owner_service = EXCLUDED.owner_service, value_type = EXCLUDED.value_type, classification = EXCLUDED.classification, value_json = EXCLUDED.value_json, revision = EXCLUDED.revision, status = 'active', updated_at = NOW()`, item.TargetKey, item.OwnerService, item.ValueType, item.Classification, item.ScopeType, item.ScopeID, proposedRaw, nextRevision); err != nil { return err }
	case ChangeTargetFeatureFlag:
		enabled, ok := item.ProposedValue.(bool)
		if !ok { return ErrValidation }
		if _, err := tx.ExecContext(ctx, `INSERT INTO platform_feature_flags (flag_key, owner_service, enabled, revision, status, updated_at) VALUES ($1, $2, $3, $4, 'active', NOW()) ON CONFLICT (flag_key) DO UPDATE SET owner_service = EXCLUDED.owner_service, enabled = EXCLUDED.enabled, revision = EXCLUDED.revision, status = 'active', updated_at = NOW()`, item.TargetKey, item.OwnerService, enabled, nextRevision); err != nil { return err }
	default:
		return ErrValidation
	}
	_, err = tx.ExecContext(ctx, `UPDATE platform_change_set_items SET before_value_json = $2::jsonb, applied_revision = $3 WHERE id = $1::uuid`, item.ID, beforeRaw, nextRevision)
	return err
}

func (r *Repository) RollbackChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID, reason string) (ChangeSet, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" { return ChangeSet{}, ErrRollbackReason }
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	status, err := lockChangeSetStatus(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if status != ChangeSetApplied { return ChangeSet{}, ErrInvalidTransition }
	items, err := loadGovernedChangeSetItemsForUpdate(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if len(items) == 0 { return ChangeSet{}, ErrValidation }
	for index := len(items) - 1; index >= 0; index-- {
		if err := lockGovernedTarget(ctx, tx, items[index]); err != nil { return ChangeSet{}, err }
		if err := rollbackGovernedItem(ctx, tx, items[index]); err != nil { return ChangeSet{}, err }
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'rolled_back', rolled_back_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, "change_set_rolled_back", actorID, roles, string(ChangeSetRolledBack), reason, correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetRolledBack, "rolledBackItemCount": len(items), "valuesRedacted": true}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func rollbackGovernedItem(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	if item.AppliedRevision == nil { return ErrInvalidTransition }
	switch item.TargetType {
	case ChangeTargetVariable:
		return rollbackGovernedVariable(ctx, tx, item)
	case ChangeTargetFeatureFlag:
		return rollbackGovernedFeatureFlag(ctx, tx, item)
	default:
		return ErrValidation
	}
}

func rollbackGovernedVariable(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	var currentRevision int64
	if err := tx.QueryRowContext(ctx, `SELECT revision FROM platform_variables WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 FOR UPDATE`, item.TargetKey, item.ScopeType, item.ScopeID).Scan(&currentRevision); errors.Is(err, sql.ErrNoRows) { return ErrVersionConflict } else if err != nil { return err }
	if currentRevision != *item.AppliedRevision { return ErrVersionConflict }
	if item.BeforeValue == nil {
		result, err := tx.ExecContext(ctx, `DELETE FROM platform_variables WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 AND revision = $4`, item.TargetKey, item.ScopeType, item.ScopeID, currentRevision)
		return requireOneRow(result, err)
	}
	var snapshot variableStateSnapshot
	if decodeErr := decodeSnapshot(item.BeforeValue, &snapshot); decodeErr == nil && snapshot.Kind == "variable" {
		valueRaw, err := json.Marshal(snapshot.Value)
		if err != nil { return err }
		result, err := tx.ExecContext(ctx, `UPDATE platform_variables SET owner_service = $4, value_type = $5, classification = $6, status = $7, value_json = $8::jsonb, revision = revision + 1, updated_at = NOW() WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 AND revision = $9`, item.TargetKey, item.ScopeType, item.ScopeID, snapshot.OwnerService, snapshot.ValueType, snapshot.Classification, snapshot.Status, valueRaw, currentRevision)
		return requireOneRow(result, err)
	}
	beforeRaw, err := json.Marshal(item.BeforeValue)
	if err != nil { return err }
	result, err := tx.ExecContext(ctx, `UPDATE platform_variables SET value_json = $4::jsonb, revision = revision + 1, updated_at = NOW() WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 AND revision = $5`, item.TargetKey, item.ScopeType, item.ScopeID, beforeRaw, currentRevision)
	return requireOneRow(result, err)
}

func rollbackGovernedFeatureFlag(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	var currentRevision int64
	if err := tx.QueryRowContext(ctx, `SELECT revision FROM platform_feature_flags WHERE flag_key = $1 FOR UPDATE`, item.TargetKey).Scan(&currentRevision); errors.Is(err, sql.ErrNoRows) { return ErrVersionConflict } else if err != nil { return err }
	if currentRevision != *item.AppliedRevision { return ErrVersionConflict }
	if item.BeforeValue == nil {
		result, err := tx.ExecContext(ctx, `DELETE FROM platform_feature_flags WHERE flag_key = $1 AND revision = $2`, item.TargetKey, currentRevision)
		return requireOneRow(result, err)
	}
	var snapshot featureFlagStateSnapshot
	if decodeErr := decodeSnapshot(item.BeforeValue, &snapshot); decodeErr == nil && snapshot.Kind == "feature_flag" {
		targetingRaw, err := json.Marshal(snapshot.Targeting)
		if err != nil { return err }
		result, err := tx.ExecContext(ctx, `UPDATE platform_feature_flags SET owner_service = $2, enabled = $3, status = $4, targeting_json = $5::jsonb, revision = revision + 1, updated_at = NOW() WHERE flag_key = $1 AND revision = $6`, item.TargetKey, snapshot.OwnerService, snapshot.Enabled, snapshot.Status, targetingRaw, currentRevision)
		return requireOneRow(result, err)
	}
	beforeEnabled, ok := item.BeforeValue.(bool)
	if !ok { return ErrValidation }
	result, err := tx.ExecContext(ctx, `UPDATE platform_feature_flags SET enabled = $2, revision = revision + 1, updated_at = NOW() WHERE flag_key = $1 AND revision = $3`, item.TargetKey, beforeEnabled, currentRevision)
	return requireOneRow(result, err)
}
