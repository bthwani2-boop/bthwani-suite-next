package centralcatalog

import (
	"context"
	"database/sql"
)

// UpsertAssortmentInventoryWithRuntimeTruthAtomic is the authoritative
// inventory mutation path. The normalized inventory row is the sole source of
// truth; no assortment metadata projection is maintained.
func UpsertAssortmentInventoryWithRuntimeTruthAtomic(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	masterProductID string,
	actorID string,
	input StoreAssortmentInventoryInput,
) (StoreAssortmentInventory, error) {
	_ = actorID
	if !validPolicyType[input.PolicyType] {
		return StoreAssortmentInventory{}, ErrInvalid
	}
	if input.Quantity < 0 || input.MinOrderQuantity < 1 || input.StepQuantity < 1 || input.MaxOrderQuantity < input.MinOrderQuantity {
		return StoreAssortmentInventory{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return StoreAssortmentInventory{}, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"dsh-assortment:"+storeID+":"+masterProductID,
	); err != nil {
		return StoreAssortmentInventory{}, err
	}

	var assortmentID string
	err = tx.QueryRowContext(ctx, `
		SELECT id
		FROM dsh_store_assortments
		WHERE store_id=$1 AND master_product_id=$2
		FOR UPDATE`, storeID, masterProductID).Scan(&assortmentID)
	if err == sql.ErrNoRows {
		return StoreAssortmentInventory{}, ErrNotFound
	}
	if err != nil {
		return StoreAssortmentInventory{}, err
	}

	var inv StoreAssortmentInventory
	if input.ExpectedVersion > 0 {
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_store_assortment_inventory
			SET policy_type=$1,
			    quantity=$2,
			    min_order_quantity=$3,
			    max_order_quantity=$4,
			    step_quantity=$5,
			    version=version+1,
			    updated_at=NOW()
			WHERE store_assortment_id=$6 AND version=$7
			RETURNING store_assortment_id, policy_type, quantity, reserved_quantity,
			          min_order_quantity, max_order_quantity, step_quantity, version, updated_at`,
			input.PolicyType,
			input.Quantity,
			input.MinOrderQuantity,
			input.MaxOrderQuantity,
			input.StepQuantity,
			assortmentID,
			input.ExpectedVersion,
		).Scan(
			&inv.StoreAssortmentID,
			&inv.PolicyType,
			&inv.Quantity,
			&inv.ReservedQuantity,
			&inv.MinOrderQuantity,
			&inv.MaxOrderQuantity,
			&inv.StepQuantity,
			&inv.Version,
			&inv.UpdatedAt,
		)
		if err == sql.ErrNoRows {
			return StoreAssortmentInventory{}, ErrConflict
		}
	} else {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_store_assortment_inventory (
				store_assortment_id, policy_type, quantity,
				min_order_quantity, max_order_quantity, step_quantity, version
			) VALUES ($1,$2,$3,$4,$5,$6,1)
			ON CONFLICT (store_assortment_id) DO UPDATE SET
				policy_type=EXCLUDED.policy_type,
				quantity=EXCLUDED.quantity,
				min_order_quantity=EXCLUDED.min_order_quantity,
				max_order_quantity=EXCLUDED.max_order_quantity,
				step_quantity=EXCLUDED.step_quantity,
				version=dsh_store_assortment_inventory.version+1,
				updated_at=NOW()
			RETURNING store_assortment_id, policy_type, quantity, reserved_quantity,
			          min_order_quantity, max_order_quantity, step_quantity, version, updated_at`,
			assortmentID,
			input.PolicyType,
			input.Quantity,
			input.MinOrderQuantity,
			input.MaxOrderQuantity,
			input.StepQuantity,
		).Scan(
			&inv.StoreAssortmentID,
			&inv.PolicyType,
			&inv.Quantity,
			&inv.ReservedQuantity,
			&inv.MinOrderQuantity,
			&inv.MaxOrderQuantity,
			&inv.StepQuantity,
			&inv.Version,
			&inv.UpdatedAt,
		)
	}
	if err != nil {
		return StoreAssortmentInventory{}, err
	}

	if err := tx.Commit(); err != nil {
		return StoreAssortmentInventory{}, err
	}
	return inv, nil
}
