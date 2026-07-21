package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

func validateExpectedVersion(expected *int) error {
	if expected == nil || *expected < 1 {
		return fmt.Errorf("%w: expectedVersion must be a positive integer", ErrInvalid)
	}
	return nil
}

func normalizedOptionalRequiredText(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, ErrInvalid
	}
	return &trimmed, nil
}

// UpdateDomainAtomic performs the version comparison and the mutation in one
// SQL statement. A stale writer can therefore never overwrite a newer value.
func UpdateDomainAtomic(ctx context.Context, db *sql.DB, id string, input DomainPatchInput) (Domain, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return Domain{}, err
	}
	nameAr, err := normalizedOptionalRequiredText(input.NameAr)
	if err != nil {
		return Domain{}, err
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_catalog_domains SET
		name_ar=COALESCE($1, name_ar), name_en=COALESCE($2, name_en), icon=COALESCE($3, icon),
		sort_order=COALESCE($4, sort_order), is_active=COALESCE($5, is_active),
		is_client_visible=COALESCE($6, is_client_visible),
		requires_product_catalog=COALESCE($7, requires_product_catalog),
		is_manual_request=COALESCE($8, is_manual_request), updated_at=now(), version=version+1
		WHERE id=$9 AND version=$10
		RETURNING `+domainColumns,
		nameAr, input.NameEn, input.Icon, input.SortOrder, input.IsActive,
		input.IsClientVisible, input.RequiresProductCatalog, input.IsManualRequest, id, *input.ExpectedVersion)
	domain, err := scanDomain(row)
	if errors.Is(err, ErrNotFound) {
		return Domain{}, NewConflictError(db, ctx, "dsh_catalog_domains", id, input.ExpectedVersion)
	}
	return domain, err
}

// UpdateNodeAtomic is the sovereign taxonomy-node mutation path.
func UpdateNodeAtomic(ctx context.Context, db *sql.DB, id string, input NodePatchInput) (Node, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return Node{}, err
	}
	nameAr, err := normalizedOptionalRequiredText(input.NameAr)
	if err != nil {
		return Node{}, err
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_catalog_nodes SET
		name_ar=COALESCE($1, name_ar), name_en=COALESCE($2, name_en), icon=COALESCE($3, icon),
		sort_order=COALESCE($4, sort_order), is_active=COALESCE($5, is_active),
		is_client_visible=COALESCE($6, is_client_visible), requires_barcode=COALESCE($7, requires_barcode),
		allows_product_proposal=COALESCE($8, allows_product_proposal),
		allows_store_product_custom_image=COALESCE($9, allows_store_product_custom_image),
		requires_catalog_review=COALESCE($10, requires_catalog_review),
		requires_product_catalog=COALESCE($11, requires_product_catalog), updated_at=now(), version=version+1
		WHERE id=$12 AND version=$13
		RETURNING `+nodeColumns,
		nameAr, input.NameEn, input.Icon, input.SortOrder, input.IsActive,
		input.IsClientVisible, input.RequiresBarcode, input.AllowsProductProposal,
		input.AllowsStoreProductCustomImage, input.RequiresCatalogReview, input.RequiresProductCatalog,
		id, *input.ExpectedVersion)
	node, err := scanNode(row)
	if errors.Is(err, ErrNotFound) {
		return Node{}, NewConflictError(db, ctx, "dsh_catalog_nodes", id, input.ExpectedVersion)
	}
	return node, err
}

