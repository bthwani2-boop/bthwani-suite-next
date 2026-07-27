package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

const (
	maxReelTitleLength     = 160
	maxReelSubtitleLength  = 500
	maxReelHighlightLength = 280
	maxReelCTALabelLength  = 80
)

type Reel struct {
	ID              string    `json:"id"`
	AssetID         string    `json:"assetId"`
	PosterAssetID   *string   `json:"posterAssetId,omitempty"`
	TitleAr         string    `json:"titleAr"`
	TitleEn         string    `json:"titleEn"`
	SubtitleAr      string    `json:"subtitleAr"`
	SubtitleEn      string    `json:"subtitleEn"`
	HighlightAr     string    `json:"highlightAr"`
	HighlightEn     string    `json:"highlightEn"`
	CTALabelAr      string    `json:"ctaLabelAr"`
	CTALabelEn      string    `json:"ctaLabelEn"`
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
	ID          string `json:"id"`
	TitleAr     string `json:"titleAr"`
	TitleEn     string `json:"titleEn"`
	SubtitleAr  string `json:"subtitleAr,omitempty"`
	SubtitleEn  string `json:"subtitleEn,omitempty"`
	HighlightAr string `json:"highlightAr,omitempty"`
	HighlightEn string `json:"highlightEn,omitempty"`
	CTALabelAr  string `json:"ctaLabelAr,omitempty"`
	CTALabelEn  string `json:"ctaLabelEn,omitempty"`
	VideoURL    string `json:"videoUrl"`
	PosterURL   string `json:"posterUrl,omitempty"`
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId"`
	SortOrder   int    `json:"sortOrder"`
}

type CreateReelSubmissionInput struct {
	AssetID       string  `json:"assetId"`
	PosterAssetID *string `json:"posterAssetId"`
	TitleAr       string  `json:"titleAr"`
	TitleEn       string  `json:"titleEn"`
	SubtitleAr    string  `json:"subtitleAr"`
	SubtitleEn    string  `json:"subtitleEn"`
	HighlightAr   string  `json:"highlightAr"`
	HighlightEn   string  `json:"highlightEn"`
	CTALabelAr    string  `json:"ctaLabelAr"`
	CTALabelEn    string  `json:"ctaLabelEn"`
	TargetType    string  `json:"targetType"`
	TargetID      string  `json:"targetId"`
	SortOrder     int     `json:"sortOrder"`
	SourceStoreID *string `json:"sourceStoreId"`
}

type ReviewReelInput struct {
	Decision      string  `json:"decision"`
	ReviewNote    string  `json:"reviewNote"`
	PosterAssetID *string `json:"posterAssetId"`
	TitleAr       *string `json:"titleAr"`
	TitleEn       *string `json:"titleEn"`
	SubtitleAr    *string `json:"subtitleAr"`
	SubtitleEn    *string `json:"subtitleEn"`
	HighlightAr   *string `json:"highlightAr"`
	HighlightEn   *string `json:"highlightEn"`
	CTALabelAr    *string `json:"ctaLabelAr"`
	CTALabelEn    *string `json:"ctaLabelEn"`
	TargetType    *string `json:"targetType"`
	TargetID      *string `json:"targetId"`
	SortOrder     *int    `json:"sortOrder"`
}

const reelColumns = `id, asset_id, poster_asset_id, title_ar, title_en, subtitle_ar, subtitle_en,
	highlight_ar, highlight_en, cta_label_ar, cta_label_en, target_type, target_id, status, sort_order,
	submitted_by, submitted_by_role, source_store_id, reviewed_by, review_note, created_at, updated_at`

