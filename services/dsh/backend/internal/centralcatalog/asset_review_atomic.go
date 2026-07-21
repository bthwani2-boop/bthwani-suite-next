package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
)

// ReviewAssetAtomicExpected locks the asset row before comparing its revision.
// The status transition, linked-asset projection updates, and returned row are
// committed together, so a stale reviewer cannot approve or reject newer data.
func ReviewAssetAtomicExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, id string,
	input AssetReviewInput,
) (CatalogAsset, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return CatalogAsset{}, err
	}
	if !validAssetStatus[input.Decision] {
		return CatalogAsset{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CatalogAsset{}, err
	}
	defer tx.Rollback()

	var currentStatus string
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT status, version
		FROM dsh_catalog_assets WHERE id=$1 FOR UPDATE`, id).Scan(&currentStatus, &currentVersion); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CatalogAsset{}, ErrNotFound
		}
		return CatalogAsset{}, err
	}
	if currentVersion != *input.ExpectedVersion {
		return CatalogAsset{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: currentVersion, Message: "version mismatch",
		}
	}
	if !assetReviewTransitions[currentStatus][input.Decision] {
		return CatalogAsset{}, ErrConflict
	}

	result, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
		status=$1, reviewed_by=$2, review_note=$3, updated_at=now(), version=version+1
		WHERE id=$4 AND status=$5 AND version=$6`,
		input.Decision, actorID, input.ReviewNote, id, currentStatus, currentVersion)
	if err != nil {
		return CatalogAsset{}, err
	}
	if affected, affectedErr := result.RowsAffected(); affectedErr != nil {
		return CatalogAsset{}, affectedErr
	} else if affected != 1 {
		return CatalogAsset{}, NewConflictError(tx, ctx, "dsh_catalog_assets", id, input.ExpectedVersion)
	}

	if input.Decision == "approved" {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_asset_links SET
			status='approved', updated_at=now(), version=version+1
			WHERE asset_id=$1 AND status='pending_review'`, id); err != nil {
			return CatalogAsset{}, err
		}
		if err := syncStoreImageProjectionsForAsset(ctx, tx, id); err != nil {
			return CatalogAsset{}, err
		}
		if err := syncProductImageProjectionsForAsset(ctx, tx, id); err != nil {
			return CatalogAsset{}, err
		}
	} else if input.Decision == "rejected" || input.Decision == "archived" {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_asset_links SET
			status=$1, is_primary=false, updated_at=now(), version=version+1
			WHERE asset_id=$2 AND status <> 'archived'`, input.Decision, id); err != nil {
			return CatalogAsset{}, err
		}
		if err := syncStoreImageProjectionsForAsset(ctx, tx, id); err != nil {
			return CatalogAsset{}, err
		}
		if err := syncProductImageProjectionsForAsset(ctx, tx, id); err != nil {
			return CatalogAsset{}, err
		}
	}

	asset, err := scanAsset(tx.QueryRowContext(ctx,
		`SELECT `+assetColumns+` FROM dsh_catalog_assets WHERE id=$1`, id))
	if err != nil {
		return CatalogAsset{}, err
	}
	if err := tx.Commit(); err != nil {
		return CatalogAsset{}, err
	}
	return asset, nil
}
