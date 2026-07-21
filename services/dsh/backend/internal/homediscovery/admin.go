package homediscovery

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

var (
	ErrAdminContentNotFound        = errors.New("home discovery content not found")
	ErrAdminContentVersionConflict = errors.New("home discovery content version conflict")
)

const adminContentSelectColumns = `id, title, COALESCE(subtitle,''), %s,
	image_url, action_type, action_target, sort_order, is_active,
	publication_status, publish_from::TEXT, publish_until::TEXT,
	created_by_actor_id, approved_by_actor_id, approved_at::TEXT, version`

func nullableAdminString(value sql.NullString) *string {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return nil
	}
	result := value.String
	return &result
}

func adminSelectColumns(kind string) string {
	badgeColumn := "''"
	if kind == "promos" {
		badgeColumn = "COALESCE(badge_label,'')"
	}
	return fmt.Sprintf(adminContentSelectColumns, badgeColumn)
}

func scanAdminContent(row interface{ Scan(dest ...any) error }, kind string) (AdminContentItem, error) {
	var item AdminContentItem
	var publishFrom, publishUntil, approvedAt sql.NullString
	item.Kind = kind
	err := row.Scan(
		&item.ID, &item.Title, &item.Subtitle, &item.BadgeLabel, &item.ImageURL,
		&item.ActionType, &item.ActionTarget, &item.SortOrder, &item.IsActive,
		&item.PublicationStatus, &publishFrom, &publishUntil,
		&item.CreatedByActorID, &item.ApprovedByActorID, &approvedAt, &item.Version,
	)
	item.PublishFrom = nullableAdminString(publishFrom)
	item.PublishUntil = nullableAdminString(publishUntil)
	item.ApprovedAt = nullableAdminString(approvedAt)
	return item, err
}

