package marketing

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound            = errors.New("not found")
	ErrInvalid             = errors.New("invalid input")
	ErrInvalidTransition   = errors.New("invalid status transition")
)

// ── Campaigns ────────────────────────────────────────────────────────────────

type Campaign struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	StartDate   string     `json:"startDate"`
	EndDate     string     `json:"endDate"`
	TargetType  string     `json:"targetType,omitempty"`
	TargetID    string     `json:"targetId,omitempty"`
	Audience    string     `json:"audience"`
	Placement   string     `json:"placement,omitempty"`
	CreatedBy   string     `json:"createdBy"`
	ArchivedAt  *time.Time `json:"archivedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type CreateCampaignInput struct {
	Title            string
	Description      string
	StartDate        string
	EndDate          string
	TargetType       string
	TargetID         string
	Audience         string
	Placement        string
	CreatedBy        string
	CreatedBySurface string
	CorrelationID    string
}

var campaignSelectCols = `id, title, COALESCE(description,''), status,
	          COALESCE(start_date,''), COALESCE(end_date,''),
	          COALESCE(target_type,''), COALESCE(target_id,''), audience, COALESCE(placement,''),
	          COALESCE(created_by,''), archived_at, created_at, updated_at`

func scanCampaign(row interface{ Scan(dest ...any) error }) (Campaign, error) {
	var c Campaign
	err := row.Scan(&c.ID, &c.Title, &c.Description, &c.Status,
		&c.StartDate, &c.EndDate, &c.TargetType, &c.TargetID, &c.Audience, &c.Placement,
		&c.CreatedBy, &c.ArchivedAt, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

func ListCampaigns(db *sql.DB) ([]Campaign, error) {
	rows, err := db.Query(`SELECT ` + campaignSelectCols + ` FROM dsh_marketing_campaigns ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Campaign
	for rows.Next() {
		c, err := scanCampaign(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	if out == nil {
		out = []Campaign{}
	}
	return out, rows.Err()
}

func GetCampaign(db *sql.DB, id string) (Campaign, error) {
	c, err := scanCampaign(db.QueryRow(`SELECT `+campaignSelectCols+` FROM dsh_marketing_campaigns WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func CreateCampaign(db *sql.DB, in CreateCampaignInput) (Campaign, error) {
	if in.Title == "" {
		return Campaign{}, ErrInvalid
	}
	if in.Audience == "" {
		in.Audience = "all"
	}
	if in.CreatedBySurface == "" {
		in.CreatedBySurface = "control-panel"
	}
	if in.TargetType != "" {
		passed, reason, err := ValidateTarget(db, in.TargetType, in.TargetID)
		if err != nil {
			return Campaign{}, err
		}
		_ = WriteVisibilityGateCheck(db, "campaign", "", in.TargetType, in.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Campaign{}, ErrTargetGateFailed
		}
	}
	c, err := scanCampaign(db.QueryRow(`
		INSERT INTO dsh_marketing_campaigns
			(title, description, status, start_date, end_date, target_type, target_id, audience, placement, created_by, created_by_surface)
		VALUES ($1, $2, 'draft', $3, $4, NULLIF($5,''), NULLIF($6,''), $7, NULLIF($8,''), $9, $10)
		RETURNING `+campaignSelectCols,
		in.Title, in.Description, in.StartDate, in.EndDate, in.TargetType, in.TargetID,
		in.Audience, in.Placement, in.CreatedBy, in.CreatedBySurface))
	if err != nil {
		return Campaign{}, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "campaign", c.ID, in.TargetType, in.TargetID, in.CreatedBy, in.CorrelationID)
	}
	_ = WriteAuditEvent(db, "campaign", c.ID, in.CreatedBy, "operator", "create", "", in.CorrelationID, nil, campaignJSON(c))
	return c, nil
}

type UpdateCampaignInput struct {
	Status        string
	Title         string
	Description   string
	TargetType    string
	TargetID      string
	ActorID       string
	CorrelationID string
}

func UpdateCampaign(db *sql.DB, id string, in UpdateCampaignInput) (Campaign, error) {
	before, err := GetCampaign(db, id)
	if err != nil {
		return Campaign{}, err
	}

	targetType := before.TargetType
	targetID := before.TargetID
	if in.TargetType != "" {
		passed, reason, err := ValidateTarget(db, in.TargetType, in.TargetID)
		if err != nil {
			return Campaign{}, err
		}
		_ = WriteVisibilityGateCheck(db, "campaign", id, in.TargetType, in.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Campaign{}, ErrTargetGateFailed
		}
		targetType = in.TargetType
		targetID = in.TargetID
	}

	c, err := scanCampaign(db.QueryRow(`
		UPDATE dsh_marketing_campaigns
		SET status=COALESCE(NULLIF($2,''), status),
		    title=COALESCE(NULLIF($3,''), title),
		    description=COALESCE(NULLIF($4,''), description),
		    target_type=NULLIF($5,''),
		    target_id=NULLIF($6,''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING `+campaignSelectCols,
		id, in.Status, in.Title, in.Description, targetType, targetID))
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	if err != nil {
		return c, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "campaign", id, in.TargetType, in.TargetID, in.ActorID, in.CorrelationID)
	}
	_ = WriteAuditEvent(db, "campaign", id, in.ActorID, "operator", "update", "", in.CorrelationID, campaignJSON(before), campaignJSON(c))
	return c, nil
}

// ArchiveCampaign performs a soft archive (status -> 'cancelled', archived_at
// set) rather than a destructive delete, preserving audit history.
func ArchiveCampaign(db *sql.DB, id, actorID, correlationID string) error {
	before, err := GetCampaign(db, id)
	if err != nil {
		return err
	}
	result, err := db.Exec(`
		UPDATE dsh_marketing_campaigns
		SET status='cancelled', archived_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND archived_at IS NULL`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	after, err := GetCampaign(db, id)
	if err != nil {
		return err
	}
	return WriteAuditEvent(db, "campaign", id, actorID, "operator", "archive", "", correlationID, campaignJSON(before), campaignJSON(after))
}

// ── Banners ───────────────────────────────────────────────────────────────────

type Banner struct {
	ID         string     `json:"id"`
	Title      string     `json:"title"`
	ImageURL   string     `json:"imageUrl"`
	ActionURL  string     `json:"actionUrl"`
	Position   int        `json:"position"`
	IsActive   bool       `json:"isActive"`
	TargetType string     `json:"targetType,omitempty"`
	TargetID   string     `json:"targetId,omitempty"`
	Audience   string     `json:"audience"`
	Placement  string     `json:"placement"`
	CreatedBy  string     `json:"createdBy"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

var bannerSelectCols = `id, title, COALESCE(image_url,''), COALESCE(action_url,''),
	       position, is_active, COALESCE(target_type,''), COALESCE(target_id,''),
	       audience, placement, COALESCE(created_by,''), deleted_at, created_at, updated_at`

func scanBanner(row interface{ Scan(dest ...any) error }) (Banner, error) {
	var b Banner
	err := row.Scan(&b.ID, &b.Title, &b.ImageURL, &b.ActionURL,
		&b.Position, &b.IsActive, &b.TargetType, &b.TargetID,
		&b.Audience, &b.Placement, &b.CreatedBy, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt)
	return b, err
}

func ListBanners(db *sql.DB) ([]Banner, error) {
	rows, err := db.Query(`SELECT ` + bannerSelectCols + ` FROM dsh_marketing_banners WHERE deleted_at IS NULL ORDER BY position ASC, created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Banner
	for rows.Next() {
		b, err := scanBanner(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	if out == nil {
		out = []Banner{}
	}
	return out, rows.Err()
}

type CreateBannerInput struct {
	Title            string
	ImageURL         string
	ActionURL        string
	Position         int
	TargetType       string
	TargetID         string
	Audience         string
	Placement        string
	CreatedBy        string
	CreatedBySurface string
	CorrelationID    string
}

func CreateBanner(db *sql.DB, in CreateBannerInput) (Banner, error) {
	if in.Title == "" {
		return Banner{}, ErrInvalid
	}
	if in.Audience == "" {
		in.Audience = "all"
	}
	if in.Placement == "" {
		in.Placement = "home"
	}
	if in.CreatedBySurface == "" {
		in.CreatedBySurface = "control-panel"
	}
	if in.TargetType != "" {
		passed, reason, err := ValidateTarget(db, in.TargetType, in.TargetID)
		if err != nil {
			return Banner{}, err
		}
		_ = WriteVisibilityGateCheck(db, "banner", "", in.TargetType, in.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Banner{}, ErrTargetGateFailed
		}
	}
	b, err := scanBanner(db.QueryRow(`
		INSERT INTO dsh_marketing_banners
			(title, image_url, action_url, position, is_active, target_type, target_id, audience, placement, created_by, created_by_surface)
		VALUES ($1, $2, $3, $4, TRUE, NULLIF($5,''), NULLIF($6,''), $7, $8, $9, $10)
		RETURNING `+bannerSelectCols,
		in.Title, in.ImageURL, in.ActionURL, in.Position, in.TargetType, in.TargetID,
		in.Audience, in.Placement, in.CreatedBy, in.CreatedBySurface))
	if err != nil {
		return Banner{}, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "banner", b.ID, in.TargetType, in.TargetID, in.CreatedBy, in.CorrelationID)
	}
	_ = WriteAuditEvent(db, "banner", b.ID, in.CreatedBy, "operator", "create", "", in.CorrelationID, nil, bannerJSON(b))
	return b, nil
}

type UpdateBannerInput struct {
	IsActive      bool
	Title         string
	ImageURL      string
	TargetType    string
	TargetID      string
	ActorID       string
	CorrelationID string
}

func UpdateBanner(db *sql.DB, id string, in UpdateBannerInput) (Banner, error) {
	before, err := getBannerIncludingDeleted(db, id)
	if err != nil {
		return Banner{}, err
	}

	targetType := before.TargetType
	targetID := before.TargetID
	if in.TargetType != "" {
		passed, reason, err := ValidateTarget(db, in.TargetType, in.TargetID)
		if err != nil {
			return Banner{}, err
		}
		_ = WriteVisibilityGateCheck(db, "banner", id, in.TargetType, in.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Banner{}, ErrTargetGateFailed
		}
		targetType = in.TargetType
		targetID = in.TargetID
	}

	b, err := scanBanner(db.QueryRow(`
		UPDATE dsh_marketing_banners
		SET is_active=$2,
		    title=COALESCE(NULLIF($3,''), title),
		    image_url=COALESCE(NULLIF($4,''), image_url),
		    target_type=NULLIF($5,''),
		    target_id=NULLIF($6,''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING `+bannerSelectCols,
		id, in.IsActive, in.Title, in.ImageURL, targetType, targetID))
	if errors.Is(err, sql.ErrNoRows) {
		return b, ErrNotFound
	}
	if err != nil {
		return b, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "banner", id, in.TargetType, in.TargetID, in.ActorID, in.CorrelationID)
	}
	_ = WriteAuditEvent(db, "banner", id, in.ActorID, "operator", "update", "", in.CorrelationID, bannerJSON(before), bannerJSON(b))
	return b, nil
}

func getBannerIncludingDeleted(db *sql.DB, id string) (Banner, error) {
	b, err := scanBanner(db.QueryRow(`SELECT `+bannerSelectCols+` FROM dsh_marketing_banners WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return b, ErrNotFound
	}
	return b, err
}

// DeleteBanner performs a soft-delete (deleted_at set, is_active cleared)
// so that history and audit trail survive; a banner is never hard-removed
// once it has existed, since it may already have been client-visible.
func DeleteBanner(db *sql.DB, id, actorID, correlationID string) error {
	before, err := getBannerIncludingDeleted(db, id)
	if err != nil {
		return err
	}
	result, err := db.Exec(`
		UPDATE dsh_marketing_banners
		SET is_active=FALSE, deleted_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	after, _ := getBannerIncludingDeleted(db, id)
	return WriteAuditEvent(db, "banner", id, actorID, "operator", "delete", "", correlationID, bannerJSON(before), bannerJSON(after))
}

// ── Promos ────────────────────────────────────────────────────────────────────

type Promo struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	ExpiresAt   string     `json:"expiresAt"`
	TargetType  string     `json:"targetType,omitempty"`
	TargetID    string     `json:"targetId,omitempty"`
	Audience    string     `json:"audience"`
	Placement   string     `json:"placement,omitempty"`
	CreatedBy   string     `json:"createdBy"`
	ArchivedAt  *time.Time `json:"archivedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

var promoSelectCols = `id, code, COALESCE(description,''), status,
	       COALESCE(expires_at::TEXT,''), COALESCE(target_type,''), COALESCE(target_id,''),
	       audience, COALESCE(placement,''), COALESCE(created_by,''), archived_at, created_at, updated_at`

func scanPromo(row interface{ Scan(dest ...any) error }) (Promo, error) {
	var p Promo
	err := row.Scan(&p.ID, &p.Code, &p.Description, &p.Status,
		&p.ExpiresAt, &p.TargetType, &p.TargetID, &p.Audience, &p.Placement,
		&p.CreatedBy, &p.ArchivedAt, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func ListPromos(db *sql.DB) ([]Promo, error) {
	rows, err := db.Query(`SELECT ` + promoSelectCols + ` FROM dsh_marketing_promos ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Promo
	for rows.Next() {
		p, err := scanPromo(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Promo{}
	}
	return out, rows.Err()
}

type CreatePromoInput struct {
	Code             string
	Description      string
	ExpiresAt        string
	TargetType       string
	TargetID         string
	Audience         string
	Placement        string
	CreatedBy        string
	CreatedBySurface string
	CorrelationID    string
}

func CreatePromo(db *sql.DB, in CreatePromoInput) (Promo, error) {
	if in.Code == "" {
		return Promo{}, ErrInvalid
	}
	if in.Audience == "" {
		in.Audience = "all"
	}
	if in.CreatedBySurface == "" {
		in.CreatedBySurface = "control-panel"
	}
	var expiresAtArg interface{}
	if in.ExpiresAt != "" {
		expiresAtArg = in.ExpiresAt
	}
	if in.TargetType != "" {
		passed, reason, err := ValidateTarget(db, in.TargetType, in.TargetID)
		if err != nil {
			return Promo{}, err
		}
		_ = WriteVisibilityGateCheck(db, "promo", "", in.TargetType, in.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Promo{}, ErrTargetGateFailed
		}
	}
	p, err := scanPromo(db.QueryRow(`
		INSERT INTO dsh_marketing_promos
			(code, description, status, expires_at, target_type, target_id, audience, placement, created_by, created_by_surface)
		VALUES ($1, $2, 'active', $3, NULLIF($4,''), NULLIF($5,''), $6, NULLIF($7,''), $8, $9)
		RETURNING `+promoSelectCols,
		in.Code, in.Description, expiresAtArg, in.TargetType, in.TargetID,
		in.Audience, in.Placement, in.CreatedBy, in.CreatedBySurface))
	if err != nil {
		return Promo{}, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "promo", p.ID, in.TargetType, in.TargetID, in.CreatedBy, in.CorrelationID)
	}
	_ = WriteAuditEvent(db, "promo", p.ID, in.CreatedBy, "operator", "create", "", in.CorrelationID, nil, promoJSON(p))
	return p, nil
}

// promoTransitions enumerates the legal status state machine. Any transition
// not listed here is rejected with ErrInvalidTransition.
var promoTransitions = map[string]map[string]bool{
	"active": {"paused": true, "expired": true, "cancelled": true},
	"paused": {"active": true, "expired": true, "cancelled": true},
	// expired and cancelled are terminal states.
}

type UpdatePromoInput struct {
	Status        string
	ActorID       string
	CorrelationID string
}

func UpdatePromo(db *sql.DB, id string, in UpdatePromoInput) (Promo, error) {
	before, err := GetPromo(db, id)
	if err != nil {
		return Promo{}, err
	}
	if in.Status != "" && in.Status != before.Status {
		if !promoTransitions[before.Status][in.Status] {
			return Promo{}, ErrInvalidTransition
		}
	}
	p, err := scanPromo(db.QueryRow(`
		UPDATE dsh_marketing_promos
		SET status=COALESCE(NULLIF($2,''), status), updated_at=NOW()
		WHERE id=$1
		RETURNING `+promoSelectCols,
		id, in.Status))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	if err != nil {
		return p, err
	}
	_ = WriteAuditEvent(db, "promo", id, in.ActorID, "operator", "update", "", in.CorrelationID, promoJSON(before), promoJSON(p))
	return p, nil
}

func GetPromo(db *sql.DB, id string) (Promo, error) {
	p, err := scanPromo(db.QueryRow(`SELECT `+promoSelectCols+` FROM dsh_marketing_promos WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}
