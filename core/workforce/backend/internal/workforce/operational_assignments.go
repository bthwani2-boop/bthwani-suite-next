package workforce

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

var (
	ErrOverlappingAssignment = errors.New("overlapping active assignment exists for this scope")
)

func (r *Repository) SetOperationalScopes(ctx context.Context, actorID, operatorContextID, role string, inputs []OperationalAssignmentInput, changedBy, correlationID string) (*ActorScopes, error) {
	actorID = strings.TrimSpace(actorID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	role = strings.TrimSpace(role)
	changedBy = strings.TrimSpace(changedBy)
	correlationID = strings.TrimSpace(correlationID)
	if actorID == "" || operatorContextID == "" || role == "" || changedBy == "" || correlationID == "" || len(inputs) > 500 {
		return nil, ErrInvalidInput
	}
	if role != "field" && role != "captain" && role != "employee" {
		return nil, ErrInvalidInput
	}
	seen := make(map[string]struct{}, len(inputs))
	for index := range inputs {
		inputs[index].ScopeType = strings.TrimSpace(inputs[index].ScopeType)
		inputs[index].ScopeTargetID = strings.TrimSpace(inputs[index].ScopeTargetID)
		if !validOperationalScopeType(inputs[index].ScopeType) || inputs[index].ScopeTargetID == "" || inputs[index].StartsOn.IsZero() {
			return nil, ErrInvalidInput
		}
		if inputs[index].EndsOn != nil && !inputs[index].EndsOn.After(inputs[index].StartsOn) {
			return nil, ErrInvalidInput
		}
		key := inputs[index].ScopeType + "\x00" + inputs[index].ScopeTargetID
		if _, duplicate := seen[key]; duplicate {
			return nil, ErrOverlappingAssignment
		}
		seen[key] = struct{}{}
		inputs[index].StartsOn = inputs[index].StartsOn.UTC()
		if inputs[index].EndsOn != nil {
			endsOn := inputs[index].EndsOn.UTC()
			inputs[index].EndsOn = &endsOn
		}
	}
	sort.Slice(inputs, func(left, right int) bool {
		leftKey := fmt.Sprintf("%s\x00%s\x00%s", inputs[left].ScopeType, inputs[left].ScopeTargetID, inputs[left].StartsOn.Format(time.RFC3339Nano))
		rightKey := fmt.Sprintf("%s\x00%s\x00%s", inputs[right].ScopeType, inputs[right].ScopeTargetID, inputs[right].StartsOn.Format(time.RFC3339Nano))
		return leftKey < rightKey
	})
	requestJSON, err := json.Marshal(inputs)
	if err != nil {
		return nil, err
	}
	requestHash := fmt.Sprintf("%x", sha256.Sum256(requestJSON))

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	lockKey := fmt.Sprintf("%x", sha256.Sum256([]byte(actorID+"\x00"+operatorContextID+"\x00"+role)))
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return nil, err
	}
	var existingRequestHash string
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash
		FROM workforce_operational_assignment_audit
		WHERE actor_id = $1 AND operator_context_id = $2 AND role = $3 AND correlation_id = $4`,
		actorID, operatorContextID, role, correlationID).Scan(&existingRequestHash)
	if err == nil {
		if existingRequestHash != requestHash {
			return nil, ErrIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return r.GetOperationalScopes(ctx, actorID, operatorContextID, role)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err := validateActiveShiftScopesTx(ctx, tx, inputs); err != nil {
		return nil, err
	}

	// Deactivate existing affiliations before installing the complete replacement set.
	if _, err := tx.ExecContext(ctx, `
		UPDATE workforce_operational_assignments
		SET active = false, ends_on = NOW()
		WHERE actor_id = $1 AND operator_context_id = $2 AND role = $3 AND active = true`, actorID, operatorContextID, role); err != nil {
		return nil, err
	}

	for _, input := range inputs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO workforce_operational_assignments
			(actor_id, operator_context_id, role, scope_type, scope_target_id, starts_on, ends_on, active, assigned_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
			actorID, operatorContextID, role, input.ScopeType, input.ScopeTargetID, input.StartsOn, input.EndsOn, changedBy); err != nil {
			return nil, err
		}
	}

	storeIDs := make([]string, 0)
	areaCodes := make([]string, 0)
	partnerIDs := make([]string, 0)
	shiftCodes := make([]string, 0)
	for _, input := range inputs {
		switch input.ScopeType {
		case "store":
			storeIDs = append(storeIDs, input.ScopeTargetID)
		case "area":
			areaCodes = append(areaCodes, input.ScopeTargetID)
		case "partner":
			partnerIDs = append(partnerIDs, input.ScopeTargetID)
		case "shift":
			shiftCodes = append(shiftCodes, input.ScopeTargetID)
		}
	}

	storeJSON, err := json.Marshal(storeIDs)
	if err != nil {
		return nil, err
	}
	areaJSON, err := json.Marshal(areaCodes)
	if err != nil {
		return nil, err
	}
	partnerJSON, err := json.Marshal(partnerIDs)
	if err != nil {
		return nil, err
	}
	shiftJSON, err := json.Marshal(shiftCodes)
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO workforce_operational_assignment_audit
		(actor_id, operator_context_id, role, changed_by, store_ids, service_areas, partner_ids, shift_codes, correlation_id, request_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		actorID, operatorContextID, role, changedBy, storeJSON, areaJSON, partnerJSON, shiftJSON, correlationID, requestHash); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetOperationalScopes(ctx, actorID, operatorContextID, role)
}

func validateActiveShiftScopesTx(ctx context.Context, tx *sql.Tx, inputs []OperationalAssignmentInput) error {
	for _, input := range inputs {
		if input.ScopeType != "shift" {
			continue
		}
		var active bool
		err := tx.QueryRowContext(ctx, `SELECT active FROM workforce_shifts WHERE code = $1`, input.ScopeTargetID).Scan(&active)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && !active) {
			return ErrInvalidReference
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) GetOperationalScopes(ctx context.Context, actorID, operatorContextID, role string) (*ActorScopes, error) {
	actorID = strings.TrimSpace(actorID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	role = strings.TrimSpace(role)
	if actorID == "" || operatorContextID == "" || role == "" {
		return nil, ErrInvalidInput
	}
	scopes := &ActorScopes{
		ActorID:           actorID,
		Role:              role,
		OperatorContextID: operatorContextID,
		StoreIDs:          []string{},
		ServiceAreaCodes:  []string{},
		PartnerIDs:        []string{},
		ShiftCodes:        []string{},
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT a.scope_type, a.scope_target_id
		FROM workforce_operational_assignments a
		LEFT JOIN workforce_shifts s
		  ON a.scope_type = 'shift' AND s.code = a.scope_target_id
		WHERE a.actor_id = $1
		  AND a.operator_context_id = $2
		  AND a.role = $3
		  AND a.active = true
		  AND (a.scope_type <> 'shift' OR s.active = true)`, actorID, operatorContextID, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var scopeType, targetID string
		if err := rows.Scan(&scopeType, &targetID); err != nil {
			return nil, err
		}
		switch scopeType {
		case "store":
			scopes.StoreIDs = append(scopes.StoreIDs, targetID)
		case "area":
			scopes.ServiceAreaCodes = append(scopes.ServiceAreaCodes, targetID)
		case "partner":
			scopes.PartnerIDs = append(scopes.PartnerIDs, targetID)
		case "shift":
			scopes.ShiftCodes = append(scopes.ShiftCodes, targetID)
		}
	}
	return scopes, rows.Err()
}

func validOperationalScopeType(scopeType string) bool {
	switch scopeType {
	case "store", "area", "partner", "shift":
		return true
	default:
		return false
	}
}
