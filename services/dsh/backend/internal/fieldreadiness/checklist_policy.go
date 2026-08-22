package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var ErrChecklistPolicyMissing = errors.New("readiness checklist policy is not configured")

var checkTypePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{2,63}$`)

type ChecklistPolicyItem struct {
	CheckType        string `json:"checkType"`
	LabelAR          string `json:"labelAr"`
	Required         bool   `json:"required"`
	Critical         bool   `json:"critical"`
	EvidenceRequired bool   `json:"evidenceRequired"`
	DisplayOrder     int    `json:"displayOrder"`
}

type ChecklistPolicy struct {
	BusinessVerticalID string                `json:"businessVerticalId"`
	Version            int                   `json:"version"`
	Items              []ChecklistPolicyItem `json:"items"`
}

func validatePolicyItems(items []ChecklistPolicyItem) error {
	if len(items) == 0 || len(items) > 50 {
		return fmt.Errorf("%w: checklist must contain between 1 and 50 items", ErrInvalid)
	}
	seenTypes := make(map[string]struct{}, len(items))
	seenOrders := make(map[int]struct{}, len(items))
	for _, item := range items {
		item.CheckType = strings.TrimSpace(item.CheckType)
		item.LabelAR = strings.TrimSpace(item.LabelAR)
		if !checkTypePattern.MatchString(item.CheckType) {
			return fmt.Errorf("%w: invalid checklist check type", ErrInvalid)
		}
		if len([]rune(item.LabelAR)) < 2 || len([]rune(item.LabelAR)) > 160 {
			return fmt.Errorf("%w: checklist label must be between 2 and 160 characters", ErrInvalid)
		}
		if item.DisplayOrder < 0 || item.DisplayOrder > 1000 {
			return fmt.Errorf("%w: invalid checklist display order", ErrInvalid)
		}
		if item.Critical && (!item.Required || !item.EvidenceRequired) {
			return fmt.Errorf("%w: a critical checklist item must be required and require evidence", ErrInvalid)
		}
		if _, exists := seenTypes[item.CheckType]; exists {
			return fmt.Errorf("%w: duplicate checklist check type", ErrInvalid)
		}
		if _, exists := seenOrders[item.DisplayOrder]; exists {
			return fmt.Errorf("%w: duplicate checklist display order", ErrInvalid)
		}
		seenTypes[item.CheckType] = struct{}{}
		seenOrders[item.DisplayOrder] = struct{}{}
	}
	return nil
}

func snapshotChecklistPolicyTx(ctx context.Context, tx *sql.Tx, visitID, storeID string) error {
	result, err := tx.ExecContext(ctx, `
		WITH store_scope AS (
			SELECT store.operator_context_id,
			       COALESCE(partner.business_vertical_id, store.catalog_domain_id, 'default') AS business_vertical_id
			FROM dsh_stores store
			LEFT JOIN dsh_partners partner ON partner.id = store.partner_id
			WHERE store.id = $2
		), selected_template AS (
			SELECT template.*
			FROM dsh_readiness_checklist_templates template
			CROSS JOIN store_scope scope
			WHERE (template.operator_context_id = scope.operator_context_id
			       AND template.business_vertical_id = scope.business_vertical_id)
			   OR (template.operator_context_id = 'system-default'
			       AND template.business_vertical_id IN (scope.business_vertical_id, 'default'))
			ORDER BY CASE
			  WHEN template.operator_context_id = scope.operator_context_id THEN 0
			  WHEN template.business_vertical_id = scope.business_vertical_id THEN 1
			  ELSE 2
			END
			LIMIT 1
		)
		INSERT INTO dsh_visit_checklist_requirements
		  (visit_id, template_id, template_version, business_vertical_id, check_type,
		   label_ar, required, critical, evidence_required, display_order)
		SELECT $1, template.id, template.version, template.business_vertical_id,
		       item.check_type, item.label_ar, item.required, item.critical,
		       item.evidence_required, item.display_order
		FROM selected_template template
		JOIN dsh_readiness_checklist_template_items item ON item.template_id = template.id
		ORDER BY item.display_order`, visitID, storeID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrChecklistPolicyMissing
	}
	return nil
}

func checklistItemExists(ctx context.Context, db *sql.DB, visitID, checkType string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM dsh_visit_checklist_requirements
			WHERE visit_id = $1 AND check_type = $2
		)`, visitID, checkType).Scan(&exists)
	return exists, err
}

type checklistQueryRower interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func hydrateChecklistMetadata(ctx context.Context, q checklistQueryRower, check *ReadinessCheck) error {
	return q.QueryRowContext(ctx, `
		SELECT label_ar, required, critical, display_order
		FROM dsh_visit_checklist_requirements
		WHERE visit_id = $1 AND check_type = $2`, check.VisitID, check.CheckType).
		Scan(&check.LabelAR, &check.Required, &check.Critical, &check.DisplayOrder)
}

