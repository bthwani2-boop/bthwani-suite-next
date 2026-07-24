package platformcontrol

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

func (r *Repository) CreateChangeSetStrict(
	ctx context.Context,
	actorID string,
	actorRoles []string,
	correlationID string,
	input CreateChangeSetInput,
) (ChangeSet, error) {
	for _, rawItem := range input.Items {
		item := normalizeGovernedCreateItem(rawItem)
		if isStrictSensitiveClassification(item.Classification) {
			return ChangeSet{}, ErrSensitiveValue
		}
		if item.TargetType != ChangeTargetVariable {
			continue
		}
		var classification string
		err := r.db.QueryRowContext(ctx, `
SELECT classification
FROM platform_variables
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3`,
			item.TargetKey,
			item.ScopeType,
			item.ScopeID,
		).Scan(&classification)
		if errors.Is(err, sql.ErrNoRows) {
			continue
		}
		if err != nil {
			return ChangeSet{}, err
		}
		if isStrictSensitiveClassification(classification) {
			return ChangeSet{}, fmt.Errorf("%w: existing target %s is classified as sensitive", ErrSensitiveValue, item.TargetKey)
		}
	}
	return r.CreateChangeSetGoverned(ctx, actorID, actorRoles, correlationID, input)
}

func (r *Repository) RejectChangeSetStrict(
	ctx context.Context,
	id, actorID string,
	roles []string,
	correlationID, reason string,
) (ChangeSet, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" || len(reason) > maxGovernedTextLength {
		return ChangeSet{}, ErrValidation
	}
	return r.RejectChangeSetGoverned(ctx, id, actorID, roles, correlationID, reason)
}

func (r *Repository) RollbackChangeSetStrict(
	ctx context.Context,
	id, actorID string,
	roles []string,
	correlationID, reason string,
) (ChangeSet, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return ChangeSet{}, ErrRollbackReason
	}
	if len(reason) > maxGovernedTextLength {
		return ChangeSet{}, ErrValidation
	}
	return r.RollbackChangeSetGoverned(ctx, id, actorID, roles, correlationID, reason)
}

func isStrictSensitiveClassification(classification string) bool {
	switch strings.ToLower(strings.TrimSpace(classification)) {
	case "secret", "sensitive", "confidential", "restricted", "credential", "credentials", "password", "token", "private_key", "api_key", "client_secret":
		return true
	default:
		return false
	}
}
