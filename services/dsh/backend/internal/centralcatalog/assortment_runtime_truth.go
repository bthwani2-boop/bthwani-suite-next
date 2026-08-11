package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
)

type assortmentRuntimeTruthQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type assortmentRuntimeTruth struct {
	AmountMinor      int64
	Currency         string
	PolicyType       string
	Quantity         int
	ReservedQuantity int
	MinOrderQuantity int
	MaxOrderQuantity int
	StepQuantity     int
}

func readAssortmentRuntimeTruth(ctx context.Context, q assortmentRuntimeTruthQuerier, assortmentID string) (assortmentRuntimeTruth, error) {
	var out assortmentRuntimeTruth
	err := q.QueryRowContext(ctx, `
		SELECT p.amount_minor, p.currency,
		       i.policy_type, i.quantity, i.reserved_quantity,
		       i.min_order_quantity, i.max_order_quantity, i.step_quantity
		FROM dsh_store_assortment_inventory i
		JOIN LATERAL (
			SELECT amount_minor, currency
			FROM dsh_store_assortment_prices
			WHERE store_assortment_id = i.store_assortment_id
			  AND effective_from <= NOW()
			  AND (effective_until IS NULL OR effective_until > NOW())
			ORDER BY effective_from DESC, version DESC, id DESC
			LIMIT 1
		) p ON TRUE
		WHERE i.store_assortment_id = $1`, assortmentID).Scan(
		&out.AmountMinor,
		&out.Currency,
		&out.PolicyType,
		&out.Quantity,
		&out.ReservedQuantity,
		&out.MinOrderQuantity,
		&out.MaxOrderQuantity,
		&out.StepQuantity,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return assortmentRuntimeTruth{}, ErrNotFound
	}
	return out, err
}

func assortmentTruthPurchasable(truth assortmentRuntimeTruth) bool {
	if truth.AmountMinor <= 0 || len(strings.TrimSpace(truth.Currency)) != 3 {
		return false
	}
	switch truth.PolicyType {
	case "infinite":
		return true
	case "signal":
		return truth.Quantity > 0
	case "quantity":
		available := truth.Quantity - truth.ReservedQuantity
		minimum := truth.MinOrderQuantity
		if minimum < 1 {
			minimum = 1
		}
		return available >= minimum && truth.MaxOrderQuantity >= minimum && truth.StepQuantity >= 1
	default:
		return false
	}
}

func assortmentTruthStockStatus(truth assortmentRuntimeTruth) string {
	if !assortmentTruthPurchasable(truth) {
		return "out_of_stock"
	}
	if truth.PolicyType == "infinite" {
		return "in_stock"
	}
	available := truth.Quantity
	if truth.PolicyType == "quantity" {
		available = truth.Quantity - truth.ReservedQuantity
	}
	if available <= 5 {
		return "low_stock"
	}
	return "in_stock"
}

func projectAssortmentRuntimeTruth(a StoreAssortment, truth assortmentRuntimeTruth) StoreAssortment {
	a.UnitPrice = float64(truth.AmountMinor) / 100
	a.Currency = truth.Currency
	a.Available = assortmentTruthPurchasable(truth)
	a.StockStatus = assortmentTruthStockStatus(truth)
	return a
}

// ListStoreAssortmentRuntimeTruth keeps operator/partner/field reads on the
// same effective price and inventory authority used by cart. The legacy
// unit_price/currency/available/stock_status columns remain compatibility
// bootstrap projections only; they are never returned as current commercial
// truth once normalized price/inventory exists.
func ListStoreAssortmentRuntimeTruth(ctx context.Context, db *sql.DB, storeID string) ([]StoreAssortment, error) {
	items, err := ListStoreAssortment(ctx, db, storeID)
	if err != nil {
		return nil, err
	}
	for index := range items {
		truth, truthErr := readAssortmentRuntimeTruth(ctx, db, items[index].ID)
		if errors.Is(truthErr, ErrNotFound) {
			items[index].Available = false
			items[index].StockStatus = "out_of_stock"
			continue
		}
		if truthErr != nil {
			return nil, truthErr
		}
		items[index] = projectAssortmentRuntimeTruth(items[index], truth)
	}
	return items, nil
}

