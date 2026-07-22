package homediscovery

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"sort"
	"strings"
)

var homeTargetCodePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$`)

type AdminTargeting struct {
	CityCodes        []string `json:"cityCodes"`
	ServiceAreaCodes []string `json:"serviceAreaCodes"`
	AudienceSegments []string `json:"audienceSegments"`
}

func EmptyAdminTargeting() AdminTargeting {
	return AdminTargeting{
		CityCodes:        []string{},
		ServiceAreaCodes: []string{},
		AudienceSegments: []string{},
	}
}

func ListAdminTargeting(ctx context.Context, db *sql.DB, kind, itemID string) (AdminTargeting, error) {
	if err := ensureAdminContentExists(ctx, db, kind, itemID); err != nil {
		return AdminTargeting{}, err
	}
	rows, err := db.QueryContext(ctx, `
		SELECT target_type, target_value
		FROM dsh_home_content_targets
		WHERE content_kind = $1 AND content_id = $2
		ORDER BY target_type, target_value`, kind, itemID)
	if err != nil {
		return AdminTargeting{}, err
	}
	defer rows.Close()

	result := EmptyAdminTargeting()
	for rows.Next() {
		var targetType, targetValue string
		if err := rows.Scan(&targetType, &targetValue); err != nil {
			return AdminTargeting{}, err
		}
		switch targetType {
		case "city":
			result.CityCodes = append(result.CityCodes, targetValue)
		case "service_area":
			result.ServiceAreaCodes = append(result.ServiceAreaCodes, targetValue)
		case "audience":
			result.AudienceSegments = append(result.AudienceSegments, targetValue)
		}
	}
	return result, rows.Err()
}

func ReplaceAdminTargeting(
	ctx context.Context,
	db *sql.DB,
	kind, itemID, actorID, correlationID string,
	input AdminTargeting,
) (AdminTargeting, error) {
	if len(strings.TrimSpace(correlationID)) < 8 {
		return AdminTargeting{}, fmt.Errorf("correlation id is required")
	}
	normalized, err := normalizeAdminTargeting(input)
	if err != nil {
		return AdminTargeting{}, err
	}
	table, err := adminTable(kind)
	if err != nil {
		return AdminTargeting{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return AdminTargeting{}, err
	}
	defer tx.Rollback()

	var exists bool
	if err := tx.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM "+table+" WHERE id=$1)", itemID).Scan(&exists); err != nil {
		return AdminTargeting{}, err
	}
	if !exists {
		return AdminTargeting{}, ErrAdminContentNotFound
	}
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM dsh_home_content_targets
		WHERE content_kind=$1 AND content_id=$2`, kind, itemID); err != nil {
		return AdminTargeting{}, err
	}

	insertTargets := func(targetType string, values []string) error {
		for _, value := range values {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO dsh_home_content_targets
				(content_kind,content_id,target_type,target_value,created_by_actor_id,correlation_id)
				VALUES ($1,$2,$3,$4,$5,$6)`,
				kind, itemID, targetType, value, actorID, correlationID,
			); err != nil {
				return err
			}
		}
		return nil
	}
	if err := insertTargets("city", normalized.CityCodes); err != nil {
		return AdminTargeting{}, err
	}
	if err := insertTargets("service_area", normalized.ServiceAreaCodes); err != nil {
		return AdminTargeting{}, err
	}
	if err := insertTargets("audience", normalized.AudienceSegments); err != nil {
		return AdminTargeting{}, err
	}
	if err := insertContentAudit(ctx, tx, actorID, kind, itemID, "update", correlationID); err != nil {
		return AdminTargeting{}, err
	}
	if err := tx.Commit(); err != nil {
		return AdminTargeting{}, err
	}
	return normalized, nil
}

func ensureAdminContentExists(ctx context.Context, db *sql.DB, kind, itemID string) error {
	table, err := adminTable(kind)
	if err != nil {
		return err
	}
	var exists bool
	if err := db.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM "+table+" WHERE id=$1)", itemID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrAdminContentNotFound
	}
	return nil
}

func normalizeAdminTargeting(input AdminTargeting) (AdminTargeting, error) {
	cities, err := normalizeHomeTargetValues("city code", input.CityCodes, nil)
	if err != nil {
		return AdminTargeting{}, err
	}
	areas, err := normalizeHomeTargetValues("service area code", input.ServiceAreaCodes, nil)
	if err != nil {
		return AdminTargeting{}, err
	}
	allowedAudiences := map[string]struct{}{"guest": {}, "authenticated": {}}
	audiences, err := normalizeHomeTargetValues("audience segment", input.AudienceSegments, allowedAudiences)
	if err != nil {
		return AdminTargeting{}, err
	}
	return AdminTargeting{
		CityCodes:        cities,
		ServiceAreaCodes: areas,
		AudienceSegments: audiences,
	}, nil
}

func normalizeHomeTargetValues(label string, values []string, allowed map[string]struct{}) ([]string, error) {
	unique := make(map[string]struct{}, len(values))
	for _, raw := range values {
		value := strings.TrimSpace(raw)
		if value == "" {
			continue
		}
		if !homeTargetCodePattern.MatchString(value) {
			return nil, fmt.Errorf("invalid %s", label)
		}
		if allowed != nil {
			if _, ok := allowed[value]; !ok {
				return nil, fmt.Errorf("invalid %s", label)
			}
		}
		unique[value] = struct{}{}
	}
	result := make([]string, 0, len(unique))
	for value := range unique {
		result = append(result, value)
	}
	sort.Strings(result)
	return result, nil
}
