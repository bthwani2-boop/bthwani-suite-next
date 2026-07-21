package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
)

func (r *Repository) GetVariable(ctx context.Context, key, scopeType, scopeID string) (Variable, error) {
	if scopeType == "" {
		scopeType = "global"
	}
	var variable Variable
	var raw []byte
	var revision int64
	var status string
	err := r.db.QueryRowContext(ctx, `
SELECT variable_key, owner_service, value_type, classification, scope_type,
       scope_id, value_json, revision, status, effective_from, expires_at
FROM platform_variables
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3`,
		key, scopeType, scopeID,
	).Scan(
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
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Variable{}, ErrNotFound
	}
	if err != nil {
		return Variable{}, err
	}
	if err := json.Unmarshal(raw, &variable.Value); err != nil {
		return Variable{}, fmt.Errorf("decode variable %s: %w", key, err)
	}
	variable.Revision = strconv.FormatInt(revision, 10)
	variable.Status = persistedState(status)
	return variable, nil
}
