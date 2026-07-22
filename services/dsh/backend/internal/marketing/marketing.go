package marketing

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
)

// ── Campaigns ────────────────────────────────────────────────────────────────

var campaignStatuses = map[string]bool{
	"draft": true, "active": true, "paused": true, "completed": true, "cancelled": true,
}

var campaignAudiences = map[string]bool{
	"all": true, "client": true, "partner": true, "captain": true, "field": true,
}

var campaignPlacements = map[string]bool{
	"home": true, "hero": true, "feed": true, "floating": true, "banner": true, "store-card": true,
}

func campaignTransitionAllowed(from, to string) bool {
	if from == to {
		return true
	}
	switch from {
	case "draft":
		return to == "active" || to == "cancelled"
	case "active":
		return to == "paused" || to == "completed" || to == "cancelled"
	case "paused":
		return to == "active" || to == "completed" || to == "cancelled"
	case "completed", "cancelled":
		return false
	default:
		return false
	}
}

func validateCampaignDates(startDate, endDate string) error {
	startDate = strings.TrimSpace(startDate)
	endDate = strings.TrimSpace(endDate)
	if startDate == "" && endDate == "" {
		return nil
	}
	if startDate == "" || endDate == "" {
		return ErrInvalid
	}
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return ErrInvalid
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil || !end.After(start) {
		return ErrInvalid
	}
	return nil
}

func validateCampaignActivationWindow(startDate, endDate string, now time.Time) error {
	if validateCampaignDates(startDate, endDate) != nil {
		return ErrInvalid
	}
	end, _ := time.Parse("2006-01-02", endDate)
	if end.Before(time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day(), 0, 0, 0, 0, time.UTC)) {
		return ErrInvalid
	}
	return nil
}

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
	Version     int        `json:"version"`
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
	          version, COALESCE(created_by,''), archived_at, created_at, updated_at`

func scanCampaign(row interface{ Scan(dest ...any) error }) (Campaign, error) {
	var c Campaign
	err := row.Scan(&c.ID, &c.Title, &c.Description, &c.Status,
		&c.StartDate, &c.EndDate, &c.TargetType, &c.TargetID, &c.Audience, &c.Placement,
		&c.Version, &c.CreatedBy, &c.ArchivedAt, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

func ListCampaigns(db *sql.DB) ([]Campaign, error) {
	rows, err := db.Query(`SELECT ` + campaignSelectCols + `
		FROM dsh_marketing_campaigns
		WHERE archived_at IS NULL
		ORDER BY created_at DESC`)
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
	c, err := scanCampaign(db.QueryRow(`SELECT `+campaignSelectCols+` FROM dsh_marketing_campaigns WHERE id=$1 AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func CreateCampaign(db *sql.DB, in CreateCampaignInput) (Campaign, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.StartDate = strings.TrimSpace(in.StartDate)
	in.EndDate = strings.TrimSpace(in.EndDate)
	in.Audience = strings.TrimSpace(in.Audience)
	in.Placement = strings.TrimSpace(in.Placement)
	if in.Title == "" || validateCampaignDates(in.StartDate, in.EndDate) != nil {
		return Campaign{}, ErrInvalid
	}
	if in.Audience == "" {
		in.Audience = "all"
	}
	if !campaignAudiences[in.Audience] {
		return Campaign{}, ErrInvalid
	}
	if in.Placement != "" && !campaignPlacements[in.Placement] {
		return Campaign{}, ErrInvalid
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
	Status          string
	Title           string
	Description     string
	StartDate       string
	EndDate         string
	TargetType      string
	TargetID        string
	Audience        string
	Placement       string
	ExpectedVersion int
	ActorID         string
	CorrelationID   string
}

func UpdateCampaign(db *sql.DB, id string, in UpdateCampaignInput) (Campaign, error) {
	before, err := GetCampaign(db, id)
	if err != nil {
		return Campaign{}, err
	}
	if in.ExpectedVersion <= 0 || in.ExpectedVersion != before.Version {
		return Campaign{}, ErrCommercialVersionConflict
	}

	next := before
	if in.Status != "" {
		if !campaignStatuses[in.Status] || !campaignTransitionAllowed(before.Status, in.Status) {
			return Campaign{}, ErrInvalidTransition
		}
		next.Status = in.Status
	}
	if in.Title != "" {
		next.Title = strings.TrimSpace(in.Title)
		if next.Title == "" {
			return Campaign{}, ErrInvalid
		}
	}
	if in.Description != "" {
		next.Description = strings.TrimSpace(in.Description)
	}
	if in.StartDate != "" || in.EndDate != "" {
		next.StartDate = strings.TrimSpace(in.StartDate)
		next.EndDate = strings.TrimSpace(in.EndDate)
		if validateCampaignDates(next.StartDate, next.EndDate) != nil {
			return Campaign{}, ErrInvalid
		}
	}
	if in.Audience != "" {
		next.Audience = strings.TrimSpace(in.Audience)
		if !campaignAudiences[next.Audience] {
			return Campaign{}, ErrInvalid
		}
	}
	if in.Placement != "" {
		next.Placement = strings.TrimSpace(in.Placement)
		if !campaignPlacements[next.Placement] {
			return Campaign{}, ErrInvalid
		}
	}
	if in.TargetType != "" {
		next.TargetType = strings.TrimSpace(in.TargetType)
		next.TargetID = strings.TrimSpace(in.TargetID)
	}

	if next.Status == "active" {
		if validateCampaignActivationWindow(next.StartDate, next.EndDate, time.Now()) != nil {
			return Campaign{}, ErrInvalid
		}
		if next.Audience != "all" && next.Audience != "client" {
			return Campaign{}, ErrInvalid
		}
	}
	if next.TargetType != "" && (in.TargetType != "" || next.Status == "active") {
		passed, reason, gateErr := ValidateTarget(db, next.TargetType, next.TargetID)
		if gateErr != nil {
			return Campaign{}, gateErr
		}
		_ = WriteVisibilityGateCheck(db, "campaign", id, next.TargetType, next.TargetID, "target_client_visibility", passed, reason)
		if !passed {
			return Campaign{}, ErrTargetGateFailed
		}
	}

	c, err := scanCampaign(db.QueryRow(`
		UPDATE dsh_marketing_campaigns
		SET status=$2, title=$3, description=$4,
		    start_date=NULLIF($5,''), end_date=NULLIF($6,''),
		    target_type=NULLIF($7,''), target_id=NULLIF($8,''),
		    audience=$9, placement=NULLIF($10,''),
		    version=version+1, updated_at=NOW()
		WHERE id=$1 AND version=$11 AND archived_at IS NULL
		RETURNING `+campaignSelectCols,
		id, next.Status, next.Title, next.Description, next.StartDate, next.EndDate,
		next.TargetType, next.TargetID, next.Audience, next.Placement, in.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return Campaign{}, ErrCommercialVersionConflict
	}
	if err != nil {
		return Campaign{}, err
	}
	if in.TargetType != "" {
		_ = WriteTargetBinding(db, "campaign", id, next.TargetType, next.TargetID, in.ActorID, in.CorrelationID)
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
		SET status='cancelled', archived_at=NOW(), version=version+1, updated_at=NOW()
		WHERE id=$1 AND archived_at IS NULL`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return WriteAuditEvent(db, "campaign", id, actorID, "operator", "archive", "", correlationID, campaignJSON(before), nil)
}
