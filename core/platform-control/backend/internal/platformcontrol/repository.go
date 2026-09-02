package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/lib/pq"
)

var (
	ErrNotFound          = errors.New("platform record not found")
	ErrInvalidTransition = errors.New("invalid platform workflow transition")
	ErrVersionConflict   = errors.New("platform revision conflict")
	ErrMakerChecker      = errors.New("proposer cannot approve own change")
	ErrValidation        = errors.New("platform change validation failed")
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Ready(ctx context.Context) error {
	if r == nil || r.db == nil {
		return errors.New("platform repository is not configured")
	}
	return r.db.PingContext(ctx)
}

func persistedState(status string) PlatformControlState {
	if status == "active" {
		return StateOperational
	}
	return StatePartiallyBound
}

func (r *Repository) Variables(ctx context.Context) ([]Variable, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT variable_key, owner_service, value_type, classification, scope_type,
       scope_id, value_json, revision, status, effective_from, expires_at
FROM platform_variables
ORDER BY owner_service, variable_key, scope_type, scope_id`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	variables := make([]Variable, 0)
	for rows.Next() {
		variable, scanErr := scanVariable(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		variables = append(variables, variable)
	}
	return variables, rows.Err()
}

func scanVariable(row rowScanner) (Variable, error) {
	var variable Variable
	var raw []byte
	var revision int64
	var status string
	if err := row.Scan(
		&variable.Key,
		&variable.OwnerService,
		&variable.ValueType,
		&variable.Classification,
		&variable.ScopeType,
		&variable.ScopeID,
		&raw,
		&revision,
		&status,
		&variable.EffectiveFrom,
		&variable.ExpiresAt,
	); err != nil {
		return Variable{}, err
	}
	if err := json.Unmarshal(raw, &variable.Value); err != nil {
		return Variable{}, fmt.Errorf("decode variable %s: %w", variable.Key, err)
	}
	variable.Revision = strconv.FormatInt(revision, 10)
	variable.Status = persistedState(status)
	return variable, nil
}

func (r *Repository) FeatureFlags(ctx context.Context) ([]FeatureFlag, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT flag_key, owner_service, enabled, revision, status, targeting_json
FROM platform_feature_flags
ORDER BY owner_service, flag_key`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	flags := make([]FeatureFlag, 0)
	for rows.Next() {
		var flag FeatureFlag
		var enabled bool
		var revision int64
		var status string
		var targeting []byte
		if err := rows.Scan(
			&flag.Key,
			&flag.Owner,
			&enabled,
			&revision,
			&status,
			&targeting,
		); err != nil {
			return nil, err
		}
		flag.Enabled = &enabled
		flag.Revision = strconv.FormatInt(revision, 10)
		flag.Status = persistedState(status)
		if err := json.Unmarshal(targeting, &flag.Targeting); err != nil {
			return nil, fmt.Errorf("decode flag %s targeting: %w", flag.Key, err)
		}
		flags = append(flags, flag)
	}
	return flags, rows.Err()
}

func (r *Repository) EffectiveRuntimeConfig(ctx context.Context) (EffectiveRuntimeConfig, error) {
	variables, err := r.Variables(ctx)
	if err != nil {
		return EffectiveRuntimeConfig{}, err
	}
	flags, err := r.FeatureFlags(ctx)
	if err != nil {
		return EffectiveRuntimeConfig{}, err
	}

	values := make(map[string]any, len(variables)+len(flags))
	var maxRevision int64
	for _, variable := range variables {
		key := variable.Key
		if variable.ScopeType != "global" || variable.ScopeID != "" {
			key = fmt.Sprintf("%s@%s:%s", variable.Key, variable.ScopeType, variable.ScopeID)
		}
		values[key] = variable.Value
		if revision, parseErr := strconv.ParseInt(variable.Revision, 10, 64); parseErr == nil && revision > maxRevision {
			maxRevision = revision
		}
	}
	for _, flag := range flags {
		values["flag:"+flag.Key] = flag.Enabled != nil && *flag.Enabled
		if revision, parseErr := strconv.ParseInt(flag.Revision, 10, 64); parseErr == nil && revision > maxRevision {
			maxRevision = revision
		}
	}

	return EffectiveRuntimeConfig{
		Revision:        fmt.Sprintf("platform-control-db-%d", maxRevision),
		Stale:           false,
		FallbackUsed:    false,
		EvaluationTrace: []string{"platform-control PostgreSQL store", "active variables and feature flags"},
		Values:          values,
	}, nil
}

func (r *Repository) AuditEvents(ctx context.Context) ([]AuditEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id::text, COALESCE(change_set_id::text, ''), action, actor_id,
       actor_roles, status, reason, correlation_id, created_at
FROM platform_audit_events
ORDER BY created_at DESC
LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	events := make([]AuditEvent, 0)
	for rows.Next() {
		var event AuditEvent
		if err := rows.Scan(
			&event.ID,
			&event.ChangeSetID,
			&event.Action,
			&event.ActorID,
			pq.Array(&event.ActorRoles),
			&event.Status,
			&event.Reason,
			&event.CorrelationID,
			&event.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

const changeSetSelect = `
SELECT id::text, title, reason, impact_assessment, rollback_plan, status,
       proposer_actor_id, COALESCE(approver_actor_id, ''),
       COALESCE(applied_by_actor_id, ''), COALESCE(rejected_by_actor_id, ''),
       COALESCE(rejection_reason, ''), version, created_at, updated_at,
       validated_at, submitted_at, approved_at, rejected_at, applied_at, rolled_back_at
FROM platform_change_sets`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanChangeSet(row rowScanner) (ChangeSet, error) {
	var changeSet ChangeSet
	var status string
	if err := row.Scan(
		&changeSet.ID,
		&changeSet.Title,
		&changeSet.Reason,
		&changeSet.ImpactAssessment,
		&changeSet.RollbackPlan,
		&status,
		&changeSet.ProposerActorID,
		&changeSet.ApproverActorID,
		&changeSet.AppliedByActorID,
		&changeSet.RejectedByActorID,
		&changeSet.RejectionReason,
		&changeSet.Version,
		&changeSet.CreatedAt,
		&changeSet.UpdatedAt,
		&changeSet.ValidatedAt,
		&changeSet.SubmittedAt,
		&changeSet.ApprovedAt,
		&changeSet.RejectedAt,
		&changeSet.AppliedAt,
		&changeSet.RolledBackAt,
	); err != nil {
		return ChangeSet{}, err
	}
	changeSet.Status = ChangeSetStatus(status)
	return changeSet, nil
}

func insertAudit(
	ctx context.Context,
	tx *sql.Tx,
	changeSetID, action, actorID string,
	actorRoles []string,
	status, reason, correlationID string,
	before, after any,
) error {
	beforeRaw, err := marshalNullable(before)
	if err != nil {
		return err
	}
	afterRaw, err := marshalNullable(after)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO platform_audit_events
    (change_set_id, action, actor_id, actor_roles, status, reason,
     before_state_json, after_state_json, correlation_id)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
		changeSetID,
		action,
		actorID,
		pq.Array(actorRoles),
		status,
		strings.TrimSpace(reason),
		beforeRaw,
		afterRaw,
		strings.TrimSpace(correlationID),
	)
	return err
}

func marshalNullable(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return raw, nil
}
