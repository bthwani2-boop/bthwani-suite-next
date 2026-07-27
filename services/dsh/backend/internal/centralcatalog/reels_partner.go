package centralcatalog

import (
	"context"
	"database/sql"
)

// ListPartnerReels returns only submissions owned by the authenticated partner
// actor and the selected store. It never exposes another partner's moderation
// queue or reviewer identity beyond the canonical Reel projection.
func ListPartnerReels(
	ctx context.Context,
	db *sql.DB,
	actorID string,
	storeID string,
	limit int,
	offset int,
) ([]Reel, error) {
	if actorID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := db.QueryContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels
		WHERE submitted_by=$1 AND source_store_id=$2
		ORDER BY created_at DESC, id ASC LIMIT $3 OFFSET $4`,
		actorID, storeID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Reel{}
	for rows.Next() {
		item, err := scanReel(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
