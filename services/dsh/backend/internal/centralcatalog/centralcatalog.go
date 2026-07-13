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

	"dsh-api/internal/media"
)

var (
	ErrNotFound  = errors.New("central catalog entity not found")
	ErrInvalid   = errors.New("invalid central catalog input")
	ErrConflict  = errors.New("central catalog conflict")
	ErrForbidden = errors.New("action not permitted by platform policy")
)

// ── L1: BUSINESS_DOMAIN ─────────────────────────────────────────────────────

type Domain struct {
	ID                     string    `json:"id"`
	Slug                   string    `json:"slug"`
	NameAr                 string    `json:"nameAr"`
	NameEn                 string    `json:"nameEn"`
	Icon                   string    `json:"icon"`
	SortOrder              int       `json:"sortOrder"`
	IsActive               bool      `json:"isActive"`
	IsClientVisible        bool      `json:"isClientVisible"`
	RequiresProductCatalog bool      `json:"requiresProductCatalog"`
	IsManualRequest        bool      `json:"isManualRequest"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
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
	ID                            string    `json:"id"`
	DomainID                      string    `json:"domainId"`
	ParentID                      *string   `json:"parentId"`
	Level                         string    `json:"level"`
	Slug                          string    `json:"slug"`
	NameAr                        string    `json:"nameAr"`
	NameEn                        string    `json:"nameEn"`
	Icon                          string    `json:"icon"`
	SortOrder                     int       `json:"sortOrder"`
	IsActive                      bool      `json:"isActive"`
	IsClientVisible               bool      `json:"isClientVisible"`
	RequiresBarcode               bool      `json:"requiresBarcode"`
	AllowsProductProposal         bool      `json:"allowsProductProposal"`
	AllowsStoreProductCustomImage bool      `json:"allowsStoreProductCustomImage"`
	RequiresCatalogReview         bool      `json:"requiresCatalogReview"`
	RequiresProductCatalog        bool      `json:"requiresProductCatalog"`
	CreatedAt                     time.Time `json:"createdAt"`
	UpdatedAt                     time.Time `json:"updatedAt"`
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
	ActiveOnly     bool
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
		  AND (NOT $4 OR is_active=true)
		  AND ($5='' OR canonical_name_ar ILIKE '%'||$5||'%' OR canonical_name_en ILIKE '%'||$5||'%' OR barcode=$5)
		ORDER BY updated_at DESC LIMIT $6 OFFSET $7`
	rows, err := db.QueryContext(ctx, query, filter.DomainID, filter.CategoryNodeID, filter.ApprovalStatus,
		filter.ActiveOnly, filter.Search, limit, filter.Offset)
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
	ID                     string     `json:"id"`
	ProposedNameAr         string     `json:"proposedNameAr"`
	ProposedNameEn         string     `json:"proposedNameEn"`
	DomainID               string     `json:"domainId"`
	CategoryNodeID         *string    `json:"categoryNodeId"`
	Brand                  string     `json:"brand"`
	Barcode                *string    `json:"barcode"`
	ImageObjectKey         *string    `json:"imageObjectKey"`
	SourceSurface          string     `json:"sourceSurface"`
	SourceActorID          string     `json:"sourceActorId"`
	SourceStoreID          *string    `json:"sourceStoreId"`
	Status                 string     `json:"status"`
	ReviewNote             string     `json:"reviewNote"`
	AdoptedMasterProductID *string    `json:"adoptedMasterProductId"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
	ReviewStage            string     `json:"reviewStage"`
	PartnerReviewedBy      *string    `json:"partnerReviewedBy"`
	MarketingReviewedBy    *string    `json:"marketingReviewedBy"`
	CatalogAdoptedBy       *string    `json:"catalogAdoptedBy"`
	CatalogApprovedBy      *string    `json:"catalogApprovedBy"`
	ClientVisibleAt        *time.Time `json:"clientVisibleAt"`
	AuditRequired          bool       `json:"auditRequired"`
	BlockedReason          *string    `json:"blockedReason"`
	ResubmissionCount      int        `json:"resubmissionCount"`
	LinkedStoreID          *string    `json:"linkedStoreId"`
}

var validSourceSurface = map[string]bool{
	"app-field": true, "app-partner": true, "control-panel-catalog": true, "control-panel-platform": true,
}
var validProposalStatus = map[string]bool{
	"catalog-draft": true, "partner-proposed": true, "partner-review": true, "marketing-review": true,
	"catalog-adopted": true, "catalog-approved": true, "client-visible": true, "needs-fix": true, "rejected": true,
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
	adopted_master_product_id, created_at, updated_at, review_stage, partner_reviewed_by,
	marketing_reviewed_by, catalog_adopted_by, catalog_approved_by, client_visible_at,
	audit_required, blocked_reason, resubmission_count, linked_store_id`

func scanProposal(scanner interface{ Scan(...any) error }) (ProductProposal, error) {
	var p ProductProposal
	err := scanner.Scan(&p.ID, &p.ProposedNameAr, &p.ProposedNameEn, &p.DomainID, &p.CategoryNodeID, &p.Brand,
		&p.Barcode, &p.ImageObjectKey, &p.SourceSurface, &p.SourceActorID, &p.SourceStoreID, &p.Status,
		&p.ReviewNote, &p.AdoptedMasterProductID, &p.CreatedAt, &p.UpdatedAt, &p.ReviewStage, &p.PartnerReviewedBy,
		&p.MarketingReviewedBy, &p.CatalogAdoptedBy, &p.CatalogApprovedBy, &p.ClientVisibleAt, &p.AuditRequired,
		&p.BlockedReason, &p.ResubmissionCount, &p.LinkedStoreID)
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

	// 1. Manual request domains check
	var isManual bool
	err := db.QueryRowContext(ctx, `SELECT is_manual_request FROM dsh_catalog_domains WHERE id=$1`, input.DomainID).Scan(&isManual)
	if err != nil {
		return ProductProposal{}, err
	}
	if isManual {
		return ProductProposal{}, fmt.Errorf("%w: manual request domains bypass the product catalog", ErrInvalid)
	}

	// 2. Resolve effective catalog policy
	var nodeID string
	if input.CategoryNodeID != nil {
		nodeID = *input.CategoryNodeID
	}
	policy, err := ResolveEffectivePolicy(ctx, db, input.DomainID, nodeID)
	if err != nil {
		return ProductProposal{}, err
	}

	// 3. Enforce policy constraints
	if !policy.AllowsProductProposal {
		return ProductProposal{}, fmt.Errorf("%w: PRODUCT_PROPOSAL_NOT_ALLOWED_FOR_CATEGORY", ErrForbidden)
	}
	if policy.RequiresBarcode && (input.Barcode == nil || strings.TrimSpace(*input.Barcode) == "") {
		return ProductProposal{}, fmt.Errorf("%w: BARCODE_REQUIRED_FOR_CATEGORY", ErrInvalid)
	}
	if !policy.AllowsStoreProductCustomImage && (input.ImageObjectKey != nil && strings.TrimSpace(*input.ImageObjectKey) != "") {
		return ProductProposal{}, fmt.Errorf("%w: CUSTOM_IMAGE_NOT_ALLOWED_FOR_CATEGORY", ErrForbidden)
	}

	id := entityID("proposal")
	_, err = db.ExecContext(ctx, `INSERT INTO dsh_product_proposals
		(id, proposed_name_ar, proposed_name_en, domain_id, category_node_id, brand, barcode, image_object_key,
		 source_surface, source_actor_id, source_store_id, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'partner-proposed')`,
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
// legacyDecisionToPipelineStatus maps the pre-dsh-031 decision vocabulary to
// the current pipeline status names so old callers of the decision endpoint
// keep working instead of silently failing validProposalStatus.
var legacyDecisionToPipelineStatus = map[string]string{
	"under_review": "partner-review",
	"adopted":      "catalog-adopted",
	"rejected":     "rejected",
	"needs_fix":    "needs-fix",
}

// DecideProposal is DEPRECATED: kept only as a thin translation wrapper over
// TransitionProposal for callers still using the pre-dsh-031 decision
// vocabulary. New code must call TransitionProposal directly.
func DecideProposal(ctx context.Context, db *sql.DB, actorID, actorRole, id string, input ProposalDecisionInput) (ProductProposal, error) {
	nextStatus, ok := legacyDecisionToPipelineStatus[input.Decision]
	if !ok {
		nextStatus, ok = input.Decision, validProposalStatus[input.Decision]
	}
	if !ok {
		return ProductProposal{}, ErrInvalid
	}
	createMasterProduct := input.AdoptedMasterProductID == nil
	return TransitionProposal(ctx, db, actorID, actorRole, id, ProposalTransitionInput{
		NextStatus:             nextStatus,
		Note:                   input.ReviewNote,
		AdoptedMasterProductID: input.AdoptedMasterProductID,
		CreateMasterProduct:    &createMasterProduct,
	})
}

// ── Store assortment (store-local truth: price/availability/stock/note/image) ─

type StoreAssortment struct {
	ID                   string    `json:"id"`
	StoreID              string    `json:"storeId"`
	MasterProductID      string    `json:"masterProductId"`
	UnitPrice            float64   `json:"unitPrice"`
	Currency             string    `json:"currency"`
	Available            bool      `json:"available"`
	StockStatus          string    `json:"stockStatus"`
	LocalNote            string    `json:"localNote"`
	CustomImageObjectKey *string   `json:"customImageObjectKey"`
	PublicationStatus    string    `json:"publicationStatus"`
	SubmittedBy          string    `json:"submittedBy"`
	ApprovedBy           string    `json:"approvedBy"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
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

// GetStoreAssortmentByID looks up a single assortment row regardless of
// store, so callers can resolve which store owns it (e.g. for DAM asset-link
// ownership checks) before knowing the store ID.
func GetStoreAssortmentByID(ctx context.Context, db *sql.DB, id string) (StoreAssortment, error) {
	return scanAssortment(db.QueryRowContext(ctx, `SELECT `+assortmentColumns+` FROM dsh_store_assortments WHERE id=$1`, id))
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
	ID                                       string    `json:"id"`
	DomainID                                 *string   `json:"domainId"`
	NodeID                                   *string   `json:"nodeId"`
	PolicyScope                              string    `json:"policyScope"`
	PlatformCommissionRate                   float64   `json:"platformCommissionRate"`
	FieldPartnerOnboardingCommissionAmount   float64   `json:"fieldPartnerOnboardingCommissionAmount"`
	FieldPartnerOnboardingCommissionCurrency string    `json:"fieldPartnerOnboardingCommissionCurrency"`
	StoreOnboardingFeeAmount                 float64   `json:"storeOnboardingFeeAmount"`
	StoreOnboardingFeeCurrency               string    `json:"storeOnboardingFeeCurrency"`
	AllowsStoreProductCustomImage            bool      `json:"allowsStoreProductCustomImage"`
	AllowsProductProposal                    bool      `json:"allowsProductProposal"`
	RequiresBarcode                          bool      `json:"requiresBarcode"`
	RequiresCatalogReview                    bool      `json:"requiresCatalogReview"`
	RequiresMarketingReview                  bool      `json:"requiresMarketingReview"`
	RequiresProductImage                     bool      `json:"requiresProductImage"`
	RequiresCategoryImage                    bool      `json:"requiresCategoryImage"`
	RequiresDescription                      bool      `json:"requiresDescription"`
	RequiresBrand                            bool      `json:"requiresBrand"`
	RequiresUnit                             bool      `json:"requiresUnit"`
	ProductDataQualityMinimumScore           float64   `json:"productDataQualityMinimumScore"`
	MaxGalleryImages                         int       `json:"maxGalleryImages"`
	ManualRequestMode                        bool      `json:"manualRequestMode"`
	IsActive                                 bool      `json:"isActive"`
	EffectiveFrom                            time.Time `json:"effectiveFrom"`
	Notes                                    string    `json:"notes"`
	CreatedAt                                time.Time `json:"createdAt"`
	UpdatedAt                                time.Time `json:"updatedAt"`
}

const policyColumns = `id, domain_id, node_id, policy_scope, platform_commission_rate,
	field_partner_onboarding_commission_amount, field_partner_onboarding_commission_currency,
	store_onboarding_fee_amount, store_onboarding_fee_currency, allows_store_product_custom_image,
	allows_product_proposal, requires_barcode, requires_catalog_review, requires_marketing_review,
	requires_product_image, requires_category_image, requires_description, requires_brand, requires_unit,
	product_data_quality_minimum_score, max_gallery_images, manual_request_mode, is_active, effective_from, notes,
	created_at, updated_at`

func scanPolicy(scanner interface{ Scan(...any) error }) (CatalogPolicy, error) {
	var p CatalogPolicy
	err := scanner.Scan(&p.ID, &p.DomainID, &p.NodeID, &p.PolicyScope, &p.PlatformCommissionRate,
		&p.FieldPartnerOnboardingCommissionAmount, &p.FieldPartnerOnboardingCommissionCurrency,
		&p.StoreOnboardingFeeAmount, &p.StoreOnboardingFeeCurrency, &p.AllowsStoreProductCustomImage,
		&p.AllowsProductProposal, &p.RequiresBarcode, &p.RequiresCatalogReview, &p.RequiresMarketingReview,
		&p.RequiresProductImage, &p.RequiresCategoryImage, &p.RequiresDescription, &p.RequiresBrand, &p.RequiresUnit,
		&p.ProductDataQualityMinimumScore, &p.MaxGalleryImages, &p.ManualRequestMode, &p.IsActive,
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
	RequiresMarketingReview                  bool    `json:"requiresMarketingReview"`
	RequiresProductImage                     bool    `json:"requiresProductImage"`
	RequiresCategoryImage                    bool    `json:"requiresCategoryImage"`
	RequiresDescription                      bool    `json:"requiresDescription"`
	RequiresBrand                            bool    `json:"requiresBrand"`
	RequiresUnit                             bool    `json:"requiresUnit"`
	ProductDataQualityMinimumScore           float64 `json:"productDataQualityMinimumScore"`
	MaxGalleryImages                         int     `json:"maxGalleryImages"`
	ManualRequestMode                        bool    `json:"manualRequestMode"`
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
		requires_barcode=$8, requires_catalog_review=$9, requires_marketing_review=$10, requires_product_image=$11,
		requires_category_image=$12, requires_description=$13, requires_brand=$14, requires_unit=$15,
		product_data_quality_minimum_score=$16, max_gallery_images=$17, manual_request_mode=$18,
		is_active=$19, notes=$20, updated_at=now()
		WHERE id=$21`,
		input.PlatformCommissionRate, input.FieldPartnerOnboardingCommissionAmount,
		input.FieldPartnerOnboardingCommissionCurrency, input.StoreOnboardingFeeAmount,
		input.StoreOnboardingFeeCurrency, input.AllowsStoreProductCustomImage, input.AllowsProductProposal,
		input.RequiresBarcode, input.RequiresCatalogReview, input.RequiresMarketingReview, input.RequiresProductImage,
		input.RequiresCategoryImage, input.RequiresDescription, input.RequiresBrand, input.RequiresUnit,
		input.ProductDataQualityMinimumScore, input.MaxGalleryImages, input.ManualRequestMode,
		input.IsActive, input.Notes, id)
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
	UnitPrice      float64 `json:"unitPrice"`
	Currency       string  `json:"currency"`
	StockStatus    string  `json:"stockStatus"`
	ImageObjectKey string  `json:"imageObjectKey"`
}

// GetClientCatalog returns only what rule 4 of the sovereignty decision
// allows through: approved+active master products, in an active+client
// visible domain/node, with a client_visible+available store assortment row,
// for a published store. No local product/category can leak in here because
// the query originates entirely from the master tables joined through the
// assortment link.
func GetClientCatalog(ctx context.Context, db *sql.DB, storeID string) ([]Domain, []Node, []ClientCatalogEntry, []CatalogAssetLinkWithAsset, []CatalogPolicy, error) {
	var storePublished bool
	err := db.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM dsh_stores WHERE id=$1 AND status='active' AND is_visible=true
		  AND serviceability_status IN ('serviceable','limited')
	)`, storeID).Scan(&storePublished)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	if !storePublished {
		return nil, nil, nil, nil, nil, ErrNotFound
	}

	// 1. Fetch active policies
	policies, err := ListCatalogPolicies(ctx, db)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}

	// Helper to resolve policy from active list
	resolvePolicy := func(domainID, nodeID string) CatalogPolicy {
		if nodeID != "" {
			for _, p := range policies {
				if p.NodeID != nil && *p.NodeID == nodeID && p.PolicyScope == "node" && p.IsActive {
					return p
				}
			}
		}
		if domainID != "" {
			for _, p := range policies {
				if p.DomainID != nil && *p.DomainID == domainID && p.PolicyScope == "domain" && p.IsActive {
					return p
				}
			}
		}
		for _, p := range policies {
			if p.PolicyScope == "default" && p.IsActive {
				return p
			}
		}
		return CatalogPolicy{}
	}

	// 2. Fetch approved asset links, joined with their asset so the client
	// gets a renderable objectKey/publicUrl instead of a bare link it would
	// have to separately resolve.
	linkRows, err := db.QueryContext(ctx, `
		SELECT `+prefixColumns("al", assetLinkColumns)+`, a.object_key, a.alt_ar, a.alt_en, a.mime_type
		FROM dsh_catalog_asset_links al
		JOIN dsh_catalog_assets a ON a.id = al.asset_id
		WHERE al.status = 'approved' AND a.status = 'approved'
	`)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	defer linkRows.Close()
	allLinks := []CatalogAssetLinkWithAsset{}
	for linkRows.Next() {
		l, err := scanAssetLinkWithAsset(linkRows)
		if err != nil {
			return nil, nil, nil, nil, nil, err
		}
		allLinks = append(allLinks, l)
	}

	// 3. Fetch candidate products
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
		  AND d.is_active = true AND d.is_client_visible = true AND d.is_manual_request = false
		  AND (n.id IS NULL OR (n.is_active = true AND n.is_client_visible = true))
		  AND NOT EXISTS (
		      SELECT 1 FROM dsh_catalog_asset_links al
		      WHERE al.entity_type = 'master_product' AND al.entity_id = mp.id
		        AND al.role = 'canonical_product_image' AND al.status = 'rejected'
		  )
		ORDER BY mp.canonical_name_ar`, storeID)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	defer rows.Close()

	entries := []ClientCatalogEntry{}
	domainIDs := map[string]bool{}
	nodeIDs := map[string]bool{}

	for rows.Next() {
		var e ClientCatalogEntry
		if err := rows.Scan(&e.ID, &e.DomainID, &e.CategoryNodeID, &e.CanonicalNameAr, &e.CanonicalNameEn,
			&e.Brand, &e.Barcode, &e.GTIN, &e.SKU, &e.Unit, &e.MeasurementType, &e.CanonicalImageObjectKey,
			&e.ApprovalStatus, &e.IsActive, &e.DuplicateGroupID, &e.CreatedSource, &e.CreatedAt, &e.UpdatedAt,
			&e.UnitPrice, &e.Currency, &e.StockStatus, &e.ImageObjectKey); err != nil {
			return nil, nil, nil, nil, nil, err
		}

		// 4. Media policy satisfaction gate
		catNodeID := ""
		if e.CategoryNodeID != nil {
			catNodeID = *e.CategoryNodeID
		}
		p := resolvePolicy(e.DomainID, catNodeID)
		if p.RequiresProductImage {
			hasApprovedImg := false
			for _, l := range allLinks {
				if l.EntityType == "master_product" && l.EntityID == e.ID && l.Role == "canonical_product_image" {
					hasApprovedImg = true
					break
				}
			}
			if !hasApprovedImg {
				continue
			}
		}

		entries = append(entries, e)
		domainIDs[e.DomainID] = true
		if e.CategoryNodeID != nil {
			nodeIDs[*e.CategoryNodeID] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, nil, nil, nil, err
	}

	domains := []Domain{}
	for id := range domainIDs {
		d, err := GetDomain(ctx, db, id)
		if err == nil {
			domains = append(domains, d)
		}
	}

	nodes := []Node{}
	for id := range nodeIDs {
		n, err := GetNode(ctx, db, id)
		if err == nil {
			nodes = append(nodes, n)
		}
	}

	relevantLinks := []CatalogAssetLinkWithAsset{}
	for _, l := range allLinks {
		keep := false
		switch l.EntityType {
		case "domain":
			keep = domainIDs[l.EntityID]
		case "node":
			keep = nodeIDs[l.EntityID]
		case "master_product":
			for _, e := range entries {
				if e.ID == l.EntityID {
					keep = true
					break
				}
			}
		}
		if keep {
			relevantLinks = append(relevantLinks, l)
		}
	}

	relevantPolicies := []CatalogPolicy{}
	for _, p := range policies {
		if !p.IsActive {
			continue
		}
		keep := false
		if p.PolicyScope == "default" {
			keep = true
		} else if p.PolicyScope == "domain" && p.DomainID != nil && domainIDs[*p.DomainID] {
			keep = true
		} else if p.PolicyScope == "node" && p.NodeID != nil && nodeIDs[*p.NodeID] {
			keep = true
		}
		if keep {
			relevantPolicies = append(relevantPolicies, p)
		}
	}

	return domains, nodes, entries, relevantLinks, relevantPolicies, nil
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

type ProposalTransitionInput struct {
	NextStatus             string  `json:"nextStatus"`
	Note                   string  `json:"note"`
	AdoptedMasterProductID *string `json:"adoptedMasterProductId"`
	CreateMasterProduct    *bool   `json:"createMasterProduct"`
}

// collectIDs drains a single-column id result set and closes it before the
// caller issues any further statement on the same transaction connection.
func collectIDs(rows *sql.Rows, err error) ([]string, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func TransitionProposal(ctx context.Context, db *sql.DB, actorID, actorRole, id string, input ProposalTransitionInput) (ProductProposal, error) {
	if !validProposalStatus[input.NextStatus] {
		return ProductProposal{}, fmt.Errorf("%w: invalid nextStatus", ErrInvalid)
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

	// Validate transition rules
	allowed := false
	switch proposal.Status {
	case "catalog-draft":
		allowed = (input.NextStatus == "partner-proposed")
	case "partner-proposed":
		allowed = (input.NextStatus == "partner-review" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected")
	case "partner-review":
		allowed = (input.NextStatus == "marketing-review" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected")
	case "marketing-review":
		allowed = (input.NextStatus == "catalog-adopted" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected")
	case "catalog-adopted":
		allowed = (input.NextStatus == "catalog-approved")
	case "catalog-approved":
		allowed = (input.NextStatus == "client-visible")
	case "needs-fix":
		allowed = (input.NextStatus == "partner-proposed")
	case "rejected":
		allowed = (input.NextStatus == "partner-proposed" || input.NextStatus == "partner-review")
	}

	if !allowed {
		return ProductProposal{}, fmt.Errorf("%w: transition from %s to %s is not allowed", ErrInvalid, proposal.Status, input.NextStatus)
	}

	var updateQuery string
	var args []any

	categoryNodeID := ""
	if proposal.CategoryNodeID != nil {
		categoryNodeID = *proposal.CategoryNodeID
	}

	switch input.NextStatus {
	case "partner-review":
		// Resolve effective policy and check capabilities
		policy, err := ResolveEffectivePolicy(ctx, db, proposal.DomainID, categoryNodeID)
		if err != nil {
			return ProductProposal{}, err
		}
		if !policy.AllowsProductProposal {
			return ProductProposal{}, fmt.Errorf("%w: product proposal not allowed for this category", ErrForbidden)
		}
		if policy.RequiresBarcode && (proposal.Barcode == nil || *proposal.Barcode == "") {
			return ProductProposal{}, fmt.Errorf("%w: barcode is required for this category", ErrInvalid)
		}

		// Check for duplicate candidates (barcode matches or exact name matches
		// in category). The candidate ids are collected before inserting: the
		// transaction owns a single connection, so executing while rows are
		// still open would poison every later statement in the transition.
		if proposal.Barcode != nil && *proposal.Barcode != "" {
			barcodeMatches, err := collectIDs(tx.QueryContext(ctx, `SELECT id FROM dsh_master_products WHERE barcode=$1`, *proposal.Barcode))
			if err != nil {
				return ProductProposal{}, err
			}
			for _, mpID := range barcodeMatches {
				dupID := entityID("dup-candidate")
				if _, err := tx.ExecContext(ctx, `INSERT INTO dsh_product_duplicate_candidates
					(id, proposal_id, candidate_master_product_id, reason, score, status)
					VALUES ($1, $2, $3, 'barcode match', 1.0, 'pending')
					ON CONFLICT DO NOTHING`, dupID, id, mpID); err != nil {
					return ProductProposal{}, err
				}
			}
		}

		if proposal.CategoryNodeID != nil {
			nameMatches, err := collectIDs(tx.QueryContext(ctx, `SELECT id FROM dsh_master_products WHERE category_node_id=$1 AND LOWER(canonical_name_ar)=LOWER($2)`, *proposal.CategoryNodeID, proposal.ProposedNameAr))
			if err != nil {
				return ProductProposal{}, err
			}
			for _, mpID := range nameMatches {
				dupID := entityID("dup-candidate")
				if _, err := tx.ExecContext(ctx, `INSERT INTO dsh_product_duplicate_candidates
					(id, proposal_id, candidate_master_product_id, reason, score, status)
					VALUES ($1, $2, $3, 'exact name match in category', 0.9, 'pending')
					ON CONFLICT DO NOTHING`, dupID, id, mpID); err != nil {
					return ProductProposal{}, err
				}
			}
		}

		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='partner-review', partner_reviewed_by=$3, updated_at=now() WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "marketing-review":
		// Verify policy requirements for images, descriptions, etc.
		policy, err := ResolveEffectivePolicy(ctx, db, proposal.DomainID, categoryNodeID)
		if err != nil {
			return ProductProposal{}, err
		}
		if policy.RequiresProductImage {
			var hasImg bool
			err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_asset_links WHERE entity_type='product_proposal' AND entity_id=$1 AND role='canonical_product_image' AND status IN ('approved', 'pending_review'))`, id).Scan(&hasImg)
			if err != nil || !hasImg {
				return ProductProposal{}, fmt.Errorf("%w: product image is required by platform policy", ErrForbidden)
			}
		}
		if policy.RequiresBrand && proposal.Brand == "" {
			return ProductProposal{}, fmt.Errorf("%w: brand is required for this category", ErrInvalid)
		}

		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='marketing-review', marketing_reviewed_by=$3, updated_at=now() WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "catalog-adopted":
		adoptedID := input.AdoptedMasterProductID

		// Check if there is an accepted duplicate candidate for this proposal
		var acceptedDupID string
		err = tx.QueryRowContext(ctx, `SELECT candidate_master_product_id FROM dsh_product_duplicate_candidates WHERE proposal_id=$1 AND status='accepted_existing' LIMIT 1`, id).Scan(&acceptedDupID)
		if err == nil {
			adoptedID = &acceptedDupID
		}

		if (input.CreateMasterProduct != nil && *input.CreateMasterProduct) || (adoptedID == nil && input.AdoptedMasterProductID == nil) {
			if proposal.Barcode != nil && *proposal.Barcode != "" && adoptedID == nil {
				var existingID string
				err = tx.QueryRowContext(ctx, `SELECT id FROM dsh_master_products WHERE barcode=$1 LIMIT 1`, *proposal.Barcode).Scan(&existingID)
				if err == nil {
					adoptedID = &existingID
				} else if !errors.Is(err, sql.ErrNoRows) {
					return ProductProposal{}, err
				}
			}

			if adoptedID == nil {
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
		}

		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='catalog-adopted', catalog_adopted_by=$3, adopted_master_product_id=$4, updated_at=now() WHERE id=$5`
		args = []any{input.NextStatus, input.Note, actorID, adoptedID, id}

	case "catalog-approved":
		if proposal.AdoptedMasterProductID != nil {
			_, err = tx.ExecContext(ctx, `UPDATE dsh_master_products SET approval_status='approved', is_active=true, updated_at=now() WHERE id=$1`, *proposal.AdoptedMasterProductID)
			if err != nil {
				return ProductProposal{}, err
			}

			if proposal.SourceStoreID != nil {
				assortID := entityID("assort")
				_, err = tx.ExecContext(ctx, `INSERT INTO dsh_store_assortments
					(id, store_id, master_product_id, unit_price, currency, available, stock_status, publication_status, submitted_by)
					VALUES ($1,$2,$3,0.00,'YER',true,'in_stock','approved',$4)
					ON CONFLICT (store_id, master_product_id) DO NOTHING`,
					assortID, *proposal.SourceStoreID, *proposal.AdoptedMasterProductID, actorID)
				if err != nil {
					return ProductProposal{}, err
				}
			}
		}

		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='catalog-approved', catalog_approved_by=$3, updated_at=now() WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "client-visible":
		if proposal.AdoptedMasterProductID == nil || proposal.SourceStoreID == nil {
			return ProductProposal{}, fmt.Errorf("%w: cannot transition to client-visible without approved product and store association", ErrInvalid)
		}

		// Verify master product is approved and active
		var mpApproved bool
		var mpActive bool
		err = tx.QueryRowContext(ctx, `SELECT (approval_status='approved'), is_active FROM dsh_master_products WHERE id=$1`, *proposal.AdoptedMasterProductID).Scan(&mpApproved, &mpActive)
		if err != nil || !mpApproved || !mpActive {
			return ProductProposal{}, fmt.Errorf("%w: master product must be approved and active", ErrForbidden)
		}

		// Verify domain is active and client visible
		var domActive bool
		var domVisible bool
		err = tx.QueryRowContext(ctx, `SELECT is_active, is_client_visible FROM dsh_catalog_domains WHERE id=$1`, proposal.DomainID).Scan(&domActive, &domVisible)
		if err != nil || !domActive || !domVisible {
			return ProductProposal{}, fmt.Errorf("%w: domain must be active and client visible", ErrForbidden)
		}

		// Verify node is active and client visible
		var nodeActive bool
		var nodeVisible bool
		err = tx.QueryRowContext(ctx, `SELECT is_active, is_client_visible FROM dsh_catalog_nodes WHERE id=$1`, proposal.CategoryNodeID).Scan(&nodeActive, &nodeVisible)
		if err != nil || !nodeActive || !nodeVisible {
			return ProductProposal{}, fmt.Errorf("%w: category node must be active and client visible", ErrForbidden)
		}

		// Verify store is active and visible
		var storeActive bool
		var storeVisible bool
		err = tx.QueryRowContext(ctx, `SELECT (status='active'), is_visible FROM dsh_stores WHERE id=$1`, *proposal.SourceStoreID).Scan(&storeActive, &storeVisible)
		if err != nil || !storeActive || !storeVisible {
			return ProductProposal{}, fmt.Errorf("%w: store must be active and visible", ErrForbidden)
		}

		// Verify store assortment price & availability
		var available bool
		var unitPrice float64
		err = tx.QueryRowContext(ctx, `SELECT available, unit_price FROM dsh_store_assortments WHERE store_id=$1 AND master_product_id=$2`, *proposal.SourceStoreID, *proposal.AdoptedMasterProductID).Scan(&available, &unitPrice)
		if err != nil {
			return ProductProposal{}, fmt.Errorf("store assortment not found: %w", err)
		}
		if !available || unitPrice <= 0 {
			return ProductProposal{}, fmt.Errorf("%w: store assortment price must be greater than 0 and available=true", ErrInvalid)
		}

		// Verify image policy if required
		policy, err := ResolveEffectivePolicy(ctx, db, proposal.DomainID, categoryNodeID)
		if err == nil && policy.RequiresProductImage {
			var hasApprovedImg bool
			err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_asset_links WHERE entity_type='master_product' AND entity_id=$1 AND role='canonical_product_image' AND status='approved')`, *proposal.AdoptedMasterProductID).Scan(&hasApprovedImg)
			if err != nil || !hasApprovedImg {
				err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_asset_links WHERE entity_type='product_proposal' AND entity_id=$1 AND role='canonical_product_image' AND status='approved')`, id).Scan(&hasApprovedImg)
				if err != nil || !hasApprovedImg {
					return ProductProposal{}, fmt.Errorf("%w: client visibility requires approved product image", ErrForbidden)
				}
			}
		}

		_, err = tx.ExecContext(ctx, `UPDATE dsh_store_assortments SET publication_status='client_visible', approved_by=$1, updated_at=now() WHERE store_id=$2 AND master_product_id=$3`,
			actorID, *proposal.SourceStoreID, *proposal.AdoptedMasterProductID)
		if err != nil {
			return ProductProposal{}, err
		}

		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='client-visible', client_visible_at=now(), updated_at=now() WHERE id=$3`
		args = []any{input.NextStatus, input.Note, id}

	case "needs-fix":
		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, review_stage='needs-fix', blocked_reason=$3, resubmission_count=resubmission_count+1, updated_at=now() WHERE id=$4`
		args = []any{input.NextStatus, input.Note, input.Note, id}

	default:
		updateQuery = `UPDATE dsh_product_proposals SET status=$1, review_note=$2, updated_at=now() WHERE id=$3`
		args = []any{input.NextStatus, input.Note, id}
	}

	_, err = tx.ExecContext(ctx, updateQuery, args...)
	if err != nil {
		return ProductProposal{}, err
	}

	// Record proposal-specific audit trail (dsh-032)
	auditID := entityID("proposal-audit")
	payloadJSON := `{"nextStatus":"` + input.NextStatus + `"}`
	_, err = tx.ExecContext(ctx, `INSERT INTO dsh_product_proposal_audit
		(id, proposal_id, from_status, to_status, actor_id, actor_role, note, payload_json)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
		auditID, id, proposal.Status, input.NextStatus, actorID, actorRole, input.Note, payloadJSON)
	if err != nil {
		return ProductProposal{}, err
	}

	if err := tx.Commit(); err != nil {
		return ProductProposal{}, err
	}
	return GetProposal(ctx, db, id)
}

// ── Catalog assets (DAM) ─────────────────────────────────────────────────────

type CatalogAsset struct {
	ID               string    `json:"id"`
	ObjectKey        string    `json:"objectKey"`
	PublicURL        *string   `json:"publicUrl"`
	OriginalFileName string    `json:"originalFileName"`
	MimeType         string    `json:"mimeType"`
	SizeBytes        int64     `json:"sizeBytes"`
	Width            *int      `json:"width"`
	Height           *int      `json:"height"`
	ChecksumSHA256   *string   `json:"checksumSha256"`
	AltAr            string    `json:"altAr"`
	AltEn            string    `json:"altEn"`
	DominantColor    *string   `json:"dominantColor"`
	Status           string    `json:"status"`
	SourceSurface    string    `json:"sourceSurface"`
	UploadedBy       string    `json:"uploadedBy"`
	ReviewedBy       *string   `json:"reviewedBy"`
	ReviewNote       string    `json:"reviewNote"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

var validAssetStatus = map[string]bool{
	"draft": true, "uploaded": true, "pending_review": true, "approved": true, "rejected": true, "archived": true,
}
var validAssetSourceSurface = map[string]bool{
	"control-panel-catalog": true, "control-panel-platform": true, "app-partner": true, "app-field": true, "system": true,
}
var validAssetRole = map[string]bool{
	"icon": true, "cover": true, "thumbnail": true, "gallery": true, "canonical_product_image": true,
	"partner_custom_product_image": true, "marketing_banner": true, "document": true,
	"store_logo": true, "store_cover": true, "storefront_photo": true, "interior_photo": true, "signage_photo": true,
}
var validAssetEntityType = map[string]bool{
	"domain": true, "node": true, "master_product": true, "product_proposal": true,
	"store_assortment": true, "collection": true, "campaign": true, "store": true,
}

// validStoreImageRole is the subset of validAssetRole that entityType=store
// may use -- keeps a partner/field actor from e.g. linking a
// canonical_product_image role against their store.
var validStoreImageRole = map[string]bool{
	"store_logo": true, "store_cover": true, "storefront_photo": true, "interior_photo": true, "signage_photo": true,
}

// IsValidStoreImageRole reports whether role is one of the roles a store
// entity (logo/cover/branch photos) may be linked under.
func IsValidStoreImageRole(role string) bool {
	return validStoreImageRole[role]
}

const assetColumns = `id, object_key, public_url, original_file_name, mime_type, size_bytes, width, height,
	checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by, reviewed_by,
	review_note, created_at, updated_at`

func scanAsset(scanner interface{ Scan(...any) error }) (CatalogAsset, error) {
	var a CatalogAsset
	err := scanner.Scan(&a.ID, &a.ObjectKey, &a.PublicURL, &a.OriginalFileName, &a.MimeType, &a.SizeBytes,
		&a.Width, &a.Height, &a.ChecksumSHA256, &a.AltAr, &a.AltEn, &a.DominantColor, &a.Status, &a.SourceSurface,
		&a.UploadedBy, &a.ReviewedBy, &a.ReviewNote, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrNotFound
	}
	return a, err
}

type AssetUploadIntentInput struct {
	FileName      string `json:"fileName"`
	MimeType      string `json:"mimeType"`
	SizeBytes     int64  `json:"sizeBytes"`
	SourceSurface string `json:"sourceSurface"`
	AltAr         string `json:"altAr"`
	AltEn         string `json:"altEn"`
}

func sanitizeAssetFileName(value string) string {
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	if b.Len() == 0 {
		return "file"
	}
	return b.String()
}

// maxAssetUploadSizeBytes bounds what a client may declare/upload for a
// single DAM asset (15 MiB); StatObject re-checks the real object against
// this too so a declared-then-swapped-larger file can't sneak past intent
// validation.
const maxAssetUploadSizeBytes = 15 * 1024 * 1024

// assetUploadIntentTTL is how long the presigned PUT URL stays valid.
const assetUploadIntentTTL = 15 * time.Minute

// GetApprovedAsset loads an asset for public/unauthenticated serving. Only
// approved assets are ever returned -- draft/pending/rejected/archived
// assets must stay invisible to app-client regardless of who guesses the ID.
func GetApprovedAsset(ctx context.Context, db *sql.DB, id string) (CatalogAsset, error) {
	asset, err := scanAsset(db.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
	if err != nil {
		return CatalogAsset{}, err
	}
	if asset.Status != "approved" {
		return CatalogAsset{}, ErrNotFound
	}
	return asset, nil
}

// AssetUploadIntent is what CreateAssetUploadIntent returns: the draft asset
// row plus a short-lived presigned URL the surface can PUT the file to
// directly, without dsh-api ever holding the binary or the surface ever
// holding MinIO credentials.
type AssetUploadIntent struct {
	Asset     CatalogAsset `json:"asset"`
	UploadURL string       `json:"uploadUrl"`
	ExpiresAt time.Time    `json:"expiresAt"`
}

// CreateAssetUploadIntent registers a new DAM asset row in draft state and
// returns the object key plus a presigned upload URL the surface should PUT
// the file to. Nothing is client-visible until an operator/marketing
// reviewer runs ReviewAsset, and nothing is even eligible for review until
// CompleteAssetUpload confirms the object landed in MinIO.
func CreateAssetUploadIntent(ctx context.Context, db *sql.DB, mediaClient *media.Client, actorID string, input AssetUploadIntentInput) (AssetUploadIntent, error) {
	if strings.TrimSpace(input.FileName) == "" || !strings.HasPrefix(input.MimeType, "image/") ||
		input.SizeBytes <= 0 || input.SizeBytes > maxAssetUploadSizeBytes || !validAssetSourceSurface[input.SourceSurface] {
		return AssetUploadIntent{}, ErrInvalid
	}
	if mediaClient == nil {
		return AssetUploadIntent{}, fmt.Errorf("%w: media storage is not configured", ErrInvalid)
	}
	id := entityID("asset")
	objectKey := fmt.Sprintf("catalog-assets/%s/%s", id, sanitizeAssetFileName(input.FileName))
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_assets
		(id, object_key, original_file_name, mime_type, size_bytes, alt_ar, alt_en, status, source_surface, uploaded_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9)`,
		id, objectKey, input.FileName, input.MimeType, input.SizeBytes, input.AltAr, input.AltEn, input.SourceSurface, actorID)
	if err != nil {
		return AssetUploadIntent{}, err
	}
	asset, err := scanAsset(db.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
	if err != nil {
		return AssetUploadIntent{}, err
	}
	uploadURL, expiresAt, err := mediaClient.PresignPut(ctx, objectKey, assetUploadIntentTTL)
	if err != nil {
		return AssetUploadIntent{}, err
	}
	return AssetUploadIntent{Asset: asset, UploadURL: uploadURL, ExpiresAt: expiresAt}, nil
}

// CompleteAssetUpload verifies the declared object actually landed in MinIO
// (StatObject) before moving the asset from draft into the review queue.
// Nothing may be linked to a client-visible surface (see LinkAsset) until an
// asset has passed both this and ReviewAsset.
func CompleteAssetUpload(ctx context.Context, db *sql.DB, mediaClient *media.Client, id string) (CatalogAsset, error) {
	if mediaClient == nil {
		return CatalogAsset{}, fmt.Errorf("%w: media storage is not configured", ErrInvalid)
	}
	asset, err := scanAsset(db.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
	if err != nil {
		return CatalogAsset{}, err
	}
	if asset.Status != "draft" {
		return CatalogAsset{}, fmt.Errorf("%w: asset is %s, expected draft", ErrInvalid, asset.Status)
	}
	size, contentType, err := mediaClient.StatObject(ctx, asset.ObjectKey)
	if err != nil {
		return CatalogAsset{}, fmt.Errorf("%w: uploaded object not found in storage: %v", ErrInvalid, err)
	}
	if size <= 0 || size > maxAssetUploadSizeBytes || !strings.HasPrefix(contentType, "image/") {
		return CatalogAsset{}, fmt.Errorf("%w: uploaded object does not match declared file", ErrInvalid)
	}
	checksum, err := mediaClient.ChecksumSHA256(ctx, asset.ObjectKey)
	if err != nil {
		return CatalogAsset{}, err
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
		status='uploaded', size_bytes=$1, mime_type=$2, checksum_sha256=$3, updated_at=now()
		WHERE id=$4 AND status='draft'`,
		size, contentType, checksum, id)
	if err != nil {
		return CatalogAsset{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return CatalogAsset{}, ErrNotFound
	}
	return scanAsset(db.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
}

func ListAssets(ctx context.Context, db *sql.DB, status string, limit, offset int) ([]CatalogAsset, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.QueryContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets
		WHERE ($1='' OR status=$1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CatalogAsset{}
	for rows.Next() {
		a, err := scanAsset(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

type AssetUpdateInput struct {
	PublicURL      *string `json:"publicUrl"`
	Width          *int    `json:"width"`
	Height         *int    `json:"height"`
	SizeBytes      *int64  `json:"sizeBytes"`
	ChecksumSHA256 *string `json:"checksumSha256"`
	AltAr          *string `json:"altAr"`
	AltEn          *string `json:"altEn"`
	DominantColor  *string `json:"dominantColor"`
}

// UpdateAsset lets an uploader complete metadata after the binary lands in
// object storage; moves draft -> uploaded so it enters the review queue.
func UpdateAsset(ctx context.Context, db *sql.DB, id string, input AssetUpdateInput) (CatalogAsset, error) {
	result, err := db.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
		public_url=COALESCE($1, public_url), width=COALESCE($2, width), height=COALESCE($3, height),
		size_bytes=COALESCE($4, size_bytes), checksum_sha256=COALESCE($5, checksum_sha256),
		alt_ar=COALESCE($6, alt_ar), alt_en=COALESCE($7, alt_en), dominant_color=COALESCE($8, dominant_color),
		status=CASE WHEN status='draft' THEN 'uploaded' ELSE status END, updated_at=now()
		WHERE id=$9`,
		input.PublicURL, input.Width, input.Height, input.SizeBytes, input.ChecksumSHA256, input.AltAr, input.AltEn,
		input.DominantColor, id)
	if err != nil {
		return CatalogAsset{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return CatalogAsset{}, ErrNotFound
	}
	return scanAsset(db.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
}

type AssetReviewInput struct {
	Decision   string `json:"decision"` // approved | rejected | pending_review | archived
	ReviewNote string `json:"reviewNote"`
}

// ReviewAsset is the only sanctioned way an asset moves into approved (and
// therefore becomes eligible to satisfy a requires_product_image /
// requires_category_image platform policy gate).
// storeImageRoleColumn maps a store-image DAM role to the transitional
// dsh_stores cache column it's read through until every consumer (see
// Phase 5 of the media centralization closure plan) reads the DAM link
// directly instead. logo/cover use the legacy *_url column names because
// that's what pre-DAM store rows already used; storefront/interior/signage
// use the *_photo_ref columns dsh-016 added.
var storeImageRoleColumn = map[string]string{
	"store_logo":       "logo_url",
	"store_cover":      "hero_image_url",
	"storefront_photo": "storefront_photo_ref",
	"interior_photo":   "interior_photo_ref",
	"signage_photo":    "signage_photo_ref",
}

// syncApprovedStoreImageLinks writes the just-approved asset's public media
// path into whichever dsh_stores cache column its store-scoped links map to,
// for every link that just became approved. A single asset can be linked to
// at most one store per role (unique constraint), but nothing stops the same
// asset being linked as e.g. both store_logo and store_cover, so this walks
// all of the asset's approved store links rather than assuming one.
func syncApprovedStoreImageLinks(ctx context.Context, tx *sql.Tx, assetID string) error {
	rows, err := tx.QueryContext(ctx, `SELECT entity_id, role FROM dsh_catalog_asset_links
		WHERE asset_id=$1 AND entity_type='store' AND status='approved'`, assetID)
	if err != nil {
		return err
	}
	defer rows.Close()
	type storeLink struct{ storeID, role string }
	var links []storeLink
	for rows.Next() {
		var l storeLink
		if err := rows.Scan(&l.storeID, &l.role); err != nil {
			return err
		}
		links = append(links, l)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	publicPath := publicMediaPath(assetID)
	for _, l := range links {
		column, ok := storeImageRoleColumn[l.role]
		if !ok {
			continue
		}
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_stores SET `+column+`=$1 WHERE id=$2`, publicPath, l.storeID); err != nil {
			return err
		}
	}
	return nil
}

func ReviewAsset(ctx context.Context, db *sql.DB, actorID, id string, input AssetReviewInput) (CatalogAsset, error) {
	if !validAssetStatus[input.Decision] {
		return CatalogAsset{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CatalogAsset{}, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
		status=$1, reviewed_by=$2, review_note=$3, updated_at=now() WHERE id=$4`,
		input.Decision, actorID, input.ReviewNote, id)
	if err != nil {
		return CatalogAsset{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return CatalogAsset{}, ErrNotFound
	}
	if input.Decision == "approved" {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_asset_links SET
			status='approved', updated_at=now() WHERE asset_id=$1 AND status='pending_review'`, id); err != nil {
			return CatalogAsset{}, err
		}
		if err := syncApprovedStoreImageLinks(ctx, tx, id); err != nil {
			return CatalogAsset{}, err
		}
	}
	asset, err := scanAsset(tx.QueryRowContext(ctx, `SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
	if err != nil {
		return CatalogAsset{}, err
	}
	if err := tx.Commit(); err != nil {
		return CatalogAsset{}, err
	}
	return asset, nil
}

type CatalogAssetLink struct {
	ID         string    `json:"id"`
	AssetID    string    `json:"assetId"`
	EntityType string    `json:"entityType"`
	EntityID   string    `json:"entityId"`
	Role       string    `json:"role"`
	SortOrder  int       `json:"sortOrder"`
	IsPrimary  bool      `json:"isPrimary"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

const assetLinkColumns = `id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status, created_at, updated_at`

// CatalogAssetLinkWithAsset is what client-facing surfaces need to actually
// render an image: the bare link plus the asset's object key and a public
// URL path (relative -- callers prefix it with their own API base URL),
// alt text, and mime type. Internal/operator surfaces that only manage
// links use CatalogAssetLink directly.
type CatalogAssetLinkWithAsset struct {
	CatalogAssetLink
	ObjectKey string `json:"objectKey"`
	PublicURL string `json:"publicUrl"`
	AltAr     string `json:"altAr"`
	AltEn     string `json:"altEn"`
	MimeType  string `json:"mimeType"`
}

func publicMediaPath(assetID string) string {
	return "/dsh/public/media/" + assetID + "/original"
}

func scanAssetLinkWithAsset(scanner interface{ Scan(...any) error }) (CatalogAssetLinkWithAsset, error) {
	var l CatalogAssetLinkWithAsset
	err := scanner.Scan(&l.ID, &l.AssetID, &l.EntityType, &l.EntityID, &l.Role, &l.SortOrder, &l.IsPrimary,
		&l.Status, &l.CreatedAt, &l.UpdatedAt, &l.ObjectKey, &l.AltAr, &l.AltEn, &l.MimeType)
	if errors.Is(err, sql.ErrNoRows) {
		return l, ErrNotFound
	}
	if err != nil {
		return l, err
	}
	l.PublicURL = publicMediaPath(l.AssetID)
	return l, nil
}

func scanAssetLink(scanner interface{ Scan(...any) error }) (CatalogAssetLink, error) {
	var l CatalogAssetLink
	err := scanner.Scan(&l.ID, &l.AssetID, &l.EntityType, &l.EntityID, &l.Role, &l.SortOrder, &l.IsPrimary,
		&l.Status, &l.CreatedAt, &l.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return l, ErrNotFound
	}
	return l, err
}

type AssetLinkInput struct {
	AssetID    string `json:"assetId"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	Role       string `json:"role"`
	SortOrder  int    `json:"sortOrder"`
	IsPrimary  bool   `json:"isPrimary"`
}

// dbtx is satisfied by both *sql.DB and *sql.Tx, letting callers that need
// atomicity (e.g. putEntityImage) run LinkAsset inside their own transaction.
type dbtx interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// LinkAsset attaches an asset to an entity in a role. A rejected/archived
// asset can never be linked, and a link to a not-yet-approved asset starts
// pending_review so it cannot leak onto a client-visible surface early.
func LinkAsset(ctx context.Context, db dbtx, input AssetLinkInput) (CatalogAssetLink, error) {
	if strings.TrimSpace(input.AssetID) == "" || !validAssetEntityType[input.EntityType] ||
		strings.TrimSpace(input.EntityID) == "" || !validAssetRole[input.Role] {
		return CatalogAssetLink{}, ErrInvalid
	}
	var assetStatus string
	if err := db.QueryRowContext(ctx, `SELECT status FROM dsh_catalog_assets WHERE id=$1`, input.AssetID).Scan(&assetStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CatalogAssetLink{}, ErrNotFound
		}
		return CatalogAssetLink{}, err
	}
	if assetStatus == "rejected" || assetStatus == "archived" {
		return CatalogAssetLink{}, fmt.Errorf("%w: asset is %s and cannot be linked", ErrForbidden, assetStatus)
	}
	id := entityID("asset-link")
	linkStatus := "pending_review"
	if assetStatus == "approved" {
		linkStatus = "approved"
	}
	_, err := db.ExecContext(ctx, `INSERT INTO dsh_catalog_asset_links
		(id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (entity_type, entity_id, role, asset_id) DO UPDATE SET
		  sort_order=EXCLUDED.sort_order, is_primary=EXCLUDED.is_primary, status=EXCLUDED.status, updated_at=now()`,
		id, input.AssetID, input.EntityType, input.EntityID, input.Role, input.SortOrder, input.IsPrimary, linkStatus)
	if err != nil {
		return CatalogAssetLink{}, err
	}
	return scanAssetLink(db.QueryRowContext(ctx, `SELECT `+assetLinkColumns+`
		FROM dsh_catalog_asset_links WHERE entity_type=$1 AND entity_id=$2 AND role=$3 AND asset_id=$4`,
		input.EntityType, input.EntityID, input.Role, input.AssetID))
}

func ListAssetLinks(ctx context.Context, db *sql.DB, entityType, entityID string) ([]CatalogAssetLink, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+assetLinkColumns+` FROM dsh_catalog_asset_links
		WHERE entity_type=$1 AND entity_id=$2 ORDER BY role, sort_order`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CatalogAssetLink{}
	for rows.Next() {
		l, err := scanAssetLink(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func UnlinkAsset(ctx context.Context, db *sql.DB, entityType, entityID, linkID string) error {
	result, err := db.ExecContext(ctx, `DELETE FROM dsh_catalog_asset_links WHERE id=$1 AND entity_type=$2 AND entity_id=$3`, linkID, entityType, entityID)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return ErrNotFound
	}
	return nil
}

// ── Seed status (dsh-032 diagnostics) ───────────────────────────────────────

type SeedStatus struct {
	DomainsCount        int      `json:"domainsCount"`
	NodesCount          int      `json:"nodesCount"`
	MasterProductsCount int      `json:"masterProductsCount"`
	AssortmentsCount    int      `json:"assortmentsCount"`
	ManualRequestExists bool     `json:"manualRequestExists"`
	ShayInExists        bool     `json:"shayInExists"`
	AwnakExists         bool     `json:"awnakExists"`
	SeedVersion         string   `json:"seedVersion"`
	MissingSeeds        []string `json:"missingSeeds"`
}

// GetSeedStatus lets the control panel show a banner instead of a silently
// empty taxonomy when a fresh environment hasn't had the central catalog
// seed applied yet.
func GetSeedStatus(ctx context.Context, db *sql.DB) (SeedStatus, error) {
	var s SeedStatus
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_catalog_domains`).Scan(&s.DomainsCount); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_catalog_nodes`).Scan(&s.NodesCount); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_master_products WHERE approval_status='approved' AND is_active=true`).Scan(&s.MasterProductsCount); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_store_assortments WHERE publication_status='client_visible' AND available=true`).Scan(&s.AssortmentsCount); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_domains WHERE id='domain-manual-request')`).Scan(&s.ManualRequestExists); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_nodes WHERE id='node-shay-in')`).Scan(&s.ShayInExists); err != nil {
		return SeedStatus{}, err
	}
	if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_catalog_nodes WHERE id='node-awnak')`).Scan(&s.AwnakExists); err != nil {
		return SeedStatus{}, err
	}
	s.SeedVersion = "dsh-036"
	s.MissingSeeds = []string{}
	if s.DomainsCount < 12 {
		s.MissingSeeds = append(s.MissingSeeds, "domains")
	}
	if !s.ManualRequestExists {
		s.MissingSeeds = append(s.MissingSeeds, "domain-manual-request")
	}
	if !s.ShayInExists {
		s.MissingSeeds = append(s.MissingSeeds, "node-shay-in")
	}
	if !s.AwnakExists {
		s.MissingSeeds = append(s.MissingSeeds, "node-awnak")
	}
	if s.MasterProductsCount < 6 {
		s.MissingSeeds = append(s.MissingSeeds, "master-products")
	}
	if s.AssortmentsCount < 6 {
		s.MissingSeeds = append(s.MissingSeeds, "store-assortments")
	}
	return s, nil
}
