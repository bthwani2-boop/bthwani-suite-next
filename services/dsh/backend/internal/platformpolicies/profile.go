package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

type OperationalProfile struct {
	ZoneID   string              `json:"zoneId"`
	SLA      OperationalSLA      `json:"sla"`
	Capacity OperationalCapacity `json:"capacity"`
}

type UpsertOperationalProfileInput struct {
	ZoneID                  string  `json:"zoneId"`
	SlaCategory             string  `json:"slaCategory"`
	MaxPrepMins             int     `json:"maxPrepMins"`
	MaxAssignmentMins       int     `json:"maxAssignmentMins"`
	MaxDeliveryMins         int     `json:"maxDeliveryMins"`
	ExpectedSlaVersion      int     `json:"expectedSlaVersion"`
	MaxConcurrentOrders     int     `json:"maxConcurrentOrders"`
	MaxCaptainsOnline       int     `json:"maxCaptainsOnline"`
	ThrottleThreshold       float64 `json:"throttleThreshold"`
	IsPaused                bool    `json:"isPaused"`
	PauseReason             string  `json:"pauseReason"`
	ExpectedCapacityVersion int     `json:"expectedCapacityVersion"`
}

func GetOperationalProfile(ctx context.Context, db *sql.DB, zoneID string, category string) (OperationalProfile, error) {
	zoneID = strings.TrimSpace(zoneID)
	category = strings.ToLower(strings.TrimSpace(category))
	if category == "" {
		category = "default"
	}
	if zoneID == "" {
		return OperationalProfile{}, ErrInvalid
	}
	var profile OperationalProfile
	profile.ZoneID = zoneID
	_ = db.QueryRowContext(ctx, `
		SELECT id, category, max_prep_mins, max_assignment_mins,
		       max_delivery_mins, version
		FROM dsh_platform_sla_rules
		WHERE zone_id = $1 AND category IN ($2, 'default')
		ORDER BY CASE WHEN category = $2 THEN 0 ELSE 1 END
		LIMIT 1`, zoneID, category).Scan(
		&profile.SLA.RuleID,
		&profile.SLA.Category,
		&profile.SLA.MaxPrepMins,
		&profile.SLA.MaxAssignmentMins,
		&profile.SLA.MaxDeliveryMins,
		&profile.SLA.Version,
	)
	profile.SLA.Configured = profile.SLA.RuleID != ""
	_ = db.QueryRowContext(ctx, `
		SELECT id, max_concurrent_orders, max_captains_online,
		       throttle_threshold, is_paused, pause_reason, version
		FROM dsh_platform_capacity_configs
		WHERE zone_id = $1`, zoneID).Scan(
		&profile.Capacity.ConfigID,
		&profile.Capacity.MaxConcurrentOrders,
		&profile.Capacity.MaxCaptainsOnline,
		&profile.Capacity.ThrottleThreshold,
		&profile.Capacity.IsPaused,
		&profile.Capacity.PauseReason,
		&profile.Capacity.Version,
	)
	profile.Capacity.Configured = profile.Capacity.ConfigID != ""
	return profile, nil
}