func ListChecklistPolicy(ctx context.Context, db *sql.DB, operatorContextID, businessVerticalID string) (ChecklistPolicy, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	businessVerticalID = strings.TrimSpace(businessVerticalID)
	if operatorContextID == "" || businessVerticalID == "" {
		return ChecklistPolicy{}, ErrForbidden
	}
	var policy ChecklistPolicy
	var templateID string
	err := db.QueryRowContext(ctx, `
		SELECT id, CASE WHEN operator_context_id = $1 THEN version ELSE 0 END
		FROM dsh_readiness_checklist_templates
		WHERE (operator_context_id = $1 AND business_vertical_id = $2)
		   OR (operator_context_id = 'system-default' AND business_vertical_id IN ($2, 'default'))
		ORDER BY CASE
		  WHEN operator_context_id = $1 THEN 0
		  WHEN business_vertical_id = $2 THEN 1
		  ELSE 2
		END
		LIMIT 1`, operatorContextID, businessVerticalID).
		Scan(&templateID, &policy.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return ChecklistPolicy{}, ErrNotFound
	}
	if err != nil {
		return ChecklistPolicy{}, err
	}
	policy.BusinessVerticalID = businessVerticalID
	rows, err := db.QueryContext(ctx, `
		SELECT check_type, label_ar, required, critical, evidence_required, display_order
		FROM dsh_readiness_checklist_template_items
		WHERE template_id = $1 ORDER BY display_order`, templateID)
	if err != nil {
		return ChecklistPolicy{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var item ChecklistPolicyItem
		if err := rows.Scan(&item.CheckType, &item.LabelAR, &item.Required, &item.Critical, &item.EvidenceRequired, &item.DisplayOrder); err != nil {
			return ChecklistPolicy{}, err
		}
		policy.Items = append(policy.Items, item)
	}
	return policy, rows.Err()
}

func ReplaceChecklistPolicy(ctx context.Context, db *sql.DB, operatorContextID, businessVerticalID, updatedBy string, expectedVersion int, items []ChecklistPolicyItem) (ChecklistPolicy, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	businessVerticalID = strings.TrimSpace(businessVerticalID)
	updatedBy = strings.TrimSpace(updatedBy)
	if operatorContextID == "" || businessVerticalID == "" || updatedBy == "" || expectedVersion < 0 {
		return ChecklistPolicy{}, ErrInvalid
	}
	if err := validatePolicyItems(items); err != nil {
		return ChecklistPolicy{}, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ChecklistPolicy{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var templateID string
	var version int
	err = tx.QueryRowContext(ctx, `
		SELECT id, version FROM dsh_readiness_checklist_templates
		WHERE operator_context_id = $1 AND business_vertical_id = $2 FOR UPDATE`, operatorContextID, businessVerticalID).
		Scan(&templateID, &version)
	if errors.Is(err, sql.ErrNoRows) {
		if expectedVersion != 0 {
			return ChecklistPolicy{}, ErrConflict
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_readiness_checklist_templates
			  (operator_context_id, business_vertical_id, updated_by)
			VALUES ($1,$2,$3) RETURNING id, version`, operatorContextID, businessVerticalID, updatedBy).
			Scan(&templateID, &version)
	} else if err == nil {
		if version != expectedVersion {
			return ChecklistPolicy{}, ErrConflict
		}
		version++
		_, err = tx.ExecContext(ctx, `
			UPDATE dsh_readiness_checklist_templates
			SET version = $2, updated_by = $3, updated_at = NOW()
			WHERE id = $1`, templateID, version, updatedBy)
	}
	if err != nil {
		return ChecklistPolicy{}, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM dsh_readiness_checklist_template_items WHERE template_id = $1`, templateID); err != nil {
		return ChecklistPolicy{}, err
	}
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_readiness_checklist_template_items
			  (template_id, check_type, label_ar, required, critical, evidence_required, display_order)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`, templateID, strings.TrimSpace(item.CheckType), strings.TrimSpace(item.LabelAR), item.Required, item.Critical, item.EvidenceRequired, item.DisplayOrder); err != nil {
			return ChecklistPolicy{}, err
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_readiness_checklist_policy_events
		  (template_id, operator_context_id, business_vertical_id, version, changed_by, items_snapshot)
		SELECT $1, $2, $3, $4, $5,
		       jsonb_agg(jsonb_build_object(
		         'checkType', check_type,
		         'labelAr', label_ar,
		         'required', required,
		         'critical', critical,
		         'evidenceRequired', evidence_required,
		         'displayOrder', display_order
		       ) ORDER BY display_order)
		FROM dsh_readiness_checklist_template_items
		WHERE template_id = $1`, templateID, operatorContextID, businessVerticalID, version, updatedBy); err != nil {
		return ChecklistPolicy{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChecklistPolicy{}, err
	}
	return ListChecklistPolicy(ctx, db, operatorContextID, businessVerticalID)
}
