package marketing

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound            = errors.New("not found")
	ErrInvalid             = errors.New("invalid input")
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
