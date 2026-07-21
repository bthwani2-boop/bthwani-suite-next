package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// AssortmentPauseState is intentionally separate from StoreAssortment so the
// existing sellable-assortment contract remains backward compatible while
// every surface can still read the temporary operational pause truth.
type AssortmentPauseState struct {
	AssortmentID   string     `json:"assortmentId"`
	StoreID        string     `json:"storeId"`
	MasterProductID string    `json:"masterProductId"`
	Paused         bool       `json:"paused"`
	Reason         string     `json:"reason"`
	PausedUntil    *time.Time `json:"pausedUntil"`
	PausedAt       *time.Time `json:"pausedAt"`
	PausedBy       *string    `json:"pausedBy"`
	Version        int        `json:"version"`
}

func scanAssortmentPauseState(scanner interface{ Scan(...any) error }) (AssortmentPauseState, error) {
	var item AssortmentPauseState
	err := scanner.Scan(&item.AssortmentID, &item.StoreID, &item.MasterProductID, &item.Paused,
		&item.Reason, &item.PausedUntil, &item.PausedAt, &item.PausedBy, &item.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return item, ErrNotFound
	}
	return item, err
}

const assortmentPauseColumns = `id, store_id, master_product_id, paused_at IS NOT NULL,
	pause_reason, paused_until, paused_at, paused_by, version`

func GetAssortmentPauseState(ctx context.Context, db *sql.DB, storeID, productID string) (AssortmentPauseState, error) {
	return scanAssortmentPauseState(db.QueryRowContext(ctx, `SELECT `+assortmentPauseColumns+`
		FROM dsh_store_assortments WHERE store_id=$1 AND master_product_id=$2`, storeID, productID))
}

func ListAssortmentPauseStates(ctx context.Context, db *sql.DB, storeID string) ([]AssortmentPauseState, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+assortmentPauseColumns+`
		FROM dsh_store_assortments WHERE store_id=$1 ORDER BY updated_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AssortmentPauseState{}
	for rows.Next() {
		item, err := scanAssortmentPauseState(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
