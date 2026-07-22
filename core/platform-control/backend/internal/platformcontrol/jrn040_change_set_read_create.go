package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrTargetConflict     = errors.New("platform target is reserved by another active change set")
	ErrSensitiveValue     = errors.New("sensitive values are forbidden in platform change sets")
	ErrRollbackReason     = errors.New("platform rollback reason is required")
	ErrMakerCheckerReview = errors.New("proposer cannot review own change")
	ErrValidationSnapshot = errors.New("platform validation snapshot is missing")
)

const (
	maxGovernedChangeSetItems = 50
	maxGovernedTextLength     = 4000
	maxGovernedValueBytes     = 64 * 1024
)

type variableStateSnapshot struct {
	Kind           string `json:"kind"`
	OwnerService   string `json:"ownerService"`
	ValueType      string `json:"valueType"`
	Classification string `json:"classification"`
	Status         string `json:"status"`
	Value          any    `json:"value"`
}

type featureFlagStateSnapshot struct {
	Kind         string         `json:"kind"`
	OwnerService string         `json:"ownerService"`
	Status       string         `json:"status"`
	Enabled      bool           `json:"enabled"`
	Targeting    map[string]any `json:"targeting"`
}

type changeSetAuditItem struct {
	TargetType       ChangeTargetType `json:"targetType"`
	TargetKey        string           `json:"targetKey"`
	OwnerService     string           `json:"ownerService"`
	ScopeType        string           `json:"scopeType"`
	ScopeID          string           `json:"scopeId,omitempty"`
	ValueType        string           `json:"valueType"`
	Classification   string           `json:"classification"`
	ExpectedRevision int64            `json:"expectedRevision"`
}

func (r *Repository) ChangeSetsGoverned(ctx context.Context) ([]ChangeSet, error) {
	changeSets, err := r.ChangeSets(ctx)
	if err != nil {
		return nil, err
	}
	for index := range changeSets {
		items, itemErr := r.governedChangeSetItems(ctx, changeSets[index].ID)
		if itemErr != nil {
			return nil, itemErr
		}
		changeSets[index].Items = items
	}
	return changeSets, nil
}

func (r *Repository) GetChangeSetGoverned(ctx context.Context, id string) (ChangeSet, error) {
	changeSet, err := r.GetChangeSet(ctx, id)
	if err != nil {
		return ChangeSet{}, err
	}
	items, err := r.governedChangeSetItems(ctx, id)
	if err != nil {
		return ChangeSet{}, err
	}
	changeSet.Items = items
	return changeSet, nil
}