func ListAdminContent(ctx context.Context, db *sql.DB, kind string) ([]AdminContentItem, error) {
	table, err := adminTable(kind)
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, "SELECT "+adminSelectColumns(kind)+" FROM "+table+" ORDER BY sort_order ASC, id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminContentItem{}
	for rows.Next() {
		item, scanErr := scanAdminContent(rows, kind)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func CreateAdminContent(ctx context.Context, db *sql.DB, kind, actorID, correlationID string, input AdminContentInput) (AdminContentItem, error) {
	if err := validateAdminInput(kind, input); err != nil {
		return AdminContentItem{}, err
	}
	prefix := strings.TrimSuffix(kind, "s")
	id := fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	return writeAdminContent(ctx, db, kind, id, actorID, correlationID, "create", input, true)
}

func UpdateAdminContent(ctx context.Context, db *sql.DB, kind, id, actorID, correlationID string, input AdminContentInput) (AdminContentItem, error) {
	if input.ExpectedVersion <= 0 {
		return AdminContentItem{}, fmt.Errorf("expectedVersion is required for update")
	}
	if err := validateAdminInput(kind, input); err != nil {
		return AdminContentItem{}, err
	}
	return writeAdminContent(ctx, db, kind, id, actorID, correlationID, "update", input, false)
}

func DeleteAdminContent(ctx context.Context, db *sql.DB, kind, id, actorID, correlationID string) error {
	table, err := adminTable(kind)
	if err != nil {
		return err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, "DELETE FROM "+table+" WHERE id = $1", id)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected != 1 {
		return ErrAdminContentNotFound
	}
	if err := insertContentAudit(ctx, tx, actorID, kind, id, "delete", correlationID); err != nil {
		return err
	}
	return tx.Commit()
}

func resolvePublicationStatus(input AdminContentInput) string {
	status := strings.TrimSpace(input.PublicationStatus)
	if status != "" {
		return status
	}
	if input.IsActive {
		return "published"
	}
	return "paused"
}

func writeAdminContent(
	ctx context.Context,
	db *sql.DB,
	kind, id, actorID, correlationID, action string,
	input AdminContentInput,
	create bool,
) (AdminContentItem, error) {
	table, err := adminTable(kind)
	if err != nil {
		return AdminContentItem{}, err
	}
	status := resolvePublicationStatus(input)
	isActive := status == "published"
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return AdminContentItem{}, err
	}
	defer tx.Rollback()

	if create {
		if kind == "promos" {
			_, err = tx.ExecContext(ctx, `INSERT INTO `+table+`
				(id,title,subtitle,badge_label,image_url,action_type,action_target,sort_order,is_active,
				 publication_status,publish_from,publish_until,created_by_actor_id,approved_by_actor_id,approved_at)
				VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,$7,$8,$9,$10,$11,$12,$13,
				 CASE WHEN $10='published' THEN $13 ELSE '' END,
				 CASE WHEN $10='published' THEN NOW() ELSE NULL END)`,
				id, input.Title, input.Subtitle, input.BadgeLabel, input.ImageURL, input.ActionType,
				input.ActionTarget, input.SortOrder, isActive, status, input.PublishFrom, input.PublishUntil, actorID)
		} else {
			_, err = tx.ExecContext(ctx, `INSERT INTO `+table+`
				(id,title,subtitle,image_url,action_type,action_target,sort_order,is_active,
				 publication_status,publish_from,publish_until,created_by_actor_id,approved_by_actor_id,approved_at)
				VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8,$9,$10,$11,$12,
				 CASE WHEN $9='published' THEN $12 ELSE '' END,
				 CASE WHEN $9='published' THEN NOW() ELSE NULL END)`,
				id, input.Title, input.Subtitle, input.ImageURL, input.ActionType, input.ActionTarget,
				input.SortOrder, isActive, status, input.PublishFrom, input.PublishUntil, actorID)
		}
	} else {
		var currentVersion int
		if err = tx.QueryRowContext(ctx, "SELECT version FROM "+table+" WHERE id=$1 FOR UPDATE", id).Scan(&currentVersion); errors.Is(err, sql.ErrNoRows) {
			return AdminContentItem{}, ErrAdminContentNotFound
		} else if err != nil {
			return AdminContentItem{}, err
		}
		var result sql.Result
		if kind == "promos" {
			result, err = tx.ExecContext(ctx, `UPDATE `+table+` SET
				title=$1,subtitle=NULLIF($2,''),badge_label=NULLIF($3,''),image_url=$4,
				action_type=$5,action_target=$6,sort_order=$7,is_active=$8,
				publication_status=$9,publish_from=$10,publish_until=$11,
				approved_by_actor_id=CASE WHEN $9='published' THEN $12 ELSE approved_by_actor_id END,
				approved_at=CASE WHEN $9='published' THEN NOW() ELSE approved_at END,
				version=version+1,updated_at=NOW()
				WHERE id=$13 AND version=$14`,
				input.Title, input.Subtitle, input.BadgeLabel, input.ImageURL, input.ActionType,
				input.ActionTarget, input.SortOrder, isActive, status, input.PublishFrom,
				input.PublishUntil, actorID, id, input.ExpectedVersion)
		} else {
			result, err = tx.ExecContext(ctx, `UPDATE `+table+` SET
				title=$1,subtitle=NULLIF($2,''),image_url=$3,action_type=$4,action_target=$5,
				sort_order=$6,is_active=$7,publication_status=$8,publish_from=$9,publish_until=$10,
				approved_by_actor_id=CASE WHEN $8='published' THEN $11 ELSE approved_by_actor_id END,
				approved_at=CASE WHEN $8='published' THEN NOW() ELSE approved_at END,
				version=version+1,updated_at=NOW()
				WHERE id=$12 AND version=$13`,
				input.Title, input.Subtitle, input.ImageURL, input.ActionType, input.ActionTarget,
				input.SortOrder, isActive, status, input.PublishFrom, input.PublishUntil,
				actorID, id, input.ExpectedVersion)
		}
		if err == nil {
			affected, _ := result.RowsAffected()
			if affected != 1 {
				return AdminContentItem{}, ErrAdminContentVersionConflict
			}
		}
	}
	if err != nil {
		return AdminContentItem{}, err
	}
	if err := insertContentAudit(ctx, tx, actorID, kind, id, action, correlationID); err != nil {
		return AdminContentItem{}, err
	}
	if err := tx.Commit(); err != nil {
		return AdminContentItem{}, err
	}

	item, err := scanAdminContent(db.QueryRowContext(ctx, "SELECT "+adminSelectColumns(kind)+" FROM "+table+" WHERE id=$1", id), kind)
	if errors.Is(err, sql.ErrNoRows) {
		return AdminContentItem{}, ErrAdminContentNotFound
	}
	return item, err
}

func insertContentAudit(ctx context.Context, tx *sql.Tx, actorID, kind, itemID, action, correlationID string) error {
	if len(strings.TrimSpace(correlationID)) < 8 {
		return fmt.Errorf("correlation id is required")
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_home_content_audit (id,actor_id,content_kind,content_id,action,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		fmt.Sprintf("home-audit-%d", time.Now().UnixNano()), actorID, kind, itemID, action, correlationID,
	)
	return err
}

func adminTable(kind string) (string, error) {
	switch kind {
	case "banners":
		return "dsh_home_banners", nil
	case "promos":
		return "dsh_home_promos", nil
	default:
		return "", fmt.Errorf("invalid content kind")
	}
}

func parseOptionalPublicationTime(value *string, field string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*value))
	if err != nil {
		return nil, fmt.Errorf("invalid %s", field)
	}
	return &parsed, nil
}

func validateAdminInput(kind string, input AdminContentInput) error {
	if _, err := adminTable(kind); err != nil {
		return err
	}
	if len(strings.TrimSpace(input.Title)) < 2 || input.SortOrder < 0 {
		return fmt.Errorf("invalid home discovery content")
	}
	if strings.TrimSpace(input.ImageURL) == "" {
		return fmt.Errorf("image url is required")
	}
	target := strings.TrimSpace(input.ActionTarget)
	switch input.ActionType {
	case "store", "category":
		if target == "" {
			return fmt.Errorf("action target is required")
		}
	case "external":
		if target == "" {
			return fmt.Errorf("action target is required")
		}
		parsed, err := url.ParseRequestURI(target)
		if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
			return fmt.Errorf("external action target must be an http or https URL")
		}
	case "none":
		if target != "" {
			return fmt.Errorf("action target must be empty when action type is none")
		}
	default:
		return fmt.Errorf("invalid action type")
	}
	status := resolvePublicationStatus(input)
	switch status {
	case "draft", "published", "paused", "archived":
	default:
		return fmt.Errorf("invalid publication status")
	}
	publishFrom, err := parseOptionalPublicationTime(input.PublishFrom, "publishFrom")
	if err != nil {
		return err
	}
	publishUntil, err := parseOptionalPublicationTime(input.PublishUntil, "publishUntil")
	if err != nil {
		return err
	}
	if publishFrom != nil && publishUntil != nil && !publishUntil.After(*publishFrom) {
		return fmt.Errorf("publishUntil must be after publishFrom")
	}
	return nil
}
