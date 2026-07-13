package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

type Reel struct {
	ID              string    `json:"id"`
	AssetID         string    `json:"assetId"`
	TitleAr         string    `json:"titleAr"`
	TitleEn         string    `json:"titleEn"`
	TargetType      string    `json:"targetType"`
	TargetID        string    `json:"targetId"`
	Status          string    `json:"status"`
	SortOrder       int       `json:"sortOrder"`
	SubmittedBy     string    `json:"submittedBy"`
	SubmittedByRole string    `json:"submittedByRole"`
	SourceStoreID   *string   `json:"sourceStoreId"`
	ReviewedBy      *string   `json:"reviewedBy"`
	ReviewNote      string    `json:"reviewNote"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type PublicReel struct {
	ID         string `json:"id"`
	TitleAr    string `json:"titleAr"`
	TitleEn    string `json:"titleEn"`
	VideoURL   string `json:"videoUrl"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	SortOrder  int    `json:"sortOrder"`
}

type CreateReelSubmissionInput struct {
	AssetID       string  `json:"assetId"`
	TitleAr       string  `json:"titleAr"`
	TitleEn       string  `json:"titleEn"`
	TargetType    string  `json:"targetType"`
	TargetID      string  `json:"targetId"`
	SortOrder     int     `json:"sortOrder"`
	SourceStoreID *string `json:"sourceStoreId"`
}

type ReviewReelInput struct {
	Decision   string  `json:"decision"`
	ReviewNote string  `json:"reviewNote"`
	TargetType *string `json:"targetType"`
	TargetID   *string `json:"targetId"`
	SortOrder  *int    `json:"sortOrder"`
}

const reelColumns = `id, asset_id, title_ar, title_en, target_type, target_id, status, sort_order,
	submitted_by, submitted_by_role, source_store_id, reviewed_by, review_note, created_at, updated_at`

