package centralcatalog

import (
	"context"
	"database/sql"
)

func GetReel(ctx context.Context, db *sql.DB, reelID string) (Reel, error) {
	if reelID == "" {
		return Reel{}, ErrInvalid
	}
	return scanReel(db.QueryRowContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels WHERE id=$1`, reelID))
}

func ReelMediaAssetID(reel Reel, kind string) (string, error) {
	switch kind {
	case "video":
		if reel.AssetID == "" {
			return "", ErrNotFound
		}
		return reel.AssetID, nil
	case "poster":
		if reel.PosterAssetID == nil || *reel.PosterAssetID == "" {
			return "", ErrNotFound
		}
		return *reel.PosterAssetID, nil
	default:
		return "", ErrInvalid
	}
}
