package platformcontrol

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
)

func (r *Repository) ValidateChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	status, err := lockChangeSetStatus(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if status != ChangeSetDraft { return ChangeSet{}, ErrInvalidTransition }
	items, err := loadGovernedChangeSetItemsForUpdate(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if len(items) == 0 { return ChangeSet{}, ErrValidation }
	for _, item := range items {
		if err := lockGovernedTarget(ctx, tx, item); err != nil { return ChangeSet{}, err }
		if err := ensureNoActiveTargetConflict(ctx, tx, id, item); err != nil { return ChangeSet{}, err }
		snapshot, revision, _, err := readGovernedTargetSnapshot(ctx, tx, item)
		if err != nil { return ChangeSet{}, err }
		if revision != item.ExpectedRevision { return ChangeSet{}, fmt.Errorf("%w: %s expected revision %d but current revision is %d", ErrVersionConflict, item.TargetKey, item.ExpectedRevision, revision) }
		validatedRaw, err := marshalNullable(snapshot)
		if err != nil { return ChangeSet{}, err }
		if _, err := tx.ExecContext(ctx, `UPDATE platform_change_set_items SET validated_value_json = $2::jsonb, validated_revision = $3, validated_at = NOW() WHERE id = $1::uuid`, item.ID, validatedRaw, revision); err != nil { return ChangeSet{}, err }
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'validated', validated_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, "change_set_validated", actorID, roles, string(ChangeSetValidated), "", correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetValidated, "validatedItemCount": len(items), "valuesRedacted": true}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func (r *Repository) SubmitChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return r.governedTransitionWithPreconditions(ctx, id, ChangeSetValidated, ChangeSetSubmitted, actorID, roles, correlationID, "change_set_submitted")
}

func (r *Repository) governedTransitionWithPreconditions(ctx context.Context, id string, expected, next ChangeSetStatus, actorID string, roles []string, correlationID, action string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	status, err := lockChangeSetStatus(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if status != expected { return ChangeSet{}, ErrInvalidTransition }
	items, err := loadGovernedChangeSetItemsForUpdate(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if err := verifyGovernedPreconditions(ctx, tx, items); err != nil { return ChangeSet{}, err }
	if next != ChangeSetSubmitted { return ChangeSet{}, ErrInvalidTransition }
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'submitted', submitted_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, action, actorID, roles, string(next), "", correlationID, map[string]any{"status": status}, map[string]any{"status": next}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func (r *Repository) ApproveChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	var proposer, rawStatus string
	if err := tx.QueryRowContext(ctx, `SELECT proposer_actor_id, status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&proposer, &rawStatus); errors.Is(err, sql.ErrNoRows) { return ChangeSet{}, ErrNotFound } else if err != nil { return ChangeSet{}, err }
	if ChangeSetStatus(rawStatus) != ChangeSetSubmitted { return ChangeSet{}, ErrInvalidTransition }
	if proposer == actorID { return ChangeSet{}, ErrMakerCheckerReview }
	items, err := loadGovernedChangeSetItemsForUpdate(ctx, tx, id)
	if err != nil { return ChangeSet{}, err }
	if err := verifyGovernedPreconditions(ctx, tx, items); err != nil { return ChangeSet{}, err }
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'approved', approver_actor_id = $2, approved_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id, actorID); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, "change_set_approved", actorID, roles, string(ChangeSetApproved), "", correlationID, map[string]any{"status": rawStatus}, map[string]any{"status": ChangeSetApproved}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func (r *Repository) RejectChangeSetGoverned(ctx context.Context, id, actorID string, roles []string, correlationID, reason string) (ChangeSet, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" { return ChangeSet{}, ErrValidation }
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return ChangeSet{}, err }
	defer tx.Rollback()
	var proposer, rawStatus string
	if err := tx.QueryRowContext(ctx, `SELECT proposer_actor_id, status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&proposer, &rawStatus); errors.Is(err, sql.ErrNoRows) { return ChangeSet{}, ErrNotFound } else if err != nil { return ChangeSet{}, err }
	if ChangeSetStatus(rawStatus) != ChangeSetSubmitted { return ChangeSet{}, ErrInvalidTransition }
	if proposer == actorID { return ChangeSet{}, ErrMakerCheckerReview }
	if _, err := tx.ExecContext(ctx, `UPDATE platform_change_sets SET status = 'rejected', rejected_by_actor_id = $2, rejection_reason = $3, rejected_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1::uuid`, id, actorID, reason); err != nil { return ChangeSet{}, err }
	if err := insertAudit(ctx, tx, id, "change_set_rejected", actorID, roles, string(ChangeSetRejected), reason, correlationID, map[string]any{"status": rawStatus}, map[string]any{"status": ChangeSetRejected}); err != nil { return ChangeSet{}, err }
	if err := tx.Commit(); err != nil { return ChangeSet{}, err }
	return r.GetChangeSetGoverned(ctx, id)
}

func verifyGovernedPreconditions(ctx context.Context, tx *sql.Tx, items []ChangeSetItem) error {
	if len(items) == 0 { return ErrValidation }
	sortedItems := append([]ChangeSetItem(nil), items...)
	sort.Slice(sortedItems, func(i, j int) bool { return governedTargetIdentity(sortedItems[i]) < governedTargetIdentity(sortedItems[j]) })
	for _, item := range sortedItems {
		if item.ValidatedRevision == nil || item.ItemValidatedAt == nil { return fmt.Errorf("%w: %s", ErrValidationSnapshot, item.TargetKey) }
		if err := lockGovernedTarget(ctx, tx, item); err != nil { return err }
		snapshot, revision, _, err := readGovernedTargetSnapshot(ctx, tx, item)
		if err != nil { return err }
		if revision != *item.ValidatedRevision || !jsonEquivalent(snapshot, item.PreconditionSnapshot) { return fmt.Errorf("%w: validation snapshot for %s is stale", ErrVersionConflict, item.TargetKey) }
	}
	return nil
}

func lockGovernedTarget(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	_, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, governedTargetIdentity(item))
	return err
}

func governedTargetIdentity(item ChangeSetItem) string {
	return strings.Join([]string{string(item.TargetType), strings.TrimSpace(item.TargetKey), strings.TrimSpace(item.ScopeType), strings.TrimSpace(item.ScopeID)}, "|")
}

func ensureNoActiveTargetConflict(ctx context.Context, tx *sql.Tx, changeSetID string, item ChangeSetItem) error {
	var conflictID string
	err := tx.QueryRowContext(ctx, `SELECT change_set.id::text FROM platform_change_set_items AS candidate JOIN platform_change_sets AS change_set ON change_set.id = candidate.change_set_id WHERE candidate.change_set_id <> $1::uuid AND candidate.target_type = $2 AND candidate.target_key = $3 AND candidate.scope_type = $4 AND candidate.scope_id = $5 AND change_set.status IN ('validated', 'submitted', 'approved') ORDER BY change_set.created_at, change_set.id LIMIT 1 FOR UPDATE OF change_set`, changeSetID, item.TargetType, item.TargetKey, item.ScopeType, item.ScopeID).Scan(&conflictID)
	if errors.Is(err, sql.ErrNoRows) { return nil }
	if err != nil { return err }
	return fmt.Errorf("%w: %s is reserved by %s", ErrTargetConflict, governedTargetIdentity(item), conflictID)
}

func readGovernedTargetSnapshot(ctx context.Context, tx *sql.Tx, item ChangeSetItem) (any, int64, bool, error) {
	switch item.TargetType {
	case ChangeTargetVariable:
		var snapshot variableStateSnapshot
		var raw []byte
		var revision int64
		err := tx.QueryRowContext(ctx, `SELECT owner_service, value_type, classification, status, value_json, revision FROM platform_variables WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 FOR UPDATE`, item.TargetKey, item.ScopeType, item.ScopeID).Scan(&snapshot.OwnerService, &snapshot.ValueType, &snapshot.Classification, &snapshot.Status, &raw, &revision)
		if errors.Is(err, sql.ErrNoRows) { return nil, 0, false, nil }
		if err != nil { return nil, 0, false, err }
		if err := json.Unmarshal(raw, &snapshot.Value); err != nil { return nil, 0, false, err }
		snapshot.Kind = "variable"
		return snapshot, revision, true, nil
	case ChangeTargetFeatureFlag:
		var snapshot featureFlagStateSnapshot
		var targetingRaw []byte
		var revision int64
		err := tx.QueryRowContext(ctx, `SELECT owner_service, status, enabled, targeting_json, revision FROM platform_feature_flags WHERE flag_key = $1 FOR UPDATE`, item.TargetKey).Scan(&snapshot.OwnerService, &snapshot.Status, &snapshot.Enabled, &targetingRaw, &revision)
		if errors.Is(err, sql.ErrNoRows) { return nil, 0, false, nil }
		if err != nil { return nil, 0, false, err }
		if err := json.Unmarshal(targetingRaw, &snapshot.Targeting); err != nil { return nil, 0, false, err }
		snapshot.Kind = "feature_flag"
		return snapshot, revision, true, nil
	default:
		return nil, 0, false, ErrValidation
	}
}

func jsonEquivalent(left, right any) bool {
	leftRaw, leftErr := json.Marshal(left)
	rightRaw, rightErr := json.Marshal(right)
	return leftErr == nil && rightErr == nil && bytes.Equal(leftRaw, rightRaw)
}

func decodeSnapshot(value any, destination any) error {
	raw, err := json.Marshal(value)
	if err != nil { return err }
	return json.Unmarshal(raw, destination)
}
