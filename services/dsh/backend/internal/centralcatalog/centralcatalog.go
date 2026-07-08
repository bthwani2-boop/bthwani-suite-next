// Package centralcatalog is the sovereign catalog implementation established
// by governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md. It owns the
// only ground truth for categories (dsh_catalog_domains / dsh_catalog_nodes)
// and products (dsh_master_products). Stores never own a category or a
// product — they own only an assortment link (dsh_store_assortments) and may
// request new master products via dsh_product_proposals.
package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("central catalog entity not found")
	ErrInvalid  = errors.New("invalid central catalog input")
	ErrConflict = errors.New("central catalog conflict")
	ErrForbidden = errors.New("action not permitted by platform policy")
)

// ── L1: BUSINESS_DOMAIN ─────────────────────────────────────────────────────

type Domain struct {
	ID                      string    `json:"id"`
	Slug                    string    `json:"slug"`
	NameAr                  string    `json:"nameAr"`
	NameEn                  string    `json:"nameEn"`
	Icon                    string    `json:"icon"`
	SortOrder               int       `json:"sortOrder"`
	IsActive                bool      `json:"isActive"`
	IsClientVisible         bool      `json:"isClientVisible"`
	RequiresProductCatalog  bool      `json:"requiresProductCatalog"`
	IsManualRequest         bool      `json:"isManualRequest"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

type DomainInput struct {
	Slug                   string `json:"slug"`
	NameAr                 string `json:"nameAr"`
	NameEn                 string `json:"nameEn"`
	Icon                   string `json:"icon"`
	SortOrder              int    `json:"sortOrder"`
	IsActive               bool   `json:"isActive"`
	IsClientVisible        bool   `json:"isClientVisible"`
	RequiresProductCatalog bool   `json:"requiresProductCatalog"`
	IsManualRequest        bool   `json:"isManualRequest"`
}

const domainColumns = `id, slug, name_ar, name_en, icon, sort_order, is_active, is_client_visible,
	requires_product_catalog, is_manual_request, created_at, updated_at`

func scanDomain(scanner interface{ Scan(...any) error }) (Domain, error) {
	var d Domain
	err := scanner.Scan(&d.ID, &d.Slug, &d.NameAr, &d.NameEn, &d.Icon, &d.SortOrder, &d.IsActive,
		&d.IsClientVisible, &d.RequiresProductCatalog, &d.IsManualRequest, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	return d, err
}

func ListDomains(ctx context.Context, db *sql.DB) ([]Domain, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+domainColumns+` FROM dsh_catalog_domains ORDER BY sort_order, slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Domain{}
	for rows.Next() {
		d, err := scanDomain(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func GetDomain(ctx context.Context, db *sql.DB, id string) (Domain, error) {
	return scanDomain(db.QueryRowContext(ctx, `SELECT `+domainColumns+` FROM dsh_catalog_domains WHERE id=$1`, id))
}

func CreateDomain(ctx context.Context, db *sql.DB, input DomainInput) (Domain, error) {
	slug := strings.TrimSpace(input.Slug)
	nameAr := strings.TrimSpace(input.NameAr)
	if slug == "" || nameAr == "" {
		return Domain{}, ErrInvalid
	}
	id := entityID("domain")
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_domains
		(id, slug, name_ar, name_en, icon, sort_order, is_active, is_client_visible, requires_product_catalog, is_manual_request)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, slug, nameAr, input.NameEn, input.Icon, input.SortOrder, input.IsActive, input.IsClientVisible,
		input.RequiresProductCatalog, input.IsManualRequest)
	if err != nil {
		return Domain{}, err
	}
	return GetDomain(ctx, db, id)
}

func UpdateDomain(ctx context.Context, db *sql.DB, id string, input DomainInput) (Domain, error) {
	if strings.TrimSpace(input.NameAr) == "" {
		return Domain{}, ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_domains SET
		name_ar=$1, name_en=$2, icon=$3, sort_order=$4, is_active=$5, is_client_visible=$6,
		requires_product_catalog=$7, is_manual_request=$8, updated_at=now()
		WHERE id=$9`,
		strings.TrimSpace(input.NameAr), input.NameEn, input.Icon, input.SortOrder, input.IsActive,
		input.IsClientVisible, input.RequiresProductCatalog, input.IsManualRequest, id)
	if err != nil {
		return Domain{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return Domain{}, ErrNotFound
	}
	return GetDomain(ctx, db, id)
}

// ── L2/L3/L4: BUSINESS_SUBDOMAIN / PRODUCT_MAIN_CLASS / PRODUCT_SUB_CLASS ──

type Node struct {
	ID                             string    `json:"id"`
	DomainID                       string    `json:"domainId"`
	ParentID                       *string   `json:"parentId"`
	Level                          string    `json:"level"`
	Slug                           string    `json:"slug"`
	NameAr                         string    `json:"nameAr"`
	NameEn                         string    `json:"nameEn"`
	Icon                           string    `json:"icon"`
	SortOrder                      int       `json:"sortOrder"`
	IsActive                       bool      `json:"isActive"`
	IsClientVisible                bool      `json:"isClientVisible"`
	RequiresBarcode                bool      `json:"requiresBarcode"`
	AllowsProductProposal          bool      `json:"allowsProductProposal"`
	AllowsStoreProductCustomImage  bool      `json:"allowsStoreProductCustomImage"`
	RequiresCatalogReview          bool      `json:"requiresCatalogReview"`
	RequiresProductCatalog         bool      `json:"requiresProductCatalog"`
	CreatedAt                      time.Time `json:"createdAt"`
	UpdatedAt                      time.Time `json:"updatedAt"`
}

var validNodeLevels = map[string]bool{"BUSINESS_SUBDOMAIN": true, "PRODUCT_MAIN_CLASS": true, "PRODUCT_SUB_CLASS": true}

type NodeInput struct {
	DomainID                      string  `json:"domainId"`
	ParentID                      *string `json:"parentId"`
	Level                         string  `json:"level"`
	Slug                          string  `json:"slug"`
	NameAr                        string  `json:"nameAr"`
	NameEn                        string  `json:"nameEn"`
	Icon                          string  `json:"icon"`
	SortOrder                     int     `json:"sortOrder"`
	IsActive                      bool    `json:"isActive"`
	IsClientVisible               bool    `json:"isClientVisible"`
	RequiresBarcode               bool    `json:"requiresBarcode"`
	AllowsProductProposal         bool    `json:"allowsProductProposal"`
	AllowsStoreProductCustomImage bool    `json:"allowsStoreProductCustomImage"`
	RequiresCatalogReview         bool    `json:"requiresCatalogReview"`
	RequiresProductCatalog        bool    `json:"requiresProductCatalog"`
}

const nodeColumns = `id, domain_id, parent_id, level, slug, name_ar, name_en, icon, sort_order,
	is_active, is_client_visible, requires_barcode, allows_product_proposal,
	allows_store_product_custom_image, requires_catalog_review, requires_product_catalog,
	created_at, updated_at`

func scanNode(scanner interface{ Scan(...any) error }) (Node, error) {
	var n Node
	err := scanner.Scan(&n.ID, &n.DomainID, &n.ParentID, &n.Level, &n.Slug, &n.NameAr, &n.NameEn, &n.Icon,
		&n.SortOrder, &n.IsActive, &n.IsClientVisible, &n.RequiresBarcode, &n.AllowsProductProposal,
		&n.AllowsStoreProductCustomImage, &n.RequiresCatalogReview, &n.RequiresProductCatalog,
		&n.CreatedAt, &n.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return n, ErrNotFound
	}
	return n, err
}

func ListNodes(ctx context.Context, db *sql.DB, domainID, parentID string) ([]Node, error) {
	query := `SELECT ` + nodeColumns + ` FROM dsh_catalog_nodes WHERE ($1='' OR domain_id=$1)`
	args := []any{domainID}
	if parentID != "" {
		query += ` AND parent_id=$2`
		args = append(args, parentID)
	}
	query += ` ORDER BY sort_order, slug`
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Node{}
	for rows.Next() {
		n, err := scanNode(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func GetNode(ctx context.Context, db *sql.DB, id string) (Node, error) {
	return scanNode(db.QueryRowContext(ctx, `SELECT `+nodeColumns+` FROM dsh_catalog_nodes WHERE id=$1`, id))
}

func CreateNode(ctx context.Context, db *sql.DB, input NodeInput) (Node, error) {
	if strings.TrimSpace(input.DomainID) == "" || !validNodeLevels[input.Level] ||
		strings.TrimSpace(input.Slug) == "" || strings.TrimSpace(input.NameAr) == "" {
		return Node{}, ErrInvalid
	}
	id := entityID("node")
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_nodes
		(id, domain_id, parent_id, level, slug, name_ar, name_en, icon, sort_order, is_active,
		 is_client_visible, requires_barcode, allows_product_proposal, allows_store_product_custom_image,
		 requires_catalog_review, requires_product_catalog)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		id, input.DomainID, input.ParentID, input.Level, strings.TrimSpace(input.Slug), strings.TrimSpace(input.NameAr),
		input.NameEn, input.Icon, input.SortOrder, input.IsActive, input.IsClientVisible, input.RequiresBarcode,
		input.AllowsProductProposal, input.AllowsStoreProductCustomImage, input.RequiresCatalogReview,
		input.RequiresProductCatalog)
	if err != nil {
		return Node{}, err
	}
	return GetNode(ctx, db, id)
}

func UpdateNode(ctx context.Context, db *sql.DB, id string, input NodeInput) (Node, error) {
	if strings.TrimSpace(input.NameAr) == "" {
		return Node{}, ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_nodes SET
		name_ar=$1, name_en=$2, icon=$3, sort_order=$4, is_active=$5, is_client_visible=$6,
		requires_barcode=$7, allows_product_proposal=$8, allows_store_product_custom_image=$9,
		requires_catalog_review=$10, requires_product_catalog=$11, updated_at=now()
		WHERE id=$12`,
		strings.TrimSpace(input.NameAr), input.NameEn, input.Icon, input.SortOrder, input.IsActive,
		input.IsClientVisible, input.RequiresBarcode, input.AllowsProductProposal,
		input.AllowsStoreProductCustomImage, input.RequiresCatalogReview, input.RequiresProductCatalog, id)
	if err != nil {
		return Node{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return Node{}, ErrNotFound
	}
	return GetNode(ctx, db, id)
}

// ── L5: MASTER_PRODUCT ──────────────────────────────────────────────────────

type MasterProduct struct {
	ID                      string    `json:"id"`
	DomainID                string    `json:"domainId"`
	CategoryNodeID          *string   `json:"categoryNodeId"`
	CanonicalNameAr         string    `json:"canonicalNameAr"`
	CanonicalNameEn         string    `json:"canonicalNameEn"`
	Brand                   string    `json:"brand"`
	Barcode                 *string   `json:"barcode"`
	GTIN                    *string   `json:"gtin"`
	SKU                     *string   `json:"sku"`
	Unit                    string    `json:"unit"`
	MeasurementType         string    `json:"measurementType"`
	CanonicalImageObjectKey *string   `json:"canonicalImageObjectKey"`
	ApprovalStatus          string    `json:"approvalStatus"`
	IsActive                bool      `json:"isActive"`
	DuplicateGroupID        *string   `json:"duplicateGroupId"`
	CreatedSource           string    `json:"createdSource"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

var validApprovalStatus = map[string]bool{"draft": true, "pending_review": true, "approved": true, "rejected": true, "archived": true}

type MasterProductInput struct {
	DomainID                string  `json:"domainId"`
	CategoryNodeID          *string `json:"categoryNodeId"`
	CanonicalNameAr         string  `json:"canonicalNameAr"`
	CanonicalNameEn         string  `json:"canonicalNameEn"`
	Brand                   string  `json:"brand"`
	Barcode                 *string `json:"barcode"`
	GTIN                    *string `json:"gtin"`
	SKU                     *string `json:"sku"`
	Unit                    string  `json:"unit"`
	MeasurementType         string  `json:"measurementType"`
	CanonicalImageObjectKey *string `json:"canonicalImageObjectKey"`
	ApprovalStatus          string  `json:"approvalStatus"`
	IsActive                bool    `json:"isActive"`
	CreatedSource           string  `json:"createdSource"`
}

const masterProductColumns = `id, domain_id, category_node_id, canonical_name_ar, canonical_name_en, brand,
	barcode, gtin, sku, unit, measurement_type, canonical_image_object_key, approval_status, is_active,
	duplicate_group_id, created_source, created_at, updated_at`

func scanMasterProduct(scanner interface{ Scan(...any) error }) (MasterProduct, error) {
	var m MasterProduct
	err := scanner.Scan(&m.ID, &m.DomainID, &m.CategoryNodeID, &m.CanonicalNameAr, &m.CanonicalNameEn, &m.Brand,
		&m.Barcode, &m.GTIN, &m.SKU, &m.Unit, &m.MeasurementType, &m.CanonicalImageObjectKey, &m.ApprovalStatus,
		&m.IsActive, &m.DuplicateGroupID, &m.CreatedSource, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

type MasterProductFilter struct {
	DomainID       string
	CategoryNodeID string
	ApprovalStatus string
	Search         string
	Limit          int
	Offset         int
}

func ListMasterProducts(ctx context.Context, db *sql.DB, filter MasterProductFilter) ([]MasterProduct, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	query := `SELECT ` + masterProductColumns + ` FROM dsh_master_products
		WHERE ($1='' OR domain_id=$1) AND ($2='' OR category_node_id=$2) AND ($3='' OR approval_status=$3)
		  AND ($4='' OR canonical_name_ar ILIKE '%'||$4||'%' OR canonical_name_en ILIKE '%'||$4||'%' OR barcode=$4)
		ORDER BY updated_at DESC LIMIT $5 OFFSET $6`
	rows, err := db.QueryContext(ctx, query, filter.DomainID, filter.CategoryNodeID, filter.ApprovalStatus,
		filter.Search, limit, filter.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MasterProduct{}
	for rows.Next() {
		m, err := scanMasterProduct(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func GetMasterProduct(ctx context.Context, db *sql.DB, id string) (MasterProduct, error) {
	return scanMasterProduct(db.QueryRowContext(ctx, `SELECT `+masterProductColumns+` FROM dsh_master_products WHERE id=$1`, id))
}

func CreateMasterProduct(ctx context.Context, db *sql.DB, input MasterProductInput) (MasterProduct, error) {
	if strings.TrimSpace(input.DomainID) == "" || strings.TrimSpace(input.CanonicalNameAr) == "" {
		return MasterProduct{}, ErrInvalid
	}
	approvalStatus := input.ApprovalStatus
	if approvalStatus == "" {
		approvalStatus = "draft"
	}
	if !validApprovalStatus[approvalStatus] {
		return MasterProduct{}, ErrInvalid
	}
	unit := input.Unit
	if unit == "" {
		unit = "unit"
	}
	measurementType := input.MeasurementType
	if measurementType == "" {
		measurementType = "unit"
	}
	createdSource := input.CreatedSource
	if createdSource == "" {
		createdSource = "control-panel-catalog"
	}
	id := entityID("mp")
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_master_products
		(id, domain_id, category_node_id, canonical_name_ar, canonical_name_en, brand, barcode, gtin, sku,
		 unit, measurement_type, canonical_image_object_key, approval_status, is_active, created_source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		id, input.DomainID, input.CategoryNodeID, strings.TrimSpace(input.CanonicalNameAr), input.CanonicalNameEn,
		input.Brand, input.Barcode, input.GTIN, input.SKU, unit, measurementType, input.CanonicalImageObjectKey,
		approvalStatus, input.IsActive, createdSource)
	if err != nil {
		return MasterProduct{}, err
	}
	return GetMasterProduct(ctx, db, id)
}

func UpdateMasterProduct(ctx context.Context, db *sql.DB, id string, input MasterProductInput) (MasterProduct, error) {
	if strings.TrimSpace(input.CanonicalNameAr) == "" {
		return MasterProduct{}, ErrInvalid
	}
	if input.ApprovalStatus != "" && !validApprovalStatus[input.ApprovalStatus] {
		return MasterProduct{}, ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_master_products SET
		category_node_id=$1, canonical_name_ar=$2, canonical_name_en=$3, brand=$4, barcode=$5, gtin=$6, sku=$7,
		unit=COALESCE(NULLIF($8,''),unit), measurement_type=COALESCE(NULLIF($9,''),measurement_type),
		canonical_image_object_key=$10, approval_status=COALESCE(NULLIF($11,''),approval_status),
		is_active=$12, updated_at=now()
		WHERE id=$13`,
		input.CategoryNodeID, strings.TrimSpace(input.CanonicalNameAr), input.CanonicalNameEn, input.Brand,
		input.Barcode, input.GTIN, input.SKU, input.Unit, input.MeasurementType, input.CanonicalImageObjectKey,
		input.ApprovalStatus, input.IsActive, id)
	if err != nil {
		return MasterProduct{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return MasterProduct{}, ErrNotFound
	}
	return GetMasterProduct(ctx, db, id)
}

// ── Product proposals (request-to-add; never a sellable entity) ────────────

type ProductProposal struct {
	ID                     string    `json:"id"`
	ProposedNameAr         string    `json:"proposedNameAr"`
	ProposedNameEn         string    `json:"proposedNameEn"`
	DomainID               string    `json:"domainId"`
	CategoryNodeID         *string   `json:"categoryNodeId"`
	Brand                  string    `json:"brand"`
	Barcode                *string   `json:"barcode"`
	ImageObjectKey         *string   `json:"imageObjectKey"`
	SourceSurface          string    `json:"sourceSurface"`
	SourceActorID          string    `json:"sourceActorId"`
	SourceStoreID          *string   `json:"sourceStoreId"`
	Status                 string    `json:"status"`
	ReviewNote             string    `json:"reviewNote"`
	AdoptedMasterProductID *string   `json:"adoptedMasterProductId"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

var validSourceSurface = map[string]bool{
	"app-field": true, "app-partner": true, "control-panel-catalog": true, "control-panel-platform": true,
}
var validProposalStatus = map[string]bool{
	"submitted": true, "under_review": true, "adopted": true, "rejected": true, "needs_fix": true,
}

type ProductProposalInput struct {
	ProposedNameAr string  `json:"proposedNameAr"`
	ProposedNameEn string  `json:"proposedNameEn"`
	DomainID       string  `json:"domainId"`
	CategoryNodeID *string `json:"categoryNodeId"`
	Brand          string  `json:"brand"`
	Barcode        *string `json:"barcode"`
	ImageObjectKey *string `json:"imageObjectKey"`
	SourceSurface  string  `json:"sourceSurface"`
	SourceStoreID  *string `json:"sourceStoreId"`
}

const proposalColumns = `id, proposed_name_ar, proposed_name_en, domain_id, category_node_id, brand, barcode,
	image_object_key, source_surface, source_actor_id, source_store_id, status, review_note,
	adopted_master_product_id, created_at, updated_at`

func scanProposal(scanner interface{ Scan(...any) error }) (ProductProposal, error) {
	var p ProductProposal
	err := scanner.Scan(&p.ID, &p.ProposedNameAr, &p.ProposedNameEn, &p.DomainID, &p.CategoryNodeID, &p.Brand,
		&p.Barcode, &p.ImageObjectKey, &p.SourceSurface, &p.SourceActorID, &p.SourceStoreID, &p.Status,
		&p.ReviewNote, &p.AdoptedMasterProductID, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

type ProposalFilter struct {
	Status  string
	StoreID string
	Limit   int
	Offset  int
}

func ListProposals(ctx context.Context, db *sql.DB, filter ProposalFilter) ([]ProductProposal, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.QueryContext(ctx, `SELECT `+proposalColumns+` FROM dsh_product_proposals
		WHERE ($1='' OR status=$1) AND ($2='' OR source_store_id=$2)
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`, filter.Status, filter.StoreID, limit, filter.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ProductProposal{}
	for rows.Next() {
		p, err := scanProposal(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func GetProposal(ctx context.Context, db *sql.DB, id string) (ProductProposal, error) {
	return scanProposal(db.QueryRowContext(ctx, `SELECT `+proposalColumns+` FROM dsh_product_proposals WHERE id=$1`, id))
}

// CreateProposal is the only way a field/partner/operator actor may add a
// product-shaped record. It is a request, never a sellable entity — the
// governing node must allow proposals (allows_product_proposal), enforced by
// the caller via ResolveEffectivePolicy before invoking this.
func CreateProposal(ctx context.Context, db *sql.DB, actorID string, input ProductProposalInput) (ProductProposal, error) {
	if strings.TrimSpace(input.ProposedNameAr) == "" || strings.TrimSpace(input.DomainID) == "" ||
		!validSourceSurface[input.SourceSurface] {
		return ProductProposal{}, ErrInvalid
	}
	id := entityID("proposal")
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_product_proposals
		(id, proposed_name_ar, proposed_name_en, domain_id, category_node_id, brand, barcode, image_object_key,
		 source_surface, source_actor_id, source_store_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, strings.TrimSpace(input.ProposedNameAr), input.ProposedNameEn, input.DomainID, input.CategoryNodeID,
		input.Brand, input.Barcode, input.ImageObjectKey, input.SourceSurface, actorID, input.SourceStoreID)
	if err != nil {
		return ProductProposal{}, err
	}
	return GetProposal(ctx, db, id)
}

type ProposalDecisionInput struct {
	Decision               string  `json:"decision"` // under_review | adopted | rejected | needs_fix
	ReviewNote             string  `json:"reviewNote"`
	AdoptedMasterProductID *string `json:"adoptedMasterProductId"` // link to existing master product instead of creating one
}

// DecideProposal moves a proposal through review. On "adopted" without an
// existing AdoptedMasterProductID, it creates a new dsh_master_products row
// from the proposal fields (status pending_review — an operator must still
// approve it for client visibility, per rule 4 of the sovereignty decision).
func DecideProposal(ctx context.Context, db *sql.DB, actorID, id string, input ProposalDecisionInput) (ProductProposal, error) {
	if !validProposalStatus[input.Decision] {
		return ProductProposal{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProductProposal{}, err
	}
	defer tx.Rollback()

	proposal, err := scanProposal(tx.QueryRowContext(ctx, `SELECT `+proposalColumns+` FROM dsh_product_proposals WHERE id=$1 FOR UPDATE`, id))
	if err != nil {
		return ProductProposal{}, err
	}

	adoptedID := input.AdoptedMasterProductID
	if input.Decision == "adopted" && adoptedID == nil {
		mpID := entityID("mp")
		_, err = tx.ExecContext(ctx, `INSERT INTO dsh_master_products
			(id, domain_id, category_node_id, canonical_name_ar, canonical_name_en, brand, barcode,
			 approval_status, created_source)
			VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_review',$8)`,
			mpID, proposal.DomainID, proposal.CategoryNodeID, proposal.ProposedNameAr, proposal.ProposedNameEn,
			proposal.Brand, proposal.Barcode, "product-proposal:"+proposal.SourceSurface)
		if err != nil {
			return ProductProposal{}, err
		}
		adoptedID = &mpID
	}

	_, err = tx.ExecContext(ctx, `UPDATE dsh_product_proposals SET
		status=$1, review_note=$2, adopted_master_product_id=$3, updated_at=now() WHERE id=$4`,
		input.Decision, input.ReviewNote, adoptedID, id)
	if err != nil {
		return ProductProposal{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProductProposal{}, err
	}
	_ = actorID // reserved for audit trail wiring alongside dsh_catalog_approval_audit_trail
	return GetProposal(ctx, db, id)
}

// ── Store assortment (store-local truth: price/availability/stock/note/image) ─

type StoreAssortment struct {
	ID                    string    `json:"id"`
	StoreID               string    `json:"storeId"`
	MasterProductID       string    `json:"masterProductId"`
	UnitPrice             float64   `json:"unitPrice"`
	Currency              string    `json:"currency"`
	Available             bool      `json:"available"`
	StockStatus           string    `json:"stockStatus"`
	LocalNote             string    `json:"localNote"`
	CustomImageObjectKey  *string   `json:"customImageObjectKey"`
	PublicationStatus     string    `json:"publicationStatus"`
	SubmittedBy           string    `json:"submittedBy"`
	ApprovedBy            string    `json:"approvedBy"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

var validStockStatus = map[string]bool{"in_stock": true, "low_stock": true, "out_of_stock": true}
var validPublicationStatus = map[string]bool{
	"draft": true, "submitted": true, "approved": true, "client_visible": true, "rejected": true, "hidden": true,
}

type StoreAssortmentInput struct {
	UnitPrice            float64 `json:"unitPrice"`
	Currency             string  `json:"currency"`
	Available            bool    `json:"available"`
	StockStatus          string  `json:"stockStatus"`
	LocalNote            string  `json:"localNote"`
	CustomImageObjectKey *string `json:"customImageObjectKey"`
	PublicationStatus    string  `json:"publicationStatus"`
}

const assortmentColumns = `id, store_id, master_product_id, unit_price, currency, available, stock_status,
	local_note, custom_image_object_key, publication_status, submitted_by, approved_by, created_at, updated_at`

func scanAssortment(scanner interface{ Scan(...any) error }) (StoreAssortment, error) {
	var a StoreAssortment
	err := scanner.Scan(&a.ID, &a.StoreID, &a.MasterProductID, &a.UnitPrice, &a.Currency, &a.Available,
		&a.StockStatus, &a.LocalNote, &a.CustomImageObjectKey, &a.PublicationStatus, &a.SubmittedBy,
		&a.ApprovedBy, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrNotFound
	}
	return a, err
}

func ListStoreAssortment(ctx context.Context, db *sql.DB, storeID string) ([]StoreAssortment, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+assortmentColumns+` FROM dsh_store_assortments
		WHERE store_id=$1 ORDER BY updated_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoreAssortment{}
	for rows.Next() {
		a, err := scanAssortment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// UpsertStoreAssortment creates or edits the store's link to a master
// product. The caller MUST resolve the node's platform policy first and pass
// allowCustomImage=false when the policy forbids it — a non-empty
// CustomImageObjectKey is rejected with ErrForbidden in that case, so no
// surface can silently bypass platform policy.
func UpsertStoreAssortment(ctx context.Context, db *sql.DB, storeID, masterProductID, actorID string, input StoreAssortmentInput, allowCustomImage bool) (StoreAssortment, error) {
	if strings.TrimSpace(storeID) == "" || strings.TrimSpace(masterProductID) == "" || input.UnitPrice < 0 {
		return StoreAssortment{}, ErrInvalid
	}
	stockStatus := input.StockStatus
	if stockStatus == "" {
		stockStatus = "in_stock"
	}
	if !validStockStatus[stockStatus] {
		return StoreAssortment{}, ErrInvalid
	}
	publicationStatus := input.PublicationStatus
	if publicationStatus == "" {
		publicationStatus = "draft"
	}
	if !validPublicationStatus[publicationStatus] {
		return StoreAssortment{}, ErrInvalid
	}
	currency := input.Currency
	if currency == "" {
		currency = "YER"
	}
	if input.CustomImageObjectKey != nil && strings.TrimSpace(*input.CustomImageObjectKey) != "" && !allowCustomImage {
		return StoreAssortment{}, ErrForbidden
	}
	id := entityID("assortment")
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_store_assortments
		(id, store_id, master_product_id, unit_price, currency, available, stock_status, local_note,
		 custom_image_object_key, publication_status, submitted_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (store_id, master_product_id) DO UPDATE SET
		  unit_price=EXCLUDED.unit_price, currency=EXCLUDED.currency, available=EXCLUDED.available,
		  stock_status=EXCLUDED.stock_status, local_note=EXCLUDED.local_note,
		  custom_image_object_key=EXCLUDED.custom_image_object_key,
		  publication_status=EXCLUDED.publication_status, updated_at=now()`,
		id, storeID, masterProductID, input.UnitPrice, currency, input.Available, stockStatus, input.LocalNote,
		input.CustomImageObjectKey, publicationStatus, actorID)
	if err != nil {
		return StoreAssortment{}, err
	}
	var out StoreAssortment
	return out, scanInto(&out, db.QueryRowContext(ctx, `SELECT `+assortmentColumns+`
		FROM dsh_store_assortments WHERE store_id=$1 AND master_product_id=$2`, storeID, masterProductID))
}

func scanInto(dst *StoreAssortment, row *sql.Row) error {
	a, err := scanAssortment(row)
	if err != nil {
		return err
	}
	*dst = a
	return nil
}

// ── Platform catalog policy (commission/fee/capability flags per category) ─

type CatalogPolicy struct {
	ID                                          string    `json:"id"`
	DomainID                                    *string   `json:"domainId"`
	NodeID                                      *string   `json:"nodeId"`
	PolicyScope                                 string    `json:"policyScope"`
	PlatformCommissionRate                      float64   `json:"platformCommissionRate"`
	FieldPartnerOnboardingCommissionAmount      float64   `json:"fieldPartnerOnboardingCommissionAmount"`
	FieldPartnerOnboardingCommissionCurrency    string    `json:"fieldPartnerOnboardingCommissionCurrency"`
	StoreOnboardingFeeAmount                    float64   `json:"storeOnboardingFeeAmount"`
	StoreOnboardingFeeCurrency                   string    `json:"storeOnboardingFeeCurrency"`
	AllowsStoreProductCustomImage               bool      `json:"allowsStoreProductCustomImage"`
	AllowsProductProposal                       bool      `json:"allowsProductProposal"`
	RequiresBarcode                              bool      `json:"requiresBarcode"`
	RequiresCatalogReview                        bool      `json:"requiresCatalogReview"`
	IsActive                                     bool      `json:"isActive"`
	EffectiveFrom                                time.Time `json:"effectiveFrom"`
	Notes                                         string    `json:"notes"`
	CreatedAt                                    time.Time `json:"createdAt"`
	UpdatedAt                                    time.Time `json:"updatedAt"`
}

const policyColumns = `id, domain_id, node_id, policy_scope, platform_commission_rate,
	field_partner_onboarding_commission_amount, field_partner_onboarding_commission_currency,
	store_onboarding_fee_amount, store_onboarding_fee_currency, allows_store_product_custom_image,
	allows_product_proposal, requires_barcode, requires_catalog_review, is_active, effective_from, notes,
	created_at, updated_at`

func scanPolicy(scanner interface{ Scan(...any) error }) (CatalogPolicy, error) {
	var p CatalogPolicy
	err := scanner.Scan(&p.ID, &p.DomainID, &p.NodeID, &p.PolicyScope, &p.PlatformCommissionRate,
		&p.FieldPartnerOnboardingCommissionAmount, &p.FieldPartnerOnboardingCommissionCurrency,
		&p.StoreOnboardingFeeAmount, &p.StoreOnboardingFeeCurrency, &p.AllowsStoreProductCustomImage,
		&p.AllowsProductProposal, &p.RequiresBarcode, &p.RequiresCatalogReview, &p.IsActive,
		&p.EffectiveFrom, &p.Notes, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func ListCatalogPolicies(ctx context.Context, db *sql.DB) ([]CatalogPolicy, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+policyColumns+` FROM dsh_catalog_platform_policies
		ORDER BY policy_scope, domain_id NULLS FIRST, node_id NULLS FIRST`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CatalogPolicy{}
	for rows.Next() {
		p, err := scanPolicy(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

type CatalogPolicyInput struct {
	PlatformCommissionRate                   float64 `json:"platformCommissionRate"`
	FieldPartnerOnboardingCommissionAmount   float64 `json:"fieldPartnerOnboardingCommissionAmount"`
	FieldPartnerOnboardingCommissionCurrency string  `json:"fieldPartnerOnboardingCommissionCurrency"`
	StoreOnboardingFeeAmount                 float64 `json:"storeOnboardingFeeAmount"`
	StoreOnboardingFeeCurrency               string  `json:"storeOnboardingFeeCurrency"`
	AllowsStoreProductCustomImage            bool    `json:"allowsStoreProductCustomImage"`
	AllowsProductProposal                    bool    `json:"allowsProductProposal"`
	RequiresBarcode                          bool    `json:"requiresBarcode"`
	RequiresCatalogReview                    bool    `json:"requiresCatalogReview"`
	IsActive                                 bool    `json:"isActive"`
	Notes                                    string  `json:"notes"`
}

func UpdateCatalogPolicy(ctx context.Context, db *sql.DB, id string, input CatalogPolicyInput) (CatalogPolicy, error) {
	if input.PlatformCommissionRate < 0 || input.PlatformCommissionRate > 1 {
		return CatalogPolicy{}, ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_platform_policies SET
		platform_commission_rate=$1, field_partner_onboarding_commission_amount=$2,
		field_partner_onboarding_commission_currency=$3, store_onboarding_fee_amount=$4,
		store_onboarding_fee_currency=$5, allows_store_product_custom_image=$6, allows_product_proposal=$7,
		requires_barcode=$8, requires_catalog_review=$9, is_active=$10, notes=$11, updated_at=now()
		WHERE id=$12`,
		input.PlatformCommissionRate, input.FieldPartnerOnboardingCommissionAmount,
		input.FieldPartnerOnboardingCommissionCurrency, input.StoreOnboardingFeeAmount,
		input.StoreOnboardingFeeCurrency, input.AllowsStoreProductCustomImage, input.AllowsProductProposal,
		input.RequiresBarcode, input.RequiresCatalogReview, input.IsActive, input.Notes, id)
	if err != nil {
		return CatalogPolicy{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return CatalogPolicy{}, ErrNotFound
	}
	return scanPolicy(db.QueryRowContext(ctx, `SELECT `+policyColumns+` FROM dsh_catalog_platform_policies WHERE id=$1`, id))
}

// ResolveEffectivePolicy implements the resolution order documented in
// dsh-030: node-scoped policy -> domain-scoped policy -> platform default.
// This is the ONLY sanctioned way any surface learns a commission rate, fee,
// or capability flag for a category — never hardcode these in app code.
func ResolveEffectivePolicy(ctx context.Context, db *sql.DB, domainID, nodeID string) (CatalogPolicy, error) {
	if nodeID != "" {
		p, err := scanPolicy(db.QueryRowContext(ctx, `SELECT `+policyColumns+`
			FROM dsh_catalog_platform_policies WHERE node_id=$1 AND policy_scope='node' AND is_active=true`, nodeID))
		if err == nil {
			return p, nil
		}
		if !errors.Is(err, ErrNotFound) {
			return CatalogPolicy{}, err
		}
	}
	if domainID != "" {
		p, err := scanPolicy(db.QueryRowContext(ctx, `SELECT `+policyColumns+`
			FROM dsh_catalog_platform_policies WHERE domain_id=$1 AND policy_scope='domain' AND is_active=true`, domainID))
		if err == nil {
			return p, nil
		}
		if !errors.Is(err, ErrNotFound) {
			return CatalogPolicy{}, err
		}
	}
	return scanPolicy(db.QueryRowContext(ctx, `SELECT `+policyColumns+`
		FROM dsh_catalog_platform_policies WHERE policy_scope='default' AND is_active=true LIMIT 1`))
}

// ── Client-visible catalog (Phase 9 gating) ─────────────────────────────────

type ClientCatalogNode struct {
	Node
	Children []ClientCatalogNode `json:"children,omitempty"`
}

type ClientCatalogEntry struct {
	MasterProduct
	UnitPrice   float64 `json:"unitPrice"`
	Currency    string  `json:"currency"`
	StockStatus string  `json:"stockStatus"`
	ImageObjectKey string `json:"imageObjectKey"`
}

// GetClientCatalog returns only what rule 4 of the sovereignty decision
// allows through: approved+active master products, in an active+client
// visible domain/node, with a client_visible+available store assortment row,
// for a published store. No local product/category can leak in here because
// the query originates entirely from the master tables joined through the
// assortment link.
func GetClientCatalog(ctx context.Context, db *sql.DB, storeID string) ([]Domain, []ClientCatalogEntry, error) {
	var storePublished bool
	err := db.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM dsh_stores WHERE id=$1 AND status='active' AND is_visible=true
		  AND serviceability_status IN ('serviceable','limited')
	)`, storeID).Scan(&storePublished)
	if err != nil {
		return nil, nil, err
	}
	if !storePublished {
		return nil, nil, ErrNotFound
	}

	rows, err := db.QueryContext(ctx, `
		SELECT `+prefixColumns("mp", masterProductColumns)+`, a.unit_price, a.currency, a.stock_status,
		       COALESCE(a.custom_image_object_key, mp.canonical_image_object_key, '')
		FROM dsh_store_assortments a
		JOIN dsh_master_products mp ON mp.id = a.master_product_id
		JOIN dsh_catalog_domains d ON d.id = mp.domain_id
		LEFT JOIN dsh_catalog_nodes n ON n.id = mp.category_node_id
		WHERE a.store_id = $1
		  AND a.publication_status = 'client_visible' AND a.available = true
		  AND mp.approval_status = 'approved' AND mp.is_active = true
		  AND d.is_active = true AND d.is_client_visible = true
		  AND (n.id IS NULL OR (n.is_active = true AND n.is_client_visible = true))
		ORDER BY mp.canonical_name_ar`, storeID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	entries := []ClientCatalogEntry{}
	domainIDs := map[string]bool{}
	for rows.Next() {
		var e ClientCatalogEntry
		if err := rows.Scan(&e.ID, &e.DomainID, &e.CategoryNodeID, &e.CanonicalNameAr, &e.CanonicalNameEn,
			&e.Brand, &e.Barcode, &e.GTIN, &e.SKU, &e.Unit, &e.MeasurementType, &e.CanonicalImageObjectKey,
			&e.ApprovalStatus, &e.IsActive, &e.DuplicateGroupID, &e.CreatedSource, &e.CreatedAt, &e.UpdatedAt,
			&e.UnitPrice, &e.Currency, &e.StockStatus, &e.ImageObjectKey); err != nil {
			return nil, nil, err
		}
		entries = append(entries, e)
		domainIDs[e.DomainID] = true
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	domains := []Domain{}
	for id := range domainIDs {
		d, err := GetDomain(ctx, db, id)
		if err != nil {
			return nil, nil, err
		}
		domains = append(domains, d)
	}
	return domains, entries, nil
}

func prefixColumns(alias, columns string) string {
	parts := strings.Split(columns, ", ")
	for i, p := range parts {
		parts[i] = alias + "." + p
	}
	return strings.Join(parts, ", ")
}

func entityID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}