func UpsertOperationalProfile(
	ctx context.Context,
	db *sql.DB,
	input UpsertOperationalProfileInput,
	mutation MutationContext,
) (OperationalProfile, error) {
	input.ZoneID = strings.TrimSpace(input.ZoneID)
	input.SlaCategory = strings.ToLower(strings.TrimSpace(input.SlaCategory))
	input.PauseReason = strings.TrimSpace(input.PauseReason)
	if input.SlaCategory == "" {
		input.SlaCategory = "default"
	}
	if input.ZoneID == "" || len(input.SlaCategory) > 120 ||
		input.MaxPrepMins < 1 || input.MaxPrepMins > 1440 ||
		input.MaxAssignmentMins < 1 || input.MaxAssignmentMins > 1440 ||
		input.MaxDeliveryMins < 1 || input.MaxDeliveryMins > 1440 ||
		input.ExpectedSlaVersion < 0 || input.MaxConcurrentOrders < 1 ||
		input.MaxCaptainsOnline < 0 || input.ThrottleThreshold < 0 ||
		input.ThrottleThreshold > 1 || input.ExpectedCapacityVersion < 0 ||
		len(input.PauseReason) > 500 || (input.IsPaused && len(input.PauseReason) < 3) ||
		!validMutation(mutation) {
		return OperationalProfile{}, ErrInvalid
	}
	if !input.IsPaused {
		input.PauseReason = ""
	}

	return withIdempotency(ctx, db, mutation, "upsert-operational-profile:"+input.ZoneID+":"+input.SlaCategory, input, func(tx *sql.Tx) (OperationalProfile, error) {
		if err := ensureZoneExists(ctx, tx, input.ZoneID); err != nil {
			return OperationalProfile{}, err
		}
		sla, err := upsertOperationalSLA(ctx, tx, input, mutation)
		if err != nil {
			return OperationalProfile{}, err
		}
		capacity, err := upsertOperationalCapacity(ctx, tx, input, mutation)
		if err != nil {
			return OperationalProfile{}, err
		}
		return OperationalProfile{ZoneID: input.ZoneID, SLA: sla, Capacity: capacity}, nil
	})
}

