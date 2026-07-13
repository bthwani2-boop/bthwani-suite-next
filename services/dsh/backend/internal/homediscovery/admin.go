package homediscovery

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrAdminContentNotFound = errors.New("home discovery content not found")

func ListAdminContent(ctx context.Context, db *sql.DB, kind string) ([]AdminContentItem, error) {
	table, err := adminTable(kind)
	if err != nil {
		return nil, err
	}
	selectColumns := "id, title, COALESCE(subtitle,''), '', image_url, action_type, action_target, sort_order, is_active"
	if kind == "promos" {
		selectColumns = "id, title, COALESCE(subtitle,''), COALESCE(badge_label,''), image_url, action_type, action_target, sort_order, is_active"
	}
	rows, err := db.QueryContext(ctx, "SELECT "+selectColumns+" FROM "+table+" ORDER BY sort_order ASC, id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminContentItem{}
	for rows.Next() {
		var item AdminContentItem
		item.Kind = kind
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Subtitle, &item.BadgeLabel, &item.ImageURL,
			&item.ActionType, &item.ActionTarget, &item.SortOrder, &item.IsActive,
		); err != nil {
			return nil, err
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
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return AdminContentItem{}, err
	}
	defer tx.Rollback()
	var result sql.Result
	if kind == "promos" {
		if create {
			result, err = tx.ExecContext(ctx, "INSERT INTO "+table+" (id,title,subtitle,badge_label,image_url,action_type,action_target,sort_order,is_active) VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,$7,$8,$9)", id, input.Title, input.Subtitle, input.BadgeLabel, input.ImageURL, input.ActionType, input.ActionTarget, input.SortOrder, input.IsActive)
		} else {
			result, err = tx.ExecContext(ctx, "UPDATE "+table+" SET title=$1,subtitle=NULLIF($2,''),badge_label=NULLIF($3,''),image_url=$4,action_type=$5,action_target=$6,sort_order=$7,is_active=$8,updated_at=now() WHERE id=$9", input.Title, input.Subtitle, input.BadgeLabel, input.ImageURL, input.ActionType, input.ActionTarget, input.SortOrder, input.IsActive, id)
		}
	} else {
		if create {
			result, err = tx.ExecContext(ctx, "INSERT INTO "+table+" (id,title,subtitle,image_url,action_type,action_target,sort_order,is_active) VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8)", id, input.Title, input.Subtitle, input.ImageURL, input.ActionType, input.ActionTarget, input.SortOrder, input.IsActive)
		} else {
			result, err = tx.ExecContext(ctx, "UPDATE "+table+" SET title=$1,subtitle=NULLIF($2,''),image_url=$3,action_type=$4,action_target=$5,sort_order=$6,is_active=$7,updated_at=now() WHERE id=$8", input.Title, input.Subtitle, input.ImageURL, input.ActionType, input.ActionTarget, input.SortOrder, input.IsActive, id)
		}
	}
	if err != nil {
		return AdminContentItem{}, err
	}
	affected, _ := result.RowsAffected()
	if !create && affected != 1 {
		return AdminContentItem{}, ErrAdminContentNotFound
	}
	if err := insertContentAudit(ctx, tx, actorID, kind, id, action, correlationID); err != nil {
		return AdminContentItem{}, err
	}
	if err := tx.Commit(); err != nil {
		return AdminContentItem{}, err
	}
	items, err := ListAdminContent(ctx, db, kind)
	if err != nil {
		return AdminContentItem{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return AdminContentItem{}, ErrAdminContentNotFound
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
	switch input.ActionType {
	case "store", "category", "external", "none":
	default:
		return fmt.Errorf("invalid action type")
	}
	return nil
}
