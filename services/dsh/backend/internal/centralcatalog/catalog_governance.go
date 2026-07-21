package centralcatalog

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// CatalogAttribute is the governed PIM definition used by products and node rules.
type CatalogAttribute struct {
	ID            string    `json:"id"`
	Code          string    `json:"code"`
	NameAr        string    `json:"nameAr"`
	NameEn        string    `json:"nameEn"`
	DataType      string    `json:"dataType"`
	IsFilterable  bool      `json:"isFilterable"`
	IsRequired    bool      `json:"isRequired"`
	IsVariantAxis bool      `json:"isVariantAxis"`
	IsGlobal      bool      `json:"isGlobal"`
	SortOrder     int       `json:"sortOrder"`
	IsActive      bool      `json:"isActive"`
	Version       int       `json:"version"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CatalogAttributeInput struct {
	Code          string `json:"code"`
	NameAr        string `json:"nameAr"`
	NameEn        string `json:"nameEn"`
	DataType      string `json:"dataType"`
	IsFilterable  bool   `json:"isFilterable"`
	IsRequired    bool   `json:"isRequired"`
	IsVariantAxis bool   `json:"isVariantAxis"`
	IsGlobal      bool   `json:"isGlobal"`
	SortOrder     int    `json:"sortOrder"`
	IsActive      bool   `json:"isActive"`
}

var validAttributeDataTypes = map[string]bool{
	"text": true, "number": true, "boolean": true, "enum": true,
	"multi_enum": true, "measurement": true, "money": true,
	"date": true, "media": true,
}

const catalogAttributeColumns = `id, code, name_ar, name_en, data_type, is_filterable, is_required,
	is_variant_axis, is_global, sort_order, is_active, version, created_at, updated_at`

func scanCatalogAttribute(scanner interface{ Scan(...any) error }) (CatalogAttribute, error) {
	var item CatalogAttribute
	err := scanner.Scan(&item.ID, &item.Code, &item.NameAr, &item.NameEn, &item.DataType,
		&item.IsFilterable, &item.IsRequired, &item.IsVariantAxis, &item.IsGlobal,
		&item.SortOrder, &item.IsActive, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return item, ErrNotFound
	}
	return item, err
}

func ListCatalogAttributes(ctx context.Context, db *sql.DB) ([]CatalogAttribute, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+catalogAttributeColumns+`
		FROM dsh_catalog_attributes ORDER BY sort_order, code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []CatalogAttribute{}
	for rows.Next() {
		item, err := scanCatalogAttribute(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func CreateCatalogAttribute(ctx context.Context, db *sql.DB, input CatalogAttributeInput) (CatalogAttribute, error) {
	code := strings.TrimSpace(input.Code)
	nameAr := strings.TrimSpace(input.NameAr)
	if code == "" || nameAr == "" || !validAttributeDataTypes[input.DataType] {
		return CatalogAttribute{}, ErrInvalid
	}
	id := entityID("attr")
	return scanCatalogAttribute(db.QueryRowContext(ctx, `INSERT INTO dsh_catalog_attributes
		(id, code, name_ar, name_en, data_type, is_filterable, is_required, is_variant_axis,
		 is_global, sort_order, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING `+catalogAttributeColumns,
		id, code, nameAr, strings.TrimSpace(input.NameEn), input.DataType,
		input.IsFilterable, input.IsRequired, input.IsVariantAxis, input.IsGlobal,
		input.SortOrder, input.IsActive))
}

// CatalogAttributeOption is an enum or multi-enum choice.
type CatalogAttributeOption struct {
	ID          string `json:"id"`
	AttributeID string `json:"attributeId"`
	Code        string `json:"code"`
	LabelAr     string `json:"labelAr"`
	LabelEn     string `json:"labelEn"`
	SortOrder   int    `json:"sortOrder"`
	IsActive    bool   `json:"isActive"`
	Version     int    `json:"version"`
}

type CatalogAttributeOptionInput struct {
	Code      string `json:"code"`
	LabelAr   string `json:"labelAr"`
	LabelEn   string `json:"labelEn"`
	SortOrder int    `json:"sortOrder"`
	IsActive  bool   `json:"isActive"`
}

func ListCatalogAttributeOptions(ctx context.Context, db *sql.DB, attributeID string) ([]CatalogAttributeOption, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, attribute_id, code, label_ar, label_en, sort_order, is_active, version
		FROM dsh_catalog_attribute_options WHERE attribute_id=$1 ORDER BY sort_order, code`, attributeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []CatalogAttributeOption{}
	for rows.Next() {
		var item CatalogAttributeOption
		if err := rows.Scan(&item.ID, &item.AttributeID, &item.Code, &item.LabelAr, &item.LabelEn,
			&item.SortOrder, &item.IsActive, &item.Version); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func CreateCatalogAttributeOption(ctx context.Context, db *sql.DB, attributeID string, input CatalogAttributeOptionInput) (CatalogAttributeOption, error) {
	if strings.TrimSpace(attributeID) == "" || strings.TrimSpace(input.Code) == "" || strings.TrimSpace(input.LabelAr) == "" {
		return CatalogAttributeOption{}, ErrInvalid
	}
	var dataType string
	if err := db.QueryRowContext(ctx, `SELECT data_type FROM dsh_catalog_attributes WHERE id=$1 AND is_active=TRUE`, attributeID).Scan(&dataType); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CatalogAttributeOption{}, ErrNotFound
		}
		return CatalogAttributeOption{}, err
	}
	if dataType != "enum" && dataType != "multi_enum" {
		return CatalogAttributeOption{}, fmt.Errorf("%w: options require enum or multi_enum attribute", ErrInvalid)
	}
	var item CatalogAttributeOption
	err := db.QueryRowContext(ctx, `INSERT INTO dsh_catalog_attribute_options
		(id, attribute_id, code, label_ar, label_en, sort_order, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, attribute_id, code, label_ar, label_en, sort_order, is_active, version`,
		entityID("attr-option"), attributeID, strings.TrimSpace(input.Code), strings.TrimSpace(input.LabelAr),
		strings.TrimSpace(input.LabelEn), input.SortOrder, input.IsActive).
		Scan(&item.ID, &item.AttributeID, &item.Code, &item.LabelAr, &item.LabelEn, &item.SortOrder, &item.IsActive, &item.Version)
	return item, err
}

// CatalogNodeAttributeRule controls which attributes apply to a category.
type CatalogNodeAttributeRule struct {
	ID            string `json:"id"`
	NodeID        string `json:"nodeId"`
	AttributeID   string `json:"attributeId"`
	IsRequired    bool   `json:"isRequired"`
	IsFilterable  bool   `json:"isFilterable"`
	IsVariantAxis bool   `json:"isVariantAxis"`
	SortOrder     int    `json:"sortOrder"`
	Version       int    `json:"version"`
}

type CatalogNodeAttributeRuleInput struct {
	IsRequired      bool `json:"isRequired"`
	IsFilterable    bool `json:"isFilterable"`
	IsVariantAxis   bool `json:"isVariantAxis"`
	SortOrder       int  `json:"sortOrder"`
	ExpectedVersion *int `json:"expectedVersion"`
}

func UpsertCatalogNodeAttributeRule(ctx context.Context, db *sql.DB, nodeID, attributeID string, input CatalogNodeAttributeRuleInput) (CatalogNodeAttributeRule, error) {
	if strings.TrimSpace(nodeID) == "" || strings.TrimSpace(attributeID) == "" {
		return CatalogNodeAttributeRule{}, ErrInvalid
	}
	var existingID string
	var currentVersion int
	err := db.QueryRowContext(ctx, `SELECT id, version FROM dsh_catalog_node_attribute_rules
		WHERE node_id=$1 AND attribute_id=$2`, nodeID, attributeID).Scan(&existingID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedVersion != nil {
			return CatalogNodeAttributeRule{}, ErrConflict
		}
		existingID = entityID("attr-rule")
		var item CatalogNodeAttributeRule
		err = db.QueryRowContext(ctx, `INSERT INTO dsh_catalog_node_attribute_rules
			(id, node_id, attribute_id, is_required, is_filterable, is_variant_axis, sort_order)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING id, node_id, attribute_id, is_required, is_filterable, is_variant_axis, sort_order, version`,
			existingID, nodeID, attributeID, input.IsRequired, input.IsFilterable, input.IsVariantAxis, input.SortOrder).
			Scan(&item.ID, &item.NodeID, &item.AttributeID, &item.IsRequired, &item.IsFilterable,
				&item.IsVariantAxis, &item.SortOrder, &item.Version)
		return item, err
	}
	if err != nil {
		return CatalogNodeAttributeRule{}, err
	}
	if input.ExpectedVersion == nil || currentVersion != *input.ExpectedVersion {
		return CatalogNodeAttributeRule{}, &ConflictError{EntityID: existingID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: currentVersion, Message: "version mismatch"}
	}
	var item CatalogNodeAttributeRule
	err = db.QueryRowContext(ctx, `UPDATE dsh_catalog_node_attribute_rules SET
		is_required=$1, is_filterable=$2, is_variant_axis=$3, sort_order=$4, version=version+1
		WHERE id=$5 AND version=$6
		RETURNING id, node_id, attribute_id, is_required, is_filterable, is_variant_axis, sort_order, version`,
		input.IsRequired, input.IsFilterable, input.IsVariantAxis, input.SortOrder, existingID, *input.ExpectedVersion).
		Scan(&item.ID, &item.NodeID, &item.AttributeID, &item.IsRequired, &item.IsFilterable,
			&item.IsVariantAxis, &item.SortOrder, &item.Version)
	return item, err
}

// MasterProductAttributeValue is a typed JSON value attached to a central product.
type MasterProductAttributeValue struct {
	ID              string          `json:"id"`
	MasterProductID string          `json:"masterProductId"`
	AttributeID     string          `json:"attributeId"`
	Value           json.RawMessage `json:"value"`
	Locale          *string         `json:"locale"`
	Version         int             `json:"version"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type MasterProductAttributeValueInput struct {
	Value           json.RawMessage `json:"value"`
	Locale          *string         `json:"locale"`
	ExpectedVersion *int            `json:"expectedVersion"`
}

func ListMasterProductAttributeValues(ctx context.Context, db *sql.DB, productID string) ([]MasterProductAttributeValue, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, master_product_id, attribute_id, value_json, locale, version, updated_at
		FROM dsh_master_product_attribute_values WHERE master_product_id=$1 ORDER BY attribute_id, locale NULLS FIRST`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []MasterProductAttributeValue{}
	for rows.Next() {
		var item MasterProductAttributeValue
		if err := rows.Scan(&item.ID, &item.MasterProductID, &item.AttributeID, &item.Value,
			&item.Locale, &item.Version, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func UpsertMasterProductAttributeValue(ctx context.Context, db *sql.DB, productID, attributeID string, input MasterProductAttributeValueInput) (MasterProductAttributeValue, error) {
	if strings.TrimSpace(productID) == "" || strings.TrimSpace(attributeID) == "" || len(input.Value) == 0 || !json.Valid(input.Value) {
		return MasterProductAttributeValue{}, ErrInvalid
	}
	var productNodeID *string
	if err := db.QueryRowContext(ctx, `SELECT category_node_id FROM dsh_master_products WHERE id=$1`, productID).Scan(&productNodeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MasterProductAttributeValue{}, ErrNotFound
		}
		return MasterProductAttributeValue{}, err
	}
	var attributeDataType string
	if err := db.QueryRowContext(ctx, `SELECT data_type FROM dsh_catalog_attributes WHERE id=$1 AND is_active=TRUE`, attributeID).Scan(&attributeDataType); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MasterProductAttributeValue{}, ErrNotFound
		}
		return MasterProductAttributeValue{}, err
	}
	if err := validateAttributeJSON(attributeDataType, input.Value); err != nil {
		return MasterProductAttributeValue{}, err
	}
	if productNodeID != nil {
		var ruleExists bool
		if err := db.QueryRowContext(ctx, `SELECT EXISTS(
			SELECT 1 FROM dsh_catalog_node_attribute_rules WHERE node_id=$1 AND attribute_id=$2
		)`, *productNodeID, attributeID).Scan(&ruleExists); err != nil {
			return MasterProductAttributeValue{}, err
		}
		if !ruleExists {
			var global bool
			if err := db.QueryRowContext(ctx, `SELECT is_global FROM dsh_catalog_attributes WHERE id=$1`, attributeID).Scan(&global); err != nil || !global {
				return MasterProductAttributeValue{}, fmt.Errorf("%w: attribute is not allowed for product category", ErrForbidden)
			}
		}
	}

	var existingID string
	var currentVersion int
	err := db.QueryRowContext(ctx, `SELECT id, version FROM dsh_master_product_attribute_values
		WHERE master_product_id=$1 AND attribute_id=$2 AND locale IS NOT DISTINCT FROM $3`, productID, attributeID, input.Locale).
		Scan(&existingID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedVersion != nil {
			return MasterProductAttributeValue{}, ErrConflict
		}
		var item MasterProductAttributeValue
		err = db.QueryRowContext(ctx, `INSERT INTO dsh_master_product_attribute_values
			(id, master_product_id, attribute_id, value_json, locale)
			VALUES ($1,$2,$3,$4,$5)
			RETURNING id, master_product_id, attribute_id, value_json, locale, version, updated_at`,
			entityID("attr-value"), productID, attributeID, input.Value, input.Locale).
			Scan(&item.ID, &item.MasterProductID, &item.AttributeID, &item.Value, &item.Locale, &item.Version, &item.UpdatedAt)
		return item, err
	}
	if err != nil {
		return MasterProductAttributeValue{}, err
	}
	if input.ExpectedVersion == nil || currentVersion != *input.ExpectedVersion {
		return MasterProductAttributeValue{}, &ConflictError{EntityID: existingID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: currentVersion, Message: "version mismatch"}
	}
	var item MasterProductAttributeValue
	err = db.QueryRowContext(ctx, `UPDATE dsh_master_product_attribute_values SET value_json=$1, version=version+1, updated_at=NOW()
		WHERE id=$2 AND version=$3
		RETURNING id, master_product_id, attribute_id, value_json, locale, version, updated_at`,
		input.Value, existingID, *input.ExpectedVersion).
		Scan(&item.ID, &item.MasterProductID, &item.AttributeID, &item.Value, &item.Locale, &item.Version, &item.UpdatedAt)
	return item, err
}

func validateAttributeJSON(dataType string, value json.RawMessage) error {
	var decoded any
	if err := json.Unmarshal(value, &decoded); err != nil {
		return ErrInvalid
	}
	switch dataType {
	case "text", "date", "media", "enum":
		if _, ok := decoded.(string); !ok {
			return fmt.Errorf("%w: attribute requires string", ErrInvalid)
		}
	case "number", "money", "measurement":
		if _, ok := decoded.(float64); !ok {
			return fmt.Errorf("%w: attribute requires number", ErrInvalid)
		}
	case "boolean":
		if _, ok := decoded.(bool); !ok {
			return fmt.Errorf("%w: attribute requires boolean", ErrInvalid)
		}
	case "multi_enum":
		values, ok := decoded.([]any)
		if !ok {
			return fmt.Errorf("%w: multi_enum requires array", ErrInvalid)
		}
		for _, value := range values {
			if _, ok := value.(string); !ok {
				return fmt.Errorf("%w: multi_enum values must be strings", ErrInvalid)
			}
		}
	default:
		return ErrInvalid
	}
	return nil
}

// MasterProductRelationship expresses central substitutes, alternatives and complements.
type MasterProductRelationship struct {
	ID                    string    `json:"id"`
	SourceMasterProductID string    `json:"sourceMasterProductId"`
	TargetMasterProductID string    `json:"targetMasterProductId"`
	RelationshipType      string    `json:"relationshipType"`
	Priority              int       `json:"priority"`
	Reason                string    `json:"reason"`
	IsActive              bool      `json:"isActive"`
	CreatedBy             string    `json:"createdBy"`
	Version               int       `json:"version"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

type MasterProductRelationshipInput struct {
	TargetMasterProductID string `json:"targetMasterProductId"`
	RelationshipType      string `json:"relationshipType"`
	Priority              int    `json:"priority"`
	Reason                string `json:"reason"`
	IsActive              bool   `json:"isActive"`
	ExpectedVersion       *int   `json:"expectedVersion"`
}

var validRelationshipTypes = map[string]bool{"substitute": true, "alternative": true, "complement": true}

const relationshipColumns = `id, source_master_product_id, target_master_product_id, relationship_type,
	priority, reason, is_active, created_by, version, created_at, updated_at`

func scanRelationship(scanner interface{ Scan(...any) error }) (MasterProductRelationship, error) {
	var item MasterProductRelationship
	err := scanner.Scan(&item.ID, &item.SourceMasterProductID, &item.TargetMasterProductID,
		&item.RelationshipType, &item.Priority, &item.Reason, &item.IsActive, &item.CreatedBy,
		&item.Version, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return item, ErrNotFound
	}
	return item, err
}

func ListMasterProductRelationships(ctx context.Context, db *sql.DB, productID string) ([]MasterProductRelationship, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+relationshipColumns+` FROM dsh_master_product_relationships
		WHERE source_master_product_id=$1 ORDER BY relationship_type, priority, created_at`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []MasterProductRelationship{}
	for rows.Next() {
		item, err := scanRelationship(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func UpsertMasterProductRelationship(ctx context.Context, db *sql.DB, actorID, productID string, input MasterProductRelationshipInput) (MasterProductRelationship, error) {
	if productID == input.TargetMasterProductID || !validRelationshipTypes[input.RelationshipType] || input.Priority < 0 {
		return MasterProductRelationship{}, ErrInvalid
	}
	var productsExist bool
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)=2 FROM dsh_master_products WHERE id IN ($1,$2)`, productID, input.TargetMasterProductID).Scan(&productsExist); err != nil {
		return MasterProductRelationship{}, err
	}
	if !productsExist {
		return MasterProductRelationship{}, ErrNotFound
	}

	var existingID string
	var currentVersion int
	err := db.QueryRowContext(ctx, `SELECT id, version FROM dsh_master_product_relationships
		WHERE source_master_product_id=$1 AND target_master_product_id=$2 AND relationship_type=$3`,
		productID, input.TargetMasterProductID, input.RelationshipType).Scan(&existingID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedVersion != nil {
			return MasterProductRelationship{}, ErrConflict
		}
		return scanRelationship(db.QueryRowContext(ctx, `INSERT INTO dsh_master_product_relationships
			(id, source_master_product_id, target_master_product_id, relationship_type, priority, reason, is_active, created_by)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+relationshipColumns,
			entityID("product-rel"), productID, input.TargetMasterProductID, input.RelationshipType,
			input.Priority, strings.TrimSpace(input.Reason), input.IsActive, actorID))
	}
	if err != nil {
		return MasterProductRelationship{}, err
	}
	if input.ExpectedVersion == nil || currentVersion != *input.ExpectedVersion {
		return MasterProductRelationship{}, &ConflictError{EntityID: existingID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: currentVersion, Message: "version mismatch"}
	}
	return scanRelationship(db.QueryRowContext(ctx, `UPDATE dsh_master_product_relationships SET
		priority=$1, reason=$2, is_active=$3, version=version+1, updated_at=NOW()
		WHERE id=$4 AND version=$5 RETURNING `+relationshipColumns,
		input.Priority, strings.TrimSpace(input.Reason), input.IsActive, existingID, *input.ExpectedVersion))
}

func DeleteMasterProductRelationship(ctx context.Context, db *sql.DB, id string, expectedVersion int) error {
	result, err := db.ExecContext(ctx, `DELETE FROM dsh_master_product_relationships WHERE id=$1 AND version=$2`, id, expectedVersion)
	if err != nil {
		return err
	}
	if count, _ := result.RowsAffected(); count != 1 {
		return ErrConflict
	}
	return nil
}

// StoreAssortmentPauseInput models a temporary operational pause.
type StoreAssortmentPauseInput struct {
	Reason          string     `json:"reason"`
	PausedUntil     *time.Time `json:"pausedUntil"`
	ExpectedVersion *int       `json:"expectedVersion"`
}

func PauseStoreAssortment(ctx context.Context, db *sql.DB, storeID, productID, actorID string, input StoreAssortmentPauseInput) (StoreAssortment, error) {
	if strings.TrimSpace(input.Reason) == "" || input.ExpectedVersion == nil {
		return StoreAssortment{}, ErrInvalid
	}
	row := db.QueryRowContext(ctx, `UPDATE dsh_store_assortments SET
		available_before_pause=available, available=FALSE, pause_reason=$1, paused_until=$2,
		paused_at=NOW(), paused_by=$3, submitted_by=$3, version=version+1, updated_at=NOW()
		WHERE store_id=$4 AND master_product_id=$5 AND version=$6
		RETURNING `+assortmentColumns,
		strings.TrimSpace(input.Reason), input.PausedUntil, actorID, storeID, productID, *input.ExpectedVersion)
	item, err := scanAssortment(row)
	if errors.Is(err, ErrNotFound) {
		current, currentErr := GetStoreAssortmentByKey(ctx, db, storeID, productID)
		if currentErr != nil {
			return StoreAssortment{}, currentErr
		}
		return StoreAssortment{}, &ConflictError{EntityID: current.ID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch"}
	}
	return item, err
}

func ResumeStoreAssortment(ctx context.Context, db *sql.DB, storeID, productID, actorID string, expectedVersion *int) (StoreAssortment, error) {
	if expectedVersion == nil {
		return StoreAssortment{}, ErrInvalid
	}
	row := db.QueryRowContext(ctx, `UPDATE dsh_store_assortments SET
		available=available_before_pause, pause_reason='', paused_until=NULL, paused_at=NULL,
		paused_by=NULL, submitted_by=$1, version=version+1, updated_at=NOW()
		WHERE store_id=$2 AND master_product_id=$3 AND version=$4
		RETURNING `+assortmentColumns,
		actorID, storeID, productID, *expectedVersion)
	item, err := scanAssortment(row)
	if errors.Is(err, ErrNotFound) {
		current, currentErr := GetStoreAssortmentByKey(ctx, db, storeID, productID)
		if currentErr != nil {
			return StoreAssortment{}, currentErr
		}
		return StoreAssortment{}, &ConflictError{EntityID: current.ID, ExpectedVersion: expectedVersion, CurrentVersion: current.Version, Message: "version mismatch"}
	}
	return item, err
}

// CatalogAuditEntry exposes append-only change history without SQL access.
type CatalogAuditEntry struct {
	ID            string          `json:"id"`
	EntityType    string          `json:"entityType"`
	EntityID      string          `json:"entityId"`
	Action        string          `json:"action"`
	ActorID       string          `json:"actorId"`
	ActorRole     string          `json:"actorRole"`
	Reason        string          `json:"reason"`
	CorrelationID string          `json:"correlationId"`
	Before        json.RawMessage `json:"before"`
	After         json.RawMessage `json:"after"`
	Metadata      json.RawMessage `json:"metadata"`
	CreatedAt     time.Time       `json:"createdAt"`
}

type CatalogAuditFilter struct {
	EntityType string
	EntityID   string
	Action     string
	Limit      int
	Offset     int
}

func ListCatalogAudit(ctx context.Context, db *sql.DB, filter CatalogAuditFilter) ([]CatalogAuditEntry, int, error) {
	limit, offset := ClampListParams(filter.Limit, filter.Offset)
	const where = `WHERE ($1='' OR entity_type=$1) AND ($2='' OR entity_id=$2) AND ($3='' OR action=$3)`
	var total int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_catalog_entity_audit `+where,
		filter.EntityType, filter.EntityID, filter.Action).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := db.QueryContext(ctx, `SELECT id, entity_type, entity_id, action, actor_id, actor_role,
		reason, correlation_id, COALESCE(before_json,'null'::jsonb), COALESCE(after_json,'null'::jsonb),
		metadata_json, created_at FROM dsh_catalog_entity_audit `+where+`
		ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
		filter.EntityType, filter.EntityID, filter.Action, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []CatalogAuditEntry{}
	for rows.Next() {
		var item CatalogAuditEntry
		if err := rows.Scan(&item.ID, &item.EntityType, &item.EntityID, &item.Action,
			&item.ActorID, &item.ActorRole, &item.Reason, &item.CorrelationID,
			&item.Before, &item.After, &item.Metadata, &item.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

type CatalogRollbackInput struct {
	ExpectedVersion *int   `json:"expectedVersion"`
	Reason          string `json:"reason"`
}

type CatalogRollbackResult struct {
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	NewVersion int    `json:"newVersion"`
}

func RollbackCatalogAudit(ctx context.Context, db *sql.DB, auditID, actorID, actorRole string, input CatalogRollbackInput) (CatalogRollbackResult, error) {
	if input.ExpectedVersion == nil || strings.TrimSpace(input.Reason) == "" {
		return CatalogRollbackResult{}, ErrInvalid
	}
	var result CatalogRollbackResult
	err := db.QueryRowContext(ctx, `SELECT entity_type, entity_id, new_version
		FROM dsh_catalog_rollback_audit($1,$2,$3,$4,$5)`,
		auditID, actorID, actorRole, strings.TrimSpace(input.Reason), *input.ExpectedVersion).
		Scan(&result.EntityType, &result.EntityID, &result.NewVersion)
	if err == nil {
		return result, nil
	}
	message := err.Error()
	switch {
	case strings.Contains(message, "ROLLBACK_VERSION_CONFLICT"):
		return CatalogRollbackResult{}, ErrConflict
	case strings.Contains(message, "AUDIT_ENTRY_NOT_ROLLBACKABLE"), strings.Contains(message, "AUDIT_ENTITY_NOT_ROLLBACKABLE"):
		return CatalogRollbackResult{}, ErrForbidden
	case strings.Contains(message, "INVALID_ROLLBACK_REQUEST"):
		return CatalogRollbackResult{}, ErrInvalid
	default:
		return CatalogRollbackResult{}, err
	}
}