// UpdateMasterProductAtomic couples OCC with the image-before-approval invariant.
func UpdateMasterProductAtomic(ctx context.Context, db *sql.DB, id string, input MasterProductPatchInput) (MasterProduct, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return MasterProduct{}, err
	}
	canonicalNameAr, err := normalizedOptionalRequiredText(input.CanonicalNameAr)
	if err != nil {
		return MasterProduct{}, err
	}
	if input.ApprovalStatus != nil && !validApprovalStatus[*input.ApprovalStatus] {
		return MasterProduct{}, ErrInvalid
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_master_products SET
		category_node_id=COALESCE($1, category_node_id), canonical_name_ar=COALESCE($2, canonical_name_ar),
		canonical_name_en=COALESCE($3, canonical_name_en), brand=COALESCE($4, brand),
		barcode=COALESCE($5, barcode), gtin=COALESCE($6, gtin), sku=COALESCE($7, sku),
		unit=COALESCE(NULLIF($8::text,''), unit), measurement_type=COALESCE(NULLIF($9::text,''), measurement_type),
		approval_status=COALESCE($10, approval_status), is_active=COALESCE($11, is_active),
		updated_at=now(), version=version+1
		WHERE id=$12 AND version=$13
		  AND (COALESCE($10::text, approval_status) <> 'approved'
		       OR NULLIF(canonical_image_object_key,'') IS NOT NULL)
		RETURNING `+masterProductColumns,
		input.CategoryNodeID, canonicalNameAr, input.CanonicalNameEn, input.Brand,
		input.Barcode, input.GTIN, input.SKU, input.Unit, input.MeasurementType,
		input.ApprovalStatus, input.IsActive, id, *input.ExpectedVersion)
	product, err := scanMasterProduct(row)
	if !errors.Is(err, ErrNotFound) {
		return product, err
	}

	current, getErr := GetMasterProduct(ctx, db, id)
	if getErr != nil {
		return MasterProduct{}, getErr
	}
	if current.Version != *input.ExpectedVersion {
		return MasterProduct{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
		}
	}
	newStatus := current.ApprovalStatus
	if input.ApprovalStatus != nil {
		newStatus = *input.ApprovalStatus
	}
	if newStatus == "approved" && (current.CanonicalImageObjectKey == nil || strings.TrimSpace(*current.CanonicalImageObjectKey) == "") {
		return MasterProduct{}, fmt.Errorf("%w: cannot approve product without canonical image", ErrInvalid)
	}
	return MasterProduct{}, NewConflictError(db, ctx, "dsh_master_products", id, input.ExpectedVersion)
}

// CatalogPolicyPatchInput extends the historical policy payload with the
// version and effective-time fields already sent by the shared frontend.
type CatalogPolicyPatchInput struct {
	CatalogPolicyInput
	ExpectedVersion *int       `json:"expectedVersion"`
	EffectiveFrom   *time.Time `json:"effectiveFrom"`
}

// UpdateCatalogPolicyAtomic prevents policy lost-updates and returns the exact
// committed row from the same SQL statement.
func UpdateCatalogPolicyAtomic(ctx context.Context, db *sql.DB, id string, input CatalogPolicyPatchInput) (CatalogPolicy, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return CatalogPolicy{}, err
	}
	if input.PlatformCommissionRate != nil && (*input.PlatformCommissionRate < 0 || *input.PlatformCommissionRate > 1) {
		return CatalogPolicy{}, ErrInvalid
	}
	if input.FieldPartnerOnboardingCommissionAmount != nil && *input.FieldPartnerOnboardingCommissionAmount < 0 {
		return CatalogPolicy{}, ErrInvalid
	}
	if input.StoreOnboardingFeeAmount != nil && *input.StoreOnboardingFeeAmount < 0 {
		return CatalogPolicy{}, ErrInvalid
	}
	if input.ProductDataQualityMinimumScore != nil && (*input.ProductDataQualityMinimumScore < 0 || *input.ProductDataQualityMinimumScore > 1) {
		return CatalogPolicy{}, ErrInvalid
	}
	if input.MaxGalleryImages != nil && *input.MaxGalleryImages < 0 {
		return CatalogPolicy{}, ErrInvalid
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_catalog_platform_policies SET
		platform_commission_rate=COALESCE($1, platform_commission_rate),
		field_partner_onboarding_commission_amount=COALESCE($2, field_partner_onboarding_commission_amount),
		field_partner_onboarding_commission_currency=COALESCE($3, field_partner_onboarding_commission_currency),
		store_onboarding_fee_amount=COALESCE($4, store_onboarding_fee_amount),
		store_onboarding_fee_currency=COALESCE($5, store_onboarding_fee_currency),
		allows_store_product_custom_image=COALESCE($6, allows_store_product_custom_image),
		allows_product_proposal=COALESCE($7, allows_product_proposal),
		requires_barcode=COALESCE($8, requires_barcode),
		requires_catalog_review=COALESCE($9, requires_catalog_review),
		requires_marketing_review=COALESCE($10, requires_marketing_review),
		requires_product_image=COALESCE($11, requires_product_image),
		requires_category_image=COALESCE($12, requires_category_image),
		requires_description=COALESCE($13, requires_description),
		requires_brand=COALESCE($14, requires_brand),
		requires_unit=COALESCE($15, requires_unit),
		product_data_quality_minimum_score=COALESCE($16, product_data_quality_minimum_score),
		max_gallery_images=COALESCE($17, max_gallery_images),
		manual_request_mode=COALESCE($18, manual_request_mode),
		is_active=COALESCE($19, is_active),
		effective_from=COALESCE($20, effective_from), notes=COALESCE($21, notes),
		updated_at=now(), version=version+1
		WHERE id=$22 AND version=$23
		RETURNING `+policyColumns,
		input.PlatformCommissionRate, input.FieldPartnerOnboardingCommissionAmount,
		input.FieldPartnerOnboardingCommissionCurrency, input.StoreOnboardingFeeAmount,
		input.StoreOnboardingFeeCurrency, input.AllowsStoreProductCustomImage, input.AllowsProductProposal,
		input.RequiresBarcode, input.RequiresCatalogReview, input.RequiresMarketingReview, input.RequiresProductImage,
		input.RequiresCategoryImage, input.RequiresDescription, input.RequiresBrand, input.RequiresUnit,
		input.ProductDataQualityMinimumScore, input.MaxGalleryImages, input.ManualRequestMode,
		input.IsActive, input.EffectiveFrom, input.Notes, id, *input.ExpectedVersion)
	policy, err := scanPolicy(row)
	if errors.Is(err, ErrNotFound) {
		return CatalogPolicy{}, NewConflictError(db, ctx, "dsh_catalog_platform_policies", id, input.ExpectedVersion)
	}
	return policy, err
}