func scanReel(scanner interface{ Scan(...any) error }) (Reel, error) {
	var r Reel
	err := scanner.Scan(
		&r.ID,
		&r.AssetID,
		&r.PosterAssetID,
		&r.TitleAr,
		&r.TitleEn,
		&r.SubtitleAr,
		&r.SubtitleEn,
		&r.HighlightAr,
		&r.HighlightEn,
		&r.CTALabelAr,
		&r.CTALabelEn,
		&r.TargetType,
		&r.TargetID,
		&r.Status,
		&r.SortOrder,
		&r.SubmittedBy,
		&r.SubmittedByRole,
		&r.SourceStoreID,
		&r.ReviewedBy,
		&r.ReviewNote,
		&r.CreatedAt,
		&r.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

type reelAssetQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func normalizeOptionalID(value *string) *string {
	if value == nil {
		return nil
	}
	normalized := strings.TrimSpace(*value)
	if normalized == "" {
		return nil
	}
	return &normalized
}

func normalizeReelCopy(input *CreateReelSubmissionInput) error {
	input.AssetID = strings.TrimSpace(input.AssetID)
	input.TitleAr = strings.TrimSpace(input.TitleAr)
	input.TitleEn = strings.TrimSpace(input.TitleEn)
	input.SubtitleAr = strings.TrimSpace(input.SubtitleAr)
	input.SubtitleEn = strings.TrimSpace(input.SubtitleEn)
	input.HighlightAr = strings.TrimSpace(input.HighlightAr)
	input.HighlightEn = strings.TrimSpace(input.HighlightEn)
	input.CTALabelAr = strings.TrimSpace(input.CTALabelAr)
	input.CTALabelEn = strings.TrimSpace(input.CTALabelEn)
	input.TargetType = strings.TrimSpace(input.TargetType)
	input.TargetID = strings.TrimSpace(input.TargetID)
	input.PosterAssetID = normalizeOptionalID(input.PosterAssetID)
	if input.SourceStoreID != nil {
		input.SourceStoreID = normalizeOptionalID(input.SourceStoreID)
	}
	return validateReelCopy(
		input.TitleAr,
		input.TitleEn,
		input.SubtitleAr,
		input.SubtitleEn,
		input.HighlightAr,
		input.HighlightEn,
		input.CTALabelAr,
		input.CTALabelEn,
	)
}

func validateReelCopy(titleAr, titleEn, subtitleAr, subtitleEn, highlightAr, highlightEn, ctaAr, ctaEn string) error {
	if len([]rune(titleAr)) > maxReelTitleLength || len([]rune(titleEn)) > maxReelTitleLength {
		return ErrInvalid
	}
	if len([]rune(subtitleAr)) > maxReelSubtitleLength || len([]rune(subtitleEn)) > maxReelSubtitleLength {
		return ErrInvalid
	}
	if len([]rune(highlightAr)) > maxReelHighlightLength || len([]rune(highlightEn)) > maxReelHighlightLength {
		return ErrInvalid
	}
	if len([]rune(ctaAr)) > maxReelCTALabelLength || len([]rune(ctaEn)) > maxReelCTALabelLength {
		return ErrInvalid
	}
	return nil
}

func validateReelPosterAsset(ctx context.Context, db reelAssetQuerier, actorID, actorRole string, posterAssetID *string) error {
	if posterAssetID == nil {
		return nil
	}
	var mimeType, status, uploadedBy string
	if err := db.QueryRowContext(ctx, `SELECT mime_type, status, uploaded_by FROM dsh_catalog_assets WHERE id=$1`, *posterAssetID).
		Scan(&mimeType, &status, &uploadedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if !strings.HasPrefix(mimeType, "image/") || (status != "uploaded" && status != "approved") {
		return ErrInvalid
	}
	if actorRole != "operator" && uploadedBy != actorID {
		return ErrForbidden
	}
	return nil
}

func CreateReelSubmission(ctx context.Context, db *sql.DB, actorID, actorRole string, input CreateReelSubmissionInput) (Reel, error) {
	if err := normalizeReelCopy(&input); err != nil {
		return Reel{}, err
	}
	if input.AssetID == "" || !validReelTarget(input.TargetType) || input.TargetID == "" {
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
	if err := validateReelPosterAsset(ctx, db, actorID, actorRole, input.PosterAssetID); err != nil {
		return Reel{}, err
	}
	if err := assertReelTargetExists(ctx, db, input.TargetType, input.TargetID); err != nil {
		return Reel{}, err
	}
	id := entityID("reel")
	_, err = db.ExecContext(ctx, `INSERT INTO dsh_reels
		(id, asset_id, poster_asset_id, title_ar, title_en, subtitle_ar, subtitle_en, highlight_ar, highlight_en,
		 cta_label_ar, cta_label_en, target_type, target_id, sort_order, submitted_by, submitted_by_role, source_store_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		id,
		input.AssetID,
		input.PosterAssetID,
		input.TitleAr,
		input.TitleEn,
		input.SubtitleAr,
		input.SubtitleEn,
		input.HighlightAr,
		input.HighlightEn,
		input.CTALabelAr,
		input.CTALabelEn,
		input.TargetType,
		input.TargetID,
		input.SortOrder,
		actorID,
		actorRole,
		input.SourceStoreID,
	)
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

	posterAssetID := reel.PosterAssetID
	if input.PosterAssetID != nil {
		posterAssetID = normalizeOptionalID(input.PosterAssetID)
	}
	titleAr := reel.TitleAr
	if input.TitleAr != nil {
		titleAr = strings.TrimSpace(*input.TitleAr)
	}
	titleEn := reel.TitleEn
	if input.TitleEn != nil {
		titleEn = strings.TrimSpace(*input.TitleEn)
	}
	subtitleAr := reel.SubtitleAr
	if input.SubtitleAr != nil {
		subtitleAr = strings.TrimSpace(*input.SubtitleAr)
	}
	subtitleEn := reel.SubtitleEn
	if input.SubtitleEn != nil {
		subtitleEn = strings.TrimSpace(*input.SubtitleEn)
	}
	highlightAr := reel.HighlightAr
	if input.HighlightAr != nil {
		highlightAr = strings.TrimSpace(*input.HighlightAr)
	}
	highlightEn := reel.HighlightEn
	if input.HighlightEn != nil {
		highlightEn = strings.TrimSpace(*input.HighlightEn)
	}
	ctaLabelAr := reel.CTALabelAr
	if input.CTALabelAr != nil {
		ctaLabelAr = strings.TrimSpace(*input.CTALabelAr)
	}
	ctaLabelEn := reel.CTALabelEn
	if input.CTALabelEn != nil {
		ctaLabelEn = strings.TrimSpace(*input.CTALabelEn)
	}
	if err := validateReelCopy(titleAr, titleEn, subtitleAr, subtitleEn, highlightAr, highlightEn, ctaLabelAr, ctaLabelEn); err != nil {
		return Reel{}, err
	}
	if err := validateReelPosterAsset(ctx, tx, reviewerID, "operator", posterAssetID); err != nil {
		return Reel{}, err
	}

	targetType := reel.TargetType
	if input.TargetType != nil {
		targetType = strings.TrimSpace(*input.TargetType)
	}
	targetID := reel.TargetID
	if input.TargetID != nil {
		targetID = strings.TrimSpace(*input.TargetID)
	}
	if !validReelTarget(targetType) || targetID == "" {
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
		if posterAssetID != nil {
			result, err = tx.ExecContext(ctx, `UPDATE dsh_catalog_assets SET
				status='approved', reviewed_by=$1, review_note=$2, updated_at=now()
				WHERE id=$3 AND status IN ('uploaded','approved') AND mime_type LIKE 'image/%'`,
				reviewerID, input.ReviewNote, *posterAssetID)
			if err != nil {
				return Reel{}, err
			}
			if n, _ := result.RowsAffected(); n != 1 {
				return Reel{}, ErrConflict
			}
		}
	}

	result, err := tx.ExecContext(ctx, `UPDATE dsh_reels SET
		status=$1, poster_asset_id=$2, title_ar=$3, title_en=$4, subtitle_ar=$5, subtitle_en=$6,
		highlight_ar=$7, highlight_en=$8, cta_label_ar=$9, cta_label_en=$10,
		target_type=$11, target_id=$12, sort_order=$13, reviewed_by=$14, review_note=$15, updated_at=now()
		WHERE id=$16 AND status=$17`,
		input.Decision,
		posterAssetID,
		titleAr,
		titleEn,
		subtitleAr,
		subtitleEn,
		highlightAr,
		highlightEn,
		ctaLabelAr,
		ctaLabelEn,
		targetType,
		targetID,
		sortOrder,
		reviewerID,
		strings.TrimSpace(input.ReviewNote),
		reelID,
		reel.Status,
	)
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
	rows, err := db.QueryContext(ctx, `SELECT
		r.id, r.title_ar, r.title_en, r.subtitle_ar, r.subtitle_en, r.highlight_ar, r.highlight_en,
		r.cta_label_ar, r.cta_label_en, r.asset_id, COALESCE(pa.id,''), r.target_type, r.target_id, r.sort_order
		FROM dsh_reels r
		JOIN dsh_catalog_assets a ON a.id = r.asset_id
		LEFT JOIN dsh_catalog_assets pa
		  ON pa.id = r.poster_asset_id AND pa.status='approved' AND pa.mime_type LIKE 'image/%'
		WHERE r.status='approved' AND a.status='approved' AND a.mime_type='video/mp4'
		ORDER BY r.sort_order, r.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicReel{}
	for rows.Next() {
		var videoAssetID, posterAssetID string
		var reel PublicReel
		if err := rows.Scan(
			&reel.ID,
			&reel.TitleAr,
			&reel.TitleEn,
			&reel.SubtitleAr,
			&reel.SubtitleEn,
			&reel.HighlightAr,
			&reel.HighlightEn,
			&reel.CTALabelAr,
			&reel.CTALabelEn,
			&videoAssetID,
			&posterAssetID,
			&reel.TargetType,
			&reel.TargetID,
			&reel.SortOrder,
		); err != nil {
			return nil, err
		}
		reel.VideoURL = publicMediaPath(videoAssetID)
		if posterAssetID != "" {
			reel.PosterURL = publicMediaPath(posterAssetID)
		}
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
