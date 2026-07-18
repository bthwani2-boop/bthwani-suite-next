package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// ProductProposalPatchOCCInput requires the caller to prove which proposal
// revision it edited. This closes the lost-update gap in partner/field
// resubmission after a needs-fix decision.
type ProductProposalPatchOCCInput struct {
	ProductProposalPatchInput
	ExpectedVersion *int `json:"expectedVersion"`
}

func UpdateProposalAtomic(ctx context.Context, db *sql.DB, id, actorID string, input ProductProposalPatchOCCInput) (ProductProposal, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return ProductProposal{}, err
	}
	proposedNameAr, err := normalizedOptionalRequiredText(input.ProposedNameAr)
	if err != nil {
		return ProductProposal{}, err
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_product_proposals SET
		proposed_name_ar=COALESCE($1, proposed_name_ar), proposed_name_en=COALESCE($2, proposed_name_en),
		brand=COALESCE($3, brand), barcode=COALESCE($4, barcode), image_object_key=COALESCE($5, image_object_key),
		status='partner-proposed', review_stage='partner-proposed', blocked_reason=NULL,
		resubmission_count=resubmission_count+1, updated_at=now(), version=version+1
		WHERE id=$6 AND source_actor_id=$7 AND status='needs-fix' AND version=$8
		RETURNING `+proposalColumns,
		proposedNameAr, input.ProposedNameEn, input.Brand, input.Barcode, input.ImageObjectKey,
		id, actorID, *input.ExpectedVersion)
	proposal, err := scanProposal(row)
	if !errors.Is(err, ErrNotFound) {
		return proposal, err
	}

	current, currentErr := GetProposal(ctx, db, id)
	if currentErr != nil {
		return ProductProposal{}, currentErr
	}
	if current.SourceActorID != actorID {
		return ProductProposal{}, ErrForbidden
	}
	if current.Status != "needs-fix" {
		return ProductProposal{}, fmt.Errorf("%w: can only edit proposals in needs-fix status", ErrInvalid)
	}
	return ProductProposal{}, &ConflictError{
		EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
	}
}

func GetStoreAssortmentByKey(ctx context.Context, db *sql.DB, storeID, masterProductID string) (StoreAssortment, error) {
	return scanAssortment(db.QueryRowContext(ctx, `SELECT `+assortmentColumns+`
		FROM dsh_store_assortments WHERE store_id=$1 AND master_product_id=$2`, storeID, masterProductID))
}

// UpsertStoreAssortmentAtomic is create-only when expectedVersion is omitted,
// and update-only when it is supplied. An existing row can never be overwritten
// by a caller that did not read its current version first.
func UpsertStoreAssortmentAtomic(ctx context.Context, db *sql.DB, storeID, masterProductID, actorID string, input StoreAssortmentInput, allowCustomImage bool) (StoreAssortment, error) {
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
	currency := strings.TrimSpace(input.Currency)
	if currency == "" {
		currency = "YER"
	}
	if input.CustomImageObjectKey != nil && strings.TrimSpace(*input.CustomImageObjectKey) != "" && !allowCustomImage {
		return StoreAssortment{}, ErrForbidden
	}
	if publicationStatus == "client_visible" {
		var masterImage *string
		if err := db.QueryRowContext(ctx, `SELECT canonical_image_object_key FROM dsh_master_products WHERE id=$1`, masterProductID).Scan(&masterImage); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return StoreAssortment{}, ErrNotFound
			}
			return StoreAssortment{}, err
		}
		hasCustomImage := input.CustomImageObjectKey != nil && strings.TrimSpace(*input.CustomImageObjectKey) != ""
		hasMasterImage := masterImage != nil && strings.TrimSpace(*masterImage) != ""
		if !hasCustomImage && !hasMasterImage {
			return StoreAssortment{}, fmt.Errorf("%w: cannot publish assortment without an approved image", ErrInvalid)
		}
	}

	if input.ExpectedVersion == nil {
		id := entityID("assortment")
		row := db.QueryRowContext(ctx, `INSERT INTO dsh_store_assortments
			(id, store_id, master_product_id, unit_price, currency, available, stock_status, local_note,
			 custom_image_object_key, publication_status, submitted_by)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			ON CONFLICT (store_id, master_product_id) DO NOTHING
			RETURNING `+assortmentColumns,
			id, storeID, masterProductID, input.UnitPrice, currency, input.Available, stockStatus,
			input.LocalNote, input.CustomImageObjectKey, publicationStatus, actorID)
		created, err := scanAssortment(row)
		if !errors.Is(err, ErrNotFound) {
			return created, err
		}
		current, currentErr := GetStoreAssortmentByKey(ctx, db, storeID, masterProductID)
		if currentErr != nil {
			return StoreAssortment{}, currentErr
		}
		return StoreAssortment{}, &ConflictError{
			EntityID: current.ID, ExpectedVersion: nil, CurrentVersion: current.Version,
			Message: "assortment already exists; expectedVersion is required",
		}
	}
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return StoreAssortment{}, err
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_store_assortments SET
		unit_price=$1, currency=$2, available=$3, stock_status=$4, local_note=$5,
		custom_image_object_key=$6, publication_status=$7, submitted_by=$8,
		updated_at=now(), version=version+1
		WHERE store_id=$9 AND master_product_id=$10 AND version=$11
		RETURNING `+assortmentColumns,
		input.UnitPrice, currency, input.Available, stockStatus, input.LocalNote,
		input.CustomImageObjectKey, publicationStatus, actorID, storeID, masterProductID, *input.ExpectedVersion)
	updated, err := scanAssortment(row)
	if !errors.Is(err, ErrNotFound) {
		return updated, err
	}
	current, currentErr := GetStoreAssortmentByKey(ctx, db, storeID, masterProductID)
	if currentErr != nil {
		return StoreAssortment{}, currentErr
	}
	return StoreAssortment{}, &ConflictError{
		EntityID: current.ID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
	}
}

// AssetUpdateOCCInput prevents two catalog operators from silently replacing
// each other's accessibility/display metadata.
type AssetUpdateOCCInput struct {
	AssetUpdateInput
	ExpectedVersion *int `json:"expectedVersion"`
}

func UpdateAssetAtomic(ctx context.Context, db *sql.DB, id string, input AssetUpdateOCCInput) (CatalogAsset, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return CatalogAsset{}, err
	}
	row := db.QueryRowContext(ctx, `UPDATE dsh_catalog_assets SET
		alt_ar=COALESCE($1, alt_ar), alt_en=COALESCE($2, alt_en), dominant_color=COALESCE($3, dominant_color),
		updated_at=now(), version=version+1
		WHERE id=$4 AND version=$5
		RETURNING `+assetColumns,
		input.AltAr, input.AltEn, input.DominantColor, id, *input.ExpectedVersion)
	asset, err := scanAsset(row)
	if errors.Is(err, ErrNotFound) {
		return CatalogAsset{}, NewConflictError(db, ctx, "dsh_catalog_assets", id, input.ExpectedVersion)
	}
	return asset, err
}

// ReviewAssetExpected validates the caller's revision before the existing
// row-locked review transaction. The transaction itself still serializes the
// state transition and projection updates.
func ReviewAssetExpected(ctx context.Context, db *sql.DB, actorID, id string, input AssetReviewInput) (CatalogAsset, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return CatalogAsset{}, err
	}
	current, err := GetAsset(ctx, db, id)
	if err != nil {
		return CatalogAsset{}, err
	}
	if current.Version != *input.ExpectedVersion {
		return CatalogAsset{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
		}
	}
	return ReviewAsset(ctx, db, actorID, id, input)
}