func ensureZoneExists(ctx context.Context, tx *sql.Tx, zoneID string) error {
	var exists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_platform_zones WHERE id = $1)`, zoneID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func upsertOperationalSLA(
	ctx context.Context,
	tx *sql.Tx,
	input UpsertOperationalProfileInput,
	mutation MutationContext,
) (OperationalSLA, error) {
	var before OperationalSLA
	err := tx.QueryRowContext(ctx, `
		SELECT id, category, max_prep_mins, max_assignment_mins,
		       max_delivery_mins, version
		FROM dsh_platform_sla_rules
		WHERE zone_id = $1 AND category = $2
		FOR UPDATE`, input.ZoneID, input.SlaCategory).Scan(
		&before.RuleID,
		&before.Category,
		&before.MaxPrepMins,
		&before.MaxAssignmentMins,
		&before.MaxDeliveryMins,
		&before.Version,
	)
	var item OperationalSLA
	action := "created"
	var fromVersion any
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedSlaVersion != 0 {
			return item, ErrVersionConflict
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_platform_sla_rules
				(zone_id, category, max_prep_mins, max_assignment_mins,
				 max_delivery_mins, updated_by)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, category, max_prep_mins, max_assignment_mins,
			          max_delivery_mins, version`,
			input.ZoneID,
			input.SlaCategory,
			input.MaxPrepMins,
			input.MaxAssignmentMins,
			input.MaxDeliveryMins,
			mutation.ActorID,
		).Scan(
			&item.RuleID,
			&item.Category,
			&item.MaxPrepMins,
			&item.MaxAssignmentMins,
			&item.MaxDeliveryMins,
			&item.Version,
		)
		fromVersion = nil
	} else if err != nil {
		return item, err
	} else {
		if before.Version != input.ExpectedSlaVersion {
			return item, ErrVersionConflict
		}
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_platform_sla_rules
			SET max_prep_mins = $3, max_assignment_mins = $4,
			    max_delivery_mins = $5, updated_by = $6,
			    version = version + 1, updated_at = NOW()
			WHERE zone_id = $1 AND category = $2
			RETURNING id, category, max_prep_mins, max_assignment_mins,
			          max_delivery_mins, version`,
			input.ZoneID,
			input.SlaCategory,
			input.MaxPrepMins,
			input.MaxAssignmentMins,
			input.MaxDeliveryMins,
			mutation.ActorID,
		).Scan(
			&item.RuleID,
			&item.Category,
			&item.MaxPrepMins,
			&item.MaxAssignmentMins,
			&item.MaxDeliveryMins,
			&item.Version,
		)
		action = "updated"
		fromVersion = before.Version
	}
	if err != nil {
		return item, err
	}
	item.Configured = true
	payload := map[string]any{
		"id":                item.RuleID,
		"zoneId":            input.ZoneID,
		"category":          item.Category,
		"maxPrepMins":       item.MaxPrepMins,
		"maxAssignmentMins": item.MaxAssignmentMins,
		"maxDeliveryMins":   item.MaxDeliveryMins,
		"version":           item.Version,
	}
	if err := insertEvent(ctx, tx, "sla_rule", item.RuleID, action, mutation, fromVersion, item.Version, payload); err != nil {
		return item, err
	}
	return item, nil
}

func upsertOperationalCapacity(
	ctx context.Context,
	tx *sql.Tx,
	input UpsertOperationalProfileInput,
	mutation MutationContext,
) (OperationalCapacity, error) {
	var before OperationalCapacity
	err := tx.QueryRowContext(ctx, `
		SELECT id, max_concurrent_orders, max_captains_online,
		       throttle_threshold, is_paused, pause_reason, version
		FROM dsh_platform_capacity_configs
		WHERE zone_id = $1
		FOR UPDATE`, input.ZoneID).Scan(
		&before.ConfigID,
		&before.MaxConcurrentOrders,
		&before.MaxCaptainsOnline,
		&before.ThrottleThreshold,
		&before.IsPaused,
		&before.PauseReason,
		&before.Version,
	)
	var item OperationalCapacity
	action := "created"
	var fromVersion any
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedCapacityVersion != 0 {
			return item, ErrVersionConflict
		}
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_platform_capacity_configs
				(zone_id, max_concurrent_orders, max_captains_online,
				 throttle_threshold, is_paused, pause_reason, updated_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, max_concurrent_orders, max_captains_online,
			          throttle_threshold, is_paused, pause_reason, version`,
			input.ZoneID,
			input.MaxConcurrentOrders,
			input.MaxCaptainsOnline,
			input.ThrottleThreshold,
			input.IsPaused,
			input.PauseReason,
			mutation.ActorID,
		).Scan(
			&item.ConfigID,
			&item.MaxConcurrentOrders,
			&item.MaxCaptainsOnline,
			&item.ThrottleThreshold,
			&item.IsPaused,
			&item.PauseReason,
			&item.Version,
		)
		fromVersion = nil
	} else if err != nil {
		return item, err
	} else {
		if before.Version != input.ExpectedCapacityVersion {
			return item, ErrVersionConflict
		}
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_platform_capacity_configs
			SET max_concurrent_orders = $2, max_captains_online = $3,
			    throttle_threshold = $4, is_paused = $5, pause_reason = $6,
			    updated_by = $7, version = version + 1, updated_at = NOW()
			WHERE zone_id = $1
			RETURNING id, max_concurrent_orders, max_captains_online,
			          throttle_threshold, is_paused, pause_reason, version`,
			input.ZoneID,
			input.MaxConcurrentOrders,
			input.MaxCaptainsOnline,
			input.ThrottleThreshold,
			input.IsPaused,
			input.PauseReason,
			mutation.ActorID,
		).Scan(
			&item.ConfigID,
			&item.MaxConcurrentOrders,
			&item.MaxCaptainsOnline,
			&item.ThrottleThreshold,
			&item.IsPaused,
			&item.PauseReason,
			&item.Version,
		)
		action = "updated"
		if before.IsPaused != item.IsPaused {
			if item.IsPaused {
				action = "deactivated"
			} else {
				action = "activated"
			}
		}
		fromVersion = before.Version
	}
	if err != nil {
		return item, err
	}
	item.Configured = true
	payload := map[string]any{
		"id":                  item.ConfigID,
		"zoneId":              input.ZoneID,
		"maxConcurrentOrders": item.MaxConcurrentOrders,
		"maxCaptainsOnline":   item.MaxCaptainsOnline,
		"throttleThreshold":   item.ThrottleThreshold,
		"isPaused":            item.IsPaused,
		"pauseReason":         item.PauseReason,
		"version":             item.Version,
	}
	if err := insertEvent(ctx, tx, "capacity_config", item.ConfigID, action, mutation, fromVersion, item.Version, payload); err != nil {
		return item, err
	}
	return item, nil
}