// FilterPurchasableClientCatalogEntries is the final storefront gate. A
// client-visible legacy assortment is not sufficient: the product must have
// an effective positive normalized price and an inventory policy that can
// satisfy at least its minimum purchase. The price projected to the client is
// therefore exactly the price cart will snapshot.
func FilterPurchasableClientCatalogEntries(ctx context.Context, db *sql.DB, entries []ClientCatalogEntry) ([]ClientCatalogEntry, error) {
	out := make([]ClientCatalogEntry, 0, len(entries))
	for _, entry := range entries {
		truth, err := readAssortmentRuntimeTruth(ctx, db, entry.assortmentID)
		if errors.Is(err, ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		if !assortmentTruthPurchasable(truth) {
			continue
		}
		entry.UnitPrice = float64(truth.AmountMinor) / 100
		entry.Currency = truth.Currency
		out = append(out, entry)
	}
	return out, nil
}

func bootstrapAssortmentRuntimeTruth(ctx context.Context, tx *sql.Tx, a StoreAssortment) error {
	quantity := 0
	if a.Available {
		switch a.StockStatus {
		case "in_stock":
			quantity = 100
		case "low_stock":
			quantity = 5
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_assortment_inventory (
			store_assortment_id, policy_type, quantity, reserved_quantity,
			min_order_quantity, max_order_quantity, step_quantity
		) VALUES ($1, 'signal', $2, 0, 1, 100, 1)
		ON CONFLICT (store_assortment_id) DO NOTHING`, a.ID, quantity); err != nil {
		return err
	}

	var priceCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_store_assortment_prices
		WHERE store_assortment_id = $1`, a.ID).Scan(&priceCount); err != nil {
		return err
	}
	if priceCount == 0 && a.UnitPrice > 0 {
		amountMinor := int64(math.Round(a.UnitPrice * 100))
		if amountMinor <= 0 || amountMinor > math.MaxInt32 {
			return ErrInvalid
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_store_assortment_prices (
				id, store_assortment_id, amount_minor, currency,
				prep_time_min, prep_time_max, effective_from, effective_until
			) VALUES ($1, $2, $3, $4, 15, 30, NOW(), NULL)`,
			entityID("price-bootstrap"), a.ID, amountMinor, a.Currency); err != nil {
			return err
		}
	}
	return nil
}

func validateAssortmentImageForClientVisibility(ctx context.Context, tx *sql.Tx, masterProductID string, customImageObjectKey *string) error {
	var masterImage *string
	if err := tx.QueryRowContext(ctx, `SELECT canonical_image_object_key FROM dsh_master_products WHERE id=$1`, masterProductID).Scan(&masterImage); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	hasCustomImage := customImageObjectKey != nil && strings.TrimSpace(*customImageObjectKey) != ""
	hasMasterImage := masterImage != nil && strings.TrimSpace(*masterImage) != ""
	if !hasCustomImage && !hasMasterImage {
		return fmt.Errorf("%w: cannot set publication_status to client_visible without an approved image", ErrInvalid)
	}
	return nil
}

// UpsertStoreAssortmentWithRuntimeTruth is the sole authoritative assortment
// metadata writer. Creation is allowed only when expectedVersion is omitted;
// edits require the exact current expectedVersion. A transaction-scoped
// advisory lock serializes both absent-row creation and existing-row updates
// for the same store/product key, then the row is locked before an edit.
// Normalized price/inventory bootstrap happens inside the same transaction.
// Once normalized commercial truth exists, price, currency, availability and
// stock status are projections of that truth and cannot be overwritten by a
// stale metadata payload. Dedicated inventory/price endpoints own subsequent
// commercial changes.
func UpsertStoreAssortmentWithRuntimeTruth(ctx context.Context, db *sql.DB, storeID, masterProductID, actorID string, input StoreAssortmentInput, allowCustomImage bool) (StoreAssortment, error) {
	storeID = strings.TrimSpace(storeID)
	masterProductID = strings.TrimSpace(masterProductID)
	if storeID == "" || masterProductID == "" || input.UnitPrice < 0 {
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
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = "YER"
	}
	if len(currency) != 3 {
		return StoreAssortment{}, ErrInvalid
	}
	if input.CustomImageObjectKey != nil && strings.TrimSpace(*input.CustomImageObjectKey) != "" && !allowCustomImage {
		return StoreAssortment{}, ErrForbidden
	}
	if input.ExpectedVersion != nil && *input.ExpectedVersion < 1 {
		return StoreAssortment{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return StoreAssortment{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"dsh-assortment:"+storeID+":"+masterProductID,
	); err != nil {
		return StoreAssortment{}, err
	}

	var existing StoreAssortment
	existing, existingErr := scanAssortment(tx.QueryRowContext(ctx, `
		SELECT `+assortmentColumns+`
		FROM dsh_store_assortments
		WHERE store_id=$1 AND master_product_id=$2
		FOR UPDATE`, storeID, masterProductID))
	exists := existingErr == nil
	if existingErr != nil && !errors.Is(existingErr, ErrNotFound) {
		return StoreAssortment{}, existingErr
	}

	if exists && input.ExpectedVersion == nil {
		return StoreAssortment{}, &ConflictError{
			EntityID: existing.ID, ExpectedVersion: nil, CurrentVersion: existing.Version,
			Message: "assortment already exists; expectedVersion is required",
		}
	}
	if !exists && input.ExpectedVersion != nil {
		return StoreAssortment{}, ErrNotFound
	}
	if exists && existing.Version != *input.ExpectedVersion {
		return StoreAssortment{}, &ConflictError{
			EntityID: existing.ID, ExpectedVersion: input.ExpectedVersion, CurrentVersion: existing.Version,
			Message: "version mismatch",
		}
	}

	if publicationStatus == "client_visible" {
		if err := validateAssortmentImageForClientVisibility(ctx, tx, masterProductID, input.CustomImageObjectKey); err != nil {
			return StoreAssortment{}, err
		}
	}

	var a StoreAssortment
	if !exists {
		id := entityID("assortment")
		row := tx.QueryRowContext(ctx, `
			INSERT INTO dsh_store_assortments (
				id, store_id, master_product_id, unit_price, currency, available,
				stock_status, local_note, custom_image_object_key, publication_status, submitted_by
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			RETURNING `+assortmentColumns,
			id, storeID, masterProductID, input.UnitPrice, currency, input.Available,
			stockStatus, input.LocalNote, input.CustomImageObjectKey, publicationStatus, actorID)
		created, insertErr := scanAssortment(row)
		if insertErr != nil {
			return StoreAssortment{}, insertErr
		}
		a = created
	} else {
		legacyUnitPrice := input.UnitPrice
		legacyCurrency := currency
		legacyAvailable := input.Available
		legacyStockStatus := stockStatus

		// Preserve every normalized commercial field once the normalized records
		// exist. Metadata writes may change notes/images/publication, but only the
		// dedicated price/inventory endpoints may change commercial truth.
		truth, truthErr := readAssortmentRuntimeTruth(ctx, tx, existing.ID)
		if truthErr == nil {
			legacyUnitPrice = float64(truth.AmountMinor) / 100
			legacyCurrency = truth.Currency
			legacyAvailable = assortmentTruthPurchasable(truth)
			legacyStockStatus = assortmentTruthStockStatus(truth)
		} else if !errors.Is(truthErr, ErrNotFound) {
			return StoreAssortment{}, truthErr
		}

		row := tx.QueryRowContext(ctx, `
			UPDATE dsh_store_assortments SET
				unit_price=$1,
				currency=$2,
				available=$3,
				stock_status=$4,
				local_note=$5,
				custom_image_object_key=$6,
				publication_status=$7,
				submitted_by=$8,
				updated_at=NOW(),
				version=version+1
			WHERE id=$9 AND version=$10
			RETURNING `+assortmentColumns,
			legacyUnitPrice, legacyCurrency, legacyAvailable, legacyStockStatus, input.LocalNote,
			input.CustomImageObjectKey, publicationStatus, actorID, existing.ID, *input.ExpectedVersion)
		updated, updateErr := scanAssortment(row)
		if errors.Is(updateErr, ErrNotFound) {
			return StoreAssortment{}, NewConflictError(tx, ctx, "dsh_store_assortments", existing.ID, input.ExpectedVersion)
		}
		if updateErr != nil {
			return StoreAssortment{}, updateErr
		}
		a = updated
	}

	if err := bootstrapAssortmentRuntimeTruth(ctx, tx, a); err != nil {
		return StoreAssortment{}, err
	}
	truth, truthErr := readAssortmentRuntimeTruth(ctx, tx, a.ID)
	if publicationStatus == "client_visible" && input.Available {
		if truthErr != nil || !assortmentTruthPurchasable(truth) {
			return StoreAssortment{}, fmt.Errorf("%w: client_visible assortment requires an effective price and purchasable inventory", ErrInvalid)
		}
	}
	if truthErr == nil {
		a = projectAssortmentRuntimeTruth(a, truth)
	} else if !errors.Is(truthErr, ErrNotFound) {
		return StoreAssortment{}, truthErr
	}

	if err := tx.Commit(); err != nil {
		return StoreAssortment{}, err
	}
	return a, nil
}
