package marketing

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
)

// ── Campaigns ────────────────────────────────────────────────────────────────

type Campaign struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	StartDate   string    `json:"startDate"`
	EndDate     string    `json:"endDate"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateCampaignInput struct {
	Title       string
	Description string
	StartDate   string
	EndDate     string
	CreatedBy   string
}

func ListCampaigns(db *sql.DB) ([]Campaign, error) {
	rows, err := db.Query(`
		SELECT id, title, COALESCE(description,''), status,
		       COALESCE(start_date,''), COALESCE(end_date,''),
		       COALESCE(created_by,''), created_at, updated_at
		FROM dsh_marketing_campaigns ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Campaign
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Status,
			&c.StartDate, &c.EndDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
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
	var c Campaign
	err := db.QueryRow(`
		SELECT id, title, COALESCE(description,''), status,
		       COALESCE(start_date,''), COALESCE(end_date,''),
		       COALESCE(created_by,''), created_at, updated_at
		FROM dsh_marketing_campaigns WHERE id=$1`, id).Scan(
		&c.ID, &c.Title, &c.Description, &c.Status,
		&c.StartDate, &c.EndDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func CreateCampaign(db *sql.DB, in CreateCampaignInput) (Campaign, error) {
	if in.Title == "" {
		return Campaign{}, ErrInvalid
	}
	var c Campaign
	err := db.QueryRow(`
		INSERT INTO dsh_marketing_campaigns (title, description, status, start_date, end_date, created_by)
		VALUES ($1, $2, 'draft', $3, $4, $5)
		RETURNING id, title, COALESCE(description,''), status,
		          COALESCE(start_date,''), COALESCE(end_date,''),
		          COALESCE(created_by,''), created_at, updated_at`,
		in.Title, in.Description, in.StartDate, in.EndDate, in.CreatedBy).Scan(
		&c.ID, &c.Title, &c.Description, &c.Status,
		&c.StartDate, &c.EndDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

func UpdateCampaign(db *sql.DB, id string, status, title, description string) (Campaign, error) {
	var c Campaign
	err := db.QueryRow(`
		UPDATE dsh_marketing_campaigns
		SET status=COALESCE(NULLIF($2,''), status),
		    title=COALESCE(NULLIF($3,''), title),
		    description=COALESCE(NULLIF($4,''), description),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, title, COALESCE(description,''), status,
		          COALESCE(start_date,''), COALESCE(end_date,''),
		          COALESCE(created_by,''), created_at, updated_at`,
		id, status, title, description).Scan(
		&c.ID, &c.Title, &c.Description, &c.Status,
		&c.StartDate, &c.EndDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func DeleteCampaign(db *sql.DB, id string) error {
	result, err := db.Exec(`DELETE FROM dsh_marketing_campaigns WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Banners ───────────────────────────────────────────────────────────────────

type Banner struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	ImageURL   string    `json:"imageUrl"`
	ActionURL  string    `json:"actionUrl"`
	Position   int       `json:"position"`
	IsActive   bool      `json:"isActive"`
	CreatedBy  string    `json:"createdBy"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func ListBanners(db *sql.DB) ([]Banner, error) {
	rows, err := db.Query(`
		SELECT id, title, COALESCE(image_url,''), COALESCE(action_url,''),
		       position, is_active, COALESCE(created_by,''), created_at, updated_at
		FROM dsh_marketing_banners ORDER BY position ASC, created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Banner
	for rows.Next() {
		var b Banner
		if err := rows.Scan(&b.ID, &b.Title, &b.ImageURL, &b.ActionURL,
			&b.Position, &b.IsActive, &b.CreatedBy, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	if out == nil {
		out = []Banner{}
	}
	return out, rows.Err()
}

func CreateBanner(db *sql.DB, title, imageURL, actionURL string, position int, createdBy string) (Banner, error) {
	if title == "" {
		return Banner{}, ErrInvalid
	}
	var b Banner
	err := db.QueryRow(`
		INSERT INTO dsh_marketing_banners (title, image_url, action_url, position, is_active, created_by)
		VALUES ($1, $2, $3, $4, TRUE, $5)
		RETURNING id, title, COALESCE(image_url,''), COALESCE(action_url,''),
		          position, is_active, COALESCE(created_by,''), created_at, updated_at`,
		title, imageURL, actionURL, position, createdBy).Scan(
		&b.ID, &b.Title, &b.ImageURL, &b.ActionURL,
		&b.Position, &b.IsActive, &b.CreatedBy, &b.CreatedAt, &b.UpdatedAt)
	return b, err
}

func UpdateBanner(db *sql.DB, id string, isActive bool, title, imageURL string) (Banner, error) {
	var b Banner
	err := db.QueryRow(`
		UPDATE dsh_marketing_banners
		SET is_active=$2,
		    title=COALESCE(NULLIF($3,''), title),
		    image_url=COALESCE(NULLIF($4,''), image_url),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, title, COALESCE(image_url,''), COALESCE(action_url,''),
		          position, is_active, COALESCE(created_by,''), created_at, updated_at`,
		id, isActive, title, imageURL).Scan(
		&b.ID, &b.Title, &b.ImageURL, &b.ActionURL,
		&b.Position, &b.IsActive, &b.CreatedBy, &b.CreatedAt, &b.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return b, ErrNotFound
	}
	return b, err
}

func DeleteBanner(db *sql.DB, id string) error {
	result, err := db.Exec(`DELETE FROM dsh_marketing_banners WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Promos ────────────────────────────────────────────────────────────────────

type Promo struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	ExpiresAt   string    `json:"expiresAt"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func ListPromos(db *sql.DB) ([]Promo, error) {
	rows, err := db.Query(`
		SELECT id, code, COALESCE(description,''), status,
		       COALESCE(expires_at::TEXT,''), COALESCE(created_by,''), created_at, updated_at
		FROM dsh_marketing_promos ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Promo
	for rows.Next() {
		var p Promo
		if err := rows.Scan(&p.ID, &p.Code, &p.Description, &p.Status,
			&p.ExpiresAt, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Promo{}
	}
	return out, rows.Err()
}

func CreatePromo(db *sql.DB, code, description, expiresAt, createdBy string) (Promo, error) {
	if code == "" {
		return Promo{}, ErrInvalid
	}
	var p Promo
	var expiresAtArg interface{}
	if expiresAt != "" {
		expiresAtArg = expiresAt
	}
	err := db.QueryRow(`
		INSERT INTO dsh_marketing_promos (code, description, status, expires_at, created_by)
		VALUES ($1, $2, 'active', $3, $4)
		RETURNING id, code, COALESCE(description,''), status,
		          COALESCE(expires_at::TEXT,''), COALESCE(created_by,''), created_at, updated_at`,
		code, description, expiresAtArg, createdBy).Scan(
		&p.ID, &p.Code, &p.Description, &p.Status,
		&p.ExpiresAt, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func UpdatePromo(db *sql.DB, id, status string) (Promo, error) {
	var p Promo
	err := db.QueryRow(`
		UPDATE dsh_marketing_promos
		SET status=COALESCE(NULLIF($2,''), status), updated_at=NOW()
		WHERE id=$1
		RETURNING id, code, COALESCE(description,''), status,
		          COALESCE(expires_at::TEXT,''), COALESCE(created_by,''), created_at, updated_at`,
		id, status).Scan(
		&p.ID, &p.Code, &p.Description, &p.Status,
		&p.ExpiresAt, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}
