package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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

func WithdrawProposalAtomic(ctx context.Context, db *sql.DB, id, actorID string, expectedVersion *int) (ProductProposal, error) {
	if err := validateExpectedVersion(expectedVersion); err != nil {
		return ProductProposal{}, err
	}

	row := db.QueryRowContext(ctx, `UPDATE dsh_product_proposals SET
		status='withdrawn', updated_at=now(), version=version+1
		WHERE id=$1 AND source_actor_id=$2 AND status IN ('partner-proposed', 'needs-fix', 'catalog-draft') AND version=$3
		RETURNING `+proposalColumns,
		id, actorID, *expectedVersion)
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
	if current.Status != "partner-proposed" && current.Status != "needs-fix" && current.Status != "catalog-draft" {
		return ProductProposal{}, fmt.Errorf("%w: can only withdraw proposals in pending statuses", ErrInvalid)
	}
	return ProductProposal{}, &ConflictError{
		EntityID: id, ExpectedVersion: expectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
	}
}

func GetStoreAssortmentByKey(ctx context.Context, db *sql.DB, storeID, masterProductID string) (StoreAssortment, error) {
	return scanAssortment(db.QueryRowContext(ctx, `SELECT `+assortmentColumns+`
		FROM dsh_store_assortments WHERE store_id=$1 AND master_product_id=$2`, storeID, masterProductID))
}

// UpsertStoreAssortmentAtomic is the compatibility/OCC entry point used by the
// existing operator, partner and field handlers. The implementation is
// intentionally delegated to the sole runtime-truth writer so OCC semantics,
// normalized price/inventory bootstrap, publication gating and metadata
// updates cannot drift into a second source of truth.
func UpsertStoreAssortmentAtomic(ctx context.Context, db *sql.DB, storeID, masterProductID, actorID string, input StoreAssortmentInput, allowCustomImage bool) (StoreAssortment, error) {
	return UpsertStoreAssortmentWithRuntimeTruth(
		ctx,
		db,
		storeID,
		masterProductID,
		actorID,
		input,
		allowCustomImage,
	)
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