func scanReel(scanner interface{ Scan(...any) error }) (Reel, error) {
	var r Reel
	err := scanner.Scan(&r.ID, &r.AssetID, &r.TitleAr, &r.TitleEn, &r.TargetType, &r.TargetID, &r.Status,
		&r.SortOrder, &r.SubmittedBy, &r.SubmittedByRole, &r.SourceStoreID, &r.ReviewedBy, &r.ReviewNote,
		&r.CreatedAt, &r.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

func CreateReelSubmission(ctx context.Context, db *sql.DB, actorID, actorRole string, input CreateReelSubmissionInput) (Reel, error) {
	if strings.TrimSpace(input.AssetID) == "" || !validReelTarget(input.TargetType) || strings.TrimSpace(input.TargetID) == "" {
		return Reel{}, ErrInvalid
	}
	asset, err := GetAsset(ctx, db, input.AssetID)
	if err != nil {
		return Reel{}, err
	}
	if asset.MimeType != "video/mp4" || asset.Status != "uploaded" {
		return Reel{}, ErrInvalid
	}
	if actorRole != "operator" && asset.UploadedBy != actorID {
		return Reel{}, ErrForbidden
	}
	if err := assertReelTargetExists(ctx, db, input.TargetType, input.TargetID); err != nil {
		return Reel{}, err
	}
	id := entityID("reel")
	_, err = db.ExecContext(ctx, `INSERT INTO dsh_reels
		(id, asset_id, title_ar, title_en, target_type, target_id, sort_order, submitted_by, submitted_by_role, source_store_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, input.AssetID, input.TitleAr, input.TitleEn, input.TargetType, input.TargetID, input.SortOrder,
		actorID, actorRole, input.SourceStoreID)
	if err != nil {
		return Reel{}, err
	}
	return scanReel(db.QueryRowContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels WHERE id=$1`, id))
}

func ReviewReel(ctx context.Context, db *sql.DB, reviewerID, reelID string, input ReviewReelInput) (Reel, error) {
	if input.Decision != "approved" && input.Decision != "rejected" && input.Decision != "archived" {
		return Reel{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Reel{}, err
	}
	defer tx.Rollback()

	reel, err := scanReel(tx.QueryRowContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels WHERE id=$1 FOR UPDATE`, reelID))
	if err != nil {
		return Reel{}, err
	}
	if !validReelTransition(reel.Status, input.Decision) {
		return Reel{}, ErrConflict
	}
	targetType := reel.TargetType
	targetID := reel.TargetID
	if input.TargetType != nil {
		targetType = *input.TargetType
	}
	if input.TargetID != nil {
		targetID = *input.TargetID
	}
	if !validReelTarget(targetType) || strings.TrimSpace(targetID) == "" {
		return Reel{}, ErrInvalid
	}
	if err := assertReelTargetExists(ctx, tx, targetType, targetID); err != nil {
		return Reel{}, err
	}
	sortOrder := reel.SortOrder
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}

	if input.Decision == "approved" {
		result, err := tx.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
			status='approved', reviewed_by=$1, review_note=$2, updated_at=now()
			WHERE id=$3 AND status='uploaded' AND mime_type='video/mp4'`,
			reviewerID, input.ReviewNote, reel.AssetID)
		if err != nil {
			return Reel{}, err
		}
		if n, _ := result.RowsAffected(); n != 1 {
			return Reel{}, ErrConflict
		}
	}
	result, err := tx.ExecContext(ctx, `UPDATE dsh_reels SET
		status=$1, target_type=$2, target_id=$3, sort_order=$4, reviewed_by=$5, review_note=$6, updated_at=now()
		WHERE id=$7 AND status=$8`,
		input.Decision, targetType, targetID, sortOrder, reviewerID, input.ReviewNote, reelID, reel.Status)
	if err != nil {
		return Reel{}, err
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return Reel{}, ErrConflict
	}
	updated, err := scanReel(tx.QueryRowContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels WHERE id=$1`, reelID))
	if err != nil {
		return Reel{}, err
	}
	if err := tx.Commit(); err != nil {
		return Reel{}, err
	}
	return updated, nil
}

func ListReels(ctx context.Context, db *sql.DB, status string, limit, offset int) ([]Reel, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.QueryContext(ctx, `SELECT `+reelColumns+` FROM dsh_reels
		WHERE ($1='' OR status=$1) ORDER BY status, sort_order, created_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Reel{}
	for rows.Next() {
		reel, err := scanReel(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, reel)
	}
	return out, rows.Err()
}

func ListApprovedReels(ctx context.Context, db *sql.DB, limit int) ([]PublicReel, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := db.QueryContext(ctx, `SELECT r.id, r.title_ar, r.title_en, r.asset_id, r.target_type, r.target_id, r.sort_order
		FROM dsh_reels r
		JOIN dsh_catalog_assets a ON a.id = r.asset_id
		WHERE r.status='approved' AND a.status='approved'
		ORDER BY r.sort_order, r.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicReel{}
	for rows.Next() {
		var assetID string
		var reel PublicReel
		if err := rows.Scan(&reel.ID, &reel.TitleAr, &reel.TitleEn, &assetID, &reel.TargetType, &reel.TargetID, &reel.SortOrder); err != nil {
			return nil, err
		}
		reel.VideoURL = publicMediaPath(assetID)
		out = append(out, reel)
	}
	return out, rows.Err()
}

func validReelTarget(targetType string) bool {
	return targetType == "master_product" || targetType == "store" || targetType == "offer"
}

func validReelTransition(from, to string) bool {
	switch from {
	case "pending_review":
		return to == "approved" || to == "rejected"
	case "approved":
		return to == "archived"
	default:
		return false
	}
}

func assertReelTargetExists(ctx context.Context, db dbtx, targetType, targetID string) error {
	switch targetType {
	case "master_product":
		return assertEntityExists(ctx, db, "master_product", targetID)
	case "store":
		return assertEntityExists(ctx, db, "store", targetID)
	case "offer":
		var exists bool
		if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_partner_offers WHERE id::text=$1)`, targetID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return ErrNotFound
		}
		return nil
	default:
		return ErrInvalid
	}
}