func (r *Repository) governedChangeSetItems(ctx context.Context, changeSetID string) ([]ChangeSetItem, error) {
	rows, err := r.db.QueryContext(ctx, governedChangeSetItemsSelect+`
WHERE change_set_id = $1::uuid
ORDER BY target_type, target_key, scope_type, scope_id, id`, changeSetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ChangeSetItem, 0)
	for rows.Next() {
		item, scanErr := scanGovernedChangeSetItem(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

const governedChangeSetItemsSelect = `
SELECT id::text, target_type, target_key, owner_service, scope_type, scope_id,
       value_type, classification, expected_revision, before_value_json,
       proposed_value_json, applied_revision, validated_value_json,
       validated_revision, validated_at
FROM platform_change_set_items`

func scanGovernedChangeSetItem(row rowScanner) (ChangeSetItem, error) {
	var item ChangeSetItem
	var targetType string
	var beforeRaw, proposedRaw, validatedRaw []byte
	var appliedRevision, validatedRevision sql.NullInt64
	var itemValidatedAt sql.NullTime
	if err := row.Scan(
		&item.ID,
		&targetType,
		&item.TargetKey,
		&item.OwnerService,
		&item.ScopeType,
		&item.ScopeID,
		&item.ValueType,
		&item.Classification,
		&item.ExpectedRevision,
		&beforeRaw,
		&proposedRaw,
		&appliedRevision,
		&validatedRaw,
		&validatedRevision,
		&itemValidatedAt,
	); err != nil {
		return ChangeSetItem{}, err
	}
	item.TargetType = ChangeTargetType(targetType)
	if len(beforeRaw) > 0 {
		if err := json.Unmarshal(beforeRaw, &item.BeforeValue); err != nil {
			return ChangeSetItem{}, fmt.Errorf("decode before snapshot for %s: %w", item.TargetKey, err)
		}
	}
	if err := json.Unmarshal(proposedRaw, &item.ProposedValue); err != nil {
		return ChangeSetItem{}, fmt.Errorf("decode proposed value for %s: %w", item.TargetKey, err)
	}
	if appliedRevision.Valid {
		revision := appliedRevision.Int64
		item.AppliedRevision = &revision
	}
	if len(validatedRaw) > 0 {
		if err := json.Unmarshal(validatedRaw, &item.PreconditionSnapshot); err != nil {
			return ChangeSetItem{}, fmt.Errorf("decode validation snapshot for %s: %w", item.TargetKey, err)
		}
	}
	if validatedRevision.Valid {
		revision := validatedRevision.Int64
		item.ValidatedRevision = &revision
	}
	if itemValidatedAt.Valid {
		validatedAt := itemValidatedAt.Time
		item.ItemValidatedAt = &validatedAt
	}
	return item, nil
}

func loadGovernedChangeSetItemsForUpdate(ctx context.Context, tx *sql.Tx, id string) ([]ChangeSetItem, error) {
	rows, err := tx.QueryContext(ctx, governedChangeSetItemsSelect+`
WHERE change_set_id = $1::uuid
ORDER BY target_type, target_key, scope_type, scope_id, id
FOR UPDATE`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ChangeSetItem, 0)
	for rows.Next() {
		item, scanErr := scanGovernedChangeSetItem(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateChangeSetGoverned(
	ctx context.Context,
	actorID string,
	actorRoles []string,
	correlationID string,
	input CreateChangeSetInput,
) (ChangeSet, error) {
	if err := validateGovernedCreateInput(input); err != nil {
		return ChangeSet{}, err
	}
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var id string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO platform_change_sets
    (title, reason, impact_assessment, rollback_plan, proposer_actor_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id::text`,
		strings.TrimSpace(input.Title),
		strings.TrimSpace(input.Reason),
		strings.TrimSpace(input.ImpactAssessment),
		strings.TrimSpace(input.RollbackPlan),
		strings.TrimSpace(actorID),
	).Scan(&id); err != nil {
		return ChangeSet{}, err
	}

	for _, inputItem := range input.Items {
		item := normalizeGovernedCreateItem(inputItem)
		if err := ensureGovernedTargetIsNotSensitive(ctx, tx, item); err != nil {
			return ChangeSet{}, err
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO platform_change_set_items
    (change_set_id, target_type, target_key, owner_service, scope_type,
     scope_id, value_type, classification, expected_revision, proposed_value_json)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
			id,
			item.TargetType,
			item.TargetKey,
			item.OwnerService,
			item.ScopeType,
			item.ScopeID,
			item.ValueType,
			item.Classification,
			item.ExpectedRevision,
			[]byte(item.ProposedValue),
		); err != nil {
			return ChangeSet{}, err
		}
	}

	if err := insertAudit(
		ctx,
		tx,
		id,
		"change_set_created",
		actorID,
		actorRoles,
		string(ChangeSetDraft),
		input.Reason,
		correlationID,
		nil,
		governedChangeSetAuditSummary(input),
	); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSetGoverned(ctx, id)
}

func ensureGovernedTargetIsNotSensitive(ctx context.Context, tx *sql.Tx, item CreateChangeSetItemInput) error {
	if item.TargetType != ChangeTargetVariable {
		return nil
	}
	var classification string
	err := tx.QueryRowContext(ctx, `
SELECT classification
FROM platform_variables
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3`,
		item.TargetKey, item.ScopeType, item.ScopeID,
	).Scan(&classification)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if isSensitiveClassification(classification) {
		return fmt.Errorf("%w: existing target %s is classified as sensitive", ErrSensitiveValue, item.TargetKey)
	}
	return nil
}

func validateGovernedCreateInput(input CreateChangeSetInput) error {
	if strings.TrimSpace(input.Title) == "" ||
		strings.TrimSpace(input.Reason) == "" ||
		strings.TrimSpace(input.ImpactAssessment) == "" ||
		strings.TrimSpace(input.RollbackPlan) == "" ||
		len(input.Items) == 0 || len(input.Items) > maxGovernedChangeSetItems {
		return ErrValidation
	}
	if len(strings.TrimSpace(input.Title)) > 160 ||
		len(strings.TrimSpace(input.Reason)) > maxGovernedTextLength ||
		len(strings.TrimSpace(input.ImpactAssessment)) > maxGovernedTextLength ||
		len(strings.TrimSpace(input.RollbackPlan)) > maxGovernedTextLength {
		return ErrValidation
	}

	seen := map[string]struct{}{}
	for _, rawItem := range input.Items {
		item := normalizeGovernedCreateItem(rawItem)
		if item.TargetType != ChangeTargetVariable && item.TargetType != ChangeTargetFeatureFlag {
			return ErrValidation
		}
		if item.TargetKey == "" || item.OwnerService == "" || item.ExpectedRevision < 0 ||
			len(item.TargetKey) > 200 || len(item.OwnerService) > 120 ||
			len(item.ProposedValue) == 0 || len(item.ProposedValue) > maxGovernedValueBytes ||
			!json.Valid(item.ProposedValue) {
			return ErrValidation
		}
		if item.ScopeType == "global" && item.ScopeID != "" {
			return ErrValidation
		}
		if item.ScopeType != "global" && item.ScopeID == "" {
			return ErrValidation
		}
		if item.TargetType == ChangeTargetFeatureFlag && (item.ScopeType != "global" || item.ScopeID != "") {
			return ErrValidation
		}
		if isSensitiveClassification(item.Classification) || proposedValueContainsSecret(item.ProposedValue) {
			return ErrSensitiveValue
		}
		if item.TargetType == ChangeTargetFeatureFlag {
			var enabled bool
			if err := json.Unmarshal(item.ProposedValue, &enabled); err != nil {
				return ErrValidation
			}
		}
		identity := governedTargetIdentity(ChangeSetItem{
			TargetType: item.TargetType,
			TargetKey:  item.TargetKey,
			ScopeType:  item.ScopeType,
			ScopeID:    item.ScopeID,
		})
		if _, exists := seen[identity]; exists {
			return ErrValidation
		}
		seen[identity] = struct{}{}
	}
	return nil
}

func normalizeGovernedCreateItem(item CreateChangeSetItemInput) CreateChangeSetItemInput {
	item.TargetKey = strings.TrimSpace(item.TargetKey)
	item.OwnerService = strings.TrimSpace(item.OwnerService)
	item.ScopeType = strings.TrimSpace(item.ScopeType)
	if item.ScopeType == "" {
		item.ScopeType = "global"
	}
	item.ScopeID = strings.TrimSpace(item.ScopeID)
	item.ValueType = strings.TrimSpace(item.ValueType)
	if item.ValueType == "" {
		item.ValueType = "json"
	}
	item.Classification = strings.ToLower(strings.TrimSpace(item.Classification))
	if item.Classification == "" {
		item.Classification = "internal"
	}
	return item
}

func isSensitiveClassification(classification string) bool {
	switch strings.ToLower(strings.TrimSpace(classification)) {
	case "secret", "credential", "credentials", "password", "token", "private_key", "api_key", "client_secret":
		return true
	default:
		return false
	}
}

func proposedValueContainsSecret(raw json.RawMessage) bool {
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return false
	}
	return containsSensitiveJSONField(value)
}

func containsSensitiveJSONField(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		for key, nested := range typed {
			normalized := strings.ToLower(strings.TrimSpace(key))
			switch normalized {
			case "password", "secret", "token", "access_token", "refresh_token", "api_key", "private_key", "client_secret", "credential", "credentials":
				return true
			}
			if containsSensitiveJSONField(nested) {
				return true
			}
		}
	case []any:
		for _, nested := range typed {
			if containsSensitiveJSONField(nested) {
				return true
			}
		}
	}
	return false
}

func governedChangeSetAuditSummary(input CreateChangeSetInput) map[string]any {
	items := make([]changeSetAuditItem, 0, len(input.Items))
	for _, rawItem := range input.Items {
		item := normalizeGovernedCreateItem(rawItem)
		items = append(items, changeSetAuditItem{
			TargetType:       item.TargetType,
			TargetKey:        item.TargetKey,
			OwnerService:     item.OwnerService,
			ScopeType:        item.ScopeType,
			ScopeID:          item.ScopeID,
			ValueType:        item.ValueType,
			Classification:   item.Classification,
			ExpectedRevision: item.ExpectedRevision,
		})
	}
	return map[string]any{
		"title":            strings.TrimSpace(input.Title),
		"impactAssessment": strings.TrimSpace(input.ImpactAssessment),
		"rollbackPlan":     strings.TrimSpace(input.RollbackPlan),
		"itemCount":        len(items),
		"items":            items,
		"valuesRedacted":   true,
	}
}
