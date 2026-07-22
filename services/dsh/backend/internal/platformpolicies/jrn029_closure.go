package platformpolicies

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"strings"
	"time"
)

const (
	FulfillmentModeBthwaniDelivery = "bthwani_delivery"
	FulfillmentModePartnerDelivery = "partner_delivery"
	FulfillmentModeClientPickup    = "client_pickup"
)

var validFulfillmentModes = map[string]bool{
	FulfillmentModeBthwaniDelivery: true,
	FulfillmentModePartnerDelivery: true,
	FulfillmentModeClientPickup:    true,
}

type DeliveryModePolicy struct {
	ID              string    `json:"id"`
	ZoneID          string    `json:"zoneId"`
	FulfillmentMode string    `json:"fulfillmentMode"`
	IsEnabled       bool      `json:"isEnabled"`
	SlaCategory     string    `json:"slaCategory"`
	Version         int       `json:"version"`
	UpdatedBy       string    `json:"updatedBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type UpsertDeliveryModePolicyInput struct {
	ZoneID          string `json:"zoneId"`
	FulfillmentMode string `json:"fulfillmentMode"`
	IsEnabled       bool   `json:"isEnabled"`
	SlaCategory     string `json:"slaCategory"`
	ExpectedVersion int    `json:"expectedVersion"`
}

type OperationalSLA struct {
	Configured        bool   `json:"configured"`
	RuleID            string `json:"ruleId,omitempty"`
	Category          string `json:"category,omitempty"`
	MaxPrepMins       int    `json:"maxPrepMins,omitempty"`
	MaxAssignmentMins int    `json:"maxAssignmentMins,omitempty"`
	MaxDeliveryMins   int    `json:"maxDeliveryMins,omitempty"`
	Version           int    `json:"version,omitempty"`
}

type OperationalCapacity struct {
	Configured         bool    `json:"configured"`
	ConfigID           string  `json:"configId,omitempty"`
	MaxConcurrentOrders int    `json:"maxConcurrentOrders,omitempty"`
	MaxCaptainsOnline   int    `json:"maxCaptainsOnline,omitempty"`
	ThrottleThreshold   float64 `json:"throttleThreshold,omitempty"`
	IsPaused            bool    `json:"isPaused"`
	PauseReason         string  `json:"pauseReason,omitempty"`
	Version             int     `json:"version,omitempty"`
}

type OperationalEffects struct {
	CartAllowed            bool `json:"cartAllowed"`
	CheckoutAllowed        bool `json:"checkoutAllowed"`
	OrderCreationAllowed   bool `json:"orderCreationAllowed"`
	DispatchAllowed        bool `json:"dispatchAllowed"`
	PartnerHandoffRequired bool `json:"partnerHandoffRequired"`
	ClientPickupRequired   bool `json:"clientPickupRequired"`
}

type OperationalDecision struct {
	ZoneID             string                 `json:"zoneId"`
	ServiceAreaCode    string                 `json:"serviceAreaCode"`
	FulfillmentMode    string                 `json:"fulfillmentMode"`
	Decision           string                 `json:"decision"`
	Serviceable        bool                   `json:"serviceable"`
	ReasonCodes        []string               `json:"reasonCodes"`
	AllowedActions     []string               `json:"allowedActions"`
	ActiveStores       int                    `json:"activeStores"`
	PressureRatio      float64                `json:"pressureRatio"`
	SLA                OperationalSLA         `json:"sla"`
	Capacity           OperationalCapacity    `json:"capacity"`
	ModePolicy         *DeliveryModePolicy    `json:"modePolicy,omitempty"`
	Effects            OperationalEffects     `json:"effects"`
	PolicyVersions     map[string]int         `json:"policyVersions"`
	EvaluatedAt        time.Time              `json:"evaluatedAt"`
}

type OperationalEvaluationInput struct {
	ZoneID          string `json:"zoneId"`
	ServiceAreaCode string `json:"serviceAreaCode"`
	FulfillmentMode string `json:"fulfillmentMode"`
	SlaCategory     string `json:"slaCategory"`
	ActiveOrders    int    `json:"activeOrders"`
	CaptainsOnline  int    `json:"captainsOnline"`
}

type operationalSnapshot struct {
	Zone            Zone
	ActiveStores    int
	SLA             OperationalSLA
	Capacity        OperationalCapacity
	ModePolicy      *DeliveryModePolicy
	Input           OperationalEvaluationInput
}

type PolicyAuditEvent struct {
	ID             string          `json:"id"`
	AggregateType  string          `json:"aggregateType"`
	AggregateID    string          `json:"aggregateId"`
	Action         string          `json:"action"`
	ActorID        string          `json:"actorId"`
	ActorSurface   string          `json:"actorSurface"`
	CorrelationID  string          `json:"correlationId,omitempty"`
	Reason         string          `json:"reason"`
	FromVersion    *int            `json:"fromVersion,omitempty"`
	ToVersion      int             `json:"toVersion"`
	Payload        json.RawMessage `json:"payload"`
	CreatedAt      time.Time       `json:"createdAt"`
}

type RollbackPolicyInput struct {
	EventID               string `json:"eventId"`
	ExpectedCurrentVersion int    `json:"expectedCurrentVersion"`
}

type RollbackResult struct {
	TargetEventID  string `json:"targetEventId"`
	AggregateType string `json:"aggregateType"`
	AggregateID   string `json:"aggregateId"`
	FromVersion   int    `json:"fromVersion"`
	ToVersion     int    `json:"toVersion"`
}

func ListDeliveryModePolicies(ctx context.Context, db *sql.DB, zoneID string) ([]DeliveryModePolicy, error) {
	zoneID = strings.TrimSpace(zoneID)
	if zoneID == "" {
		return nil, ErrInvalid
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, zone_id, fulfillment_mode, is_enabled, sla_category,
		       version, updated_by, created_at, updated_at
		FROM dsh_platform_delivery_mode_policies
		WHERE zone_id = $1
		ORDER BY fulfillment_mode`, zoneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []DeliveryModePolicy{}
	for rows.Next() {
		var item DeliveryModePolicy
		if err := rows.Scan(
			&item.ID,
			&item.ZoneID,
			&item.FulfillmentMode,
			&item.IsEnabled,
			&item.SlaCategory,
			&item.Version,
			&item.UpdatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func UpsertDeliveryModePolicy(
	ctx context.Context,
	db *sql.DB,
	input UpsertDeliveryModePolicyInput,
	mutation MutationContext,
) (DeliveryModePolicy, error) {
	input.ZoneID = strings.TrimSpace(input.ZoneID)
	input.FulfillmentMode = strings.ToLower(strings.TrimSpace(input.FulfillmentMode))
	input.SlaCategory = strings.ToLower(strings.TrimSpace(input.SlaCategory))
	if input.SlaCategory == "" {
		input.SlaCategory = "default"
	}
	if input.ZoneID == "" || !validFulfillmentModes[input.FulfillmentMode] ||
		len(input.SlaCategory) > 120 || input.ExpectedVersion < 0 || !validMutation(mutation) {
		return DeliveryModePolicy{}, ErrInvalid
	}

	operation := "upsert-delivery-mode:" + input.ZoneID + ":" + input.FulfillmentMode
	return withIdempotency(ctx, db, mutation, operation, input, func(tx *sql.Tx) (DeliveryModePolicy, error) {
		var before DeliveryModePolicy
		err := tx.QueryRowContext(ctx, `
			SELECT id, zone_id, fulfillment_mode, is_enabled, sla_category,
			       version, updated_by, created_at, updated_at
			FROM dsh_platform_delivery_mode_policies
			WHERE zone_id = $1 AND fulfillment_mode = $2
			FOR UPDATE`, input.ZoneID, input.FulfillmentMode).Scan(
			&before.ID, &before.ZoneID, &before.FulfillmentMode, &before.IsEnabled,
			&before.SlaCategory, &before.Version, &before.UpdatedBy,
			&before.CreatedAt, &before.UpdatedAt,
		)

		var item DeliveryModePolicy
		action := "created"
		var fromVersion any
		if errors.Is(err, sql.ErrNoRows) {
			if input.ExpectedVersion != 0 {
				return item, ErrVersionConflict
			}
			err = tx.QueryRowContext(ctx, `
				INSERT INTO dsh_platform_delivery_mode_policies
					(zone_id, fulfillment_mode, is_enabled, sla_category, updated_by)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id, zone_id, fulfillment_mode, is_enabled, sla_category,
				          version, updated_by, created_at, updated_at`,
				input.ZoneID, input.FulfillmentMode, input.IsEnabled,
				input.SlaCategory, mutation.ActorID,
			).Scan(
				&item.ID, &item.ZoneID, &item.FulfillmentMode, &item.IsEnabled,
				&item.SlaCategory, &item.Version, &item.UpdatedBy,
				&item.CreatedAt, &item.UpdatedAt,
			)
			fromVersion = nil
		} else if err != nil {
			return item, err
		} else {
			if before.Version != input.ExpectedVersion {
				return item, ErrVersionConflict
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_delivery_mode_policies
				SET is_enabled = $3, sla_category = $4, updated_by = $5,
				    version = version + 1, updated_at = NOW()
				WHERE zone_id = $1 AND fulfillment_mode = $2
				RETURNING id, zone_id, fulfillment_mode, is_enabled, sla_category,
				          version, updated_by, created_at, updated_at`,
				input.ZoneID, input.FulfillmentMode, input.IsEnabled,
				input.SlaCategory, mutation.ActorID,
			).Scan(
				&item.ID, &item.ZoneID, &item.FulfillmentMode, &item.IsEnabled,
				&item.SlaCategory, &item.Version, &item.UpdatedBy,
				&item.CreatedAt, &item.UpdatedAt,
			)
			action = "updated"
			if before.IsEnabled != item.IsEnabled {
				if item.IsEnabled {
					action = "activated"
				} else {
					action = "deactivated"
				}
			}
			fromVersion = before.Version
		}
		if err != nil {
			return item, err
		}
		if err := insertEvent(ctx, tx, "delivery_mode", item.ID, action, mutation, fromVersion, item.Version, item); err != nil {
			return item, err
		}
		return item, nil
	})
}

func EvaluateOperationalPolicy(
	ctx context.Context,
	db *sql.DB,
	input OperationalEvaluationInput,
) (OperationalDecision, error) {
	input.ZoneID = strings.TrimSpace(input.ZoneID)
	input.ServiceAreaCode = strings.ToLower(strings.TrimSpace(input.ServiceAreaCode))
	input.FulfillmentMode = strings.ToLower(strings.TrimSpace(input.FulfillmentMode))
	input.SlaCategory = strings.ToLower(strings.TrimSpace(input.SlaCategory))
	if input.SlaCategory == "" {
		input.SlaCategory = "default"
	}
	if input.ZoneID == "" || !validFulfillmentModes[input.FulfillmentMode] ||
		input.ActiveOrders < 0 || input.CaptainsOnline < 0 {
		return OperationalDecision{}, ErrInvalid
	}

	var snapshot operationalSnapshot
	snapshot.Input = input
	err := db.QueryRowContext(ctx, `
		SELECT id, name, city_code, is_active, description, version, created_at, updated_at
		FROM dsh_platform_zones
		WHERE id = $1`, input.ZoneID).Scan(
		&snapshot.Zone.ID, &snapshot.Zone.Name, &snapshot.Zone.CityCode,
		&snapshot.Zone.IsActive, &snapshot.Zone.Description, &snapshot.Zone.Version,
		&snapshot.Zone.CreatedAt, &snapshot.Zone.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return OperationalDecision{}, ErrNotFound
	}
	if err != nil {
		return OperationalDecision{}, err
	}

	_ = db.QueryRowContext(ctx, `
		SELECT id, category, max_prep_mins, max_assignment_mins,
		       max_delivery_mins, version
		FROM dsh_platform_sla_rules
		WHERE zone_id = $1 AND category IN ($2, 'default')
		ORDER BY CASE WHEN category = $2 THEN 0 ELSE 1 END
		LIMIT 1`, input.ZoneID, input.SlaCategory).Scan(
		&snapshot.SLA.RuleID, &snapshot.SLA.Category, &snapshot.SLA.MaxPrepMins,
		&snapshot.SLA.MaxAssignmentMins, &snapshot.SLA.MaxDeliveryMins,
		&snapshot.SLA.Version,
	)
	snapshot.SLA.Configured = snapshot.SLA.RuleID != ""

	_ = db.QueryRowContext(ctx, `
		SELECT id, max_concurrent_orders, max_captains_online,
		       throttle_threshold, is_paused, pause_reason, version
		FROM dsh_platform_capacity_configs
		WHERE zone_id = $1`, input.ZoneID).Scan(
		&snapshot.Capacity.ConfigID, &snapshot.Capacity.MaxConcurrentOrders,
		&snapshot.Capacity.MaxCaptainsOnline, &snapshot.Capacity.ThrottleThreshold,
		&snapshot.Capacity.IsPaused, &snapshot.Capacity.PauseReason,
		&snapshot.Capacity.Version,
	)
	snapshot.Capacity.Configured = snapshot.Capacity.ConfigID != ""

	var mode DeliveryModePolicy
	_ = db.QueryRowContext(ctx, `
		SELECT id, zone_id, fulfillment_mode, is_enabled, sla_category,
		       version, updated_by, created_at, updated_at
		FROM dsh_platform_delivery_mode_policies
		WHERE zone_id = $1 AND fulfillment_mode = $2`,
		input.ZoneID, input.FulfillmentMode,
	).Scan(
		&mode.ID, &mode.ZoneID, &mode.FulfillmentMode, &mode.IsEnabled,
		&mode.SlaCategory, &mode.Version, &mode.UpdatedBy,
		&mode.CreatedAt, &mode.UpdatedAt,
	)
	if mode.ID != "" {
		snapshot.ModePolicy = &mode
	}

	serviceability, serviceabilityErr := GetZoneServiceability(ctx, db, input.ZoneID)
	if serviceabilityErr == nil {
		snapshot.ActiveStores = serviceability.ActiveStores
	}
	return BuildOperationalDecision(snapshot), nil
}

func BuildOperationalDecision(snapshot operationalSnapshot) OperationalDecision {
	input := snapshot.Input
	decision := OperationalDecision{
		ZoneID:          snapshot.Zone.ID,
		ServiceAreaCode: snapshot.Zone.CityCode,
		FulfillmentMode: input.FulfillmentMode,
		Decision:        "serviceable",
		Serviceable:     true,
		ReasonCodes:     []string{},
		AllowedActions:  []string{"add_to_cart", "checkout", "create_order"},
		ActiveStores:    snapshot.ActiveStores,
		SLA:             snapshot.SLA,
		Capacity:        snapshot.Capacity,
		ModePolicy:      snapshot.ModePolicy,
		PolicyVersions: map[string]int{
			"zone": snapshot.Zone.Version,
			"sla": snapshot.SLA.Version,
			"capacity": snapshot.Capacity.Version,
		},
		EvaluatedAt: time.Now().UTC(),
	}
	if snapshot.ModePolicy != nil {
		decision.PolicyVersions["deliveryMode"] = snapshot.ModePolicy.Version
	}
	if snapshot.Capacity.Configured && snapshot.Capacity.MaxConcurrentOrders > 0 {
		decision.PressureRatio = math.Round((float64(input.ActiveOrders)/float64(snapshot.Capacity.MaxConcurrentOrders))*10000) / 10000
	}

	deny := func(code string, state string) {
		decision.Serviceable = false
		decision.Decision = state
		decision.ReasonCodes = append(decision.ReasonCodes, code)
		decision.AllowedActions = []string{"refresh_policy", "change_fulfillment_or_location"}
	}

	switch {
	case !snapshot.Zone.IsActive:
		deny("ZONE_INACTIVE", "unserviceable")
	case input.ServiceAreaCode != "" && input.ServiceAreaCode != strings.ToLower(snapshot.Zone.CityCode):
		deny("SERVICE_AREA_MISMATCH", "unserviceable")
	case snapshot.ActiveStores < 1:
		deny("NO_ACTIVE_STORES", "unserviceable")
	case !snapshot.SLA.Configured:
		deny("SLA_NOT_CONFIGURED", "policy_incomplete")
	case !snapshot.Capacity.Configured:
		deny("CAPACITY_NOT_CONFIGURED", "policy_incomplete")
	case snapshot.Capacity.IsPaused:
		deny("ZONE_CAPACITY_PAUSED", "paused")
	case snapshot.ModePolicy == nil:
		deny("FULFILLMENT_MODE_NOT_CONFIGURED", "policy_incomplete")
	case !snapshot.ModePolicy.IsEnabled:
		deny("FULFILLMENT_MODE_DISABLED", "mode_disabled")
	case input.ActiveOrders >= snapshot.Capacity.MaxConcurrentOrders:
		deny("CAPACITY_EXHAUSTED", "capacity_exhausted")
	case decision.PressureRatio >= snapshot.Capacity.ThrottleThreshold:
		deny("CAPACITY_THROTTLED", "throttled")
	}

	decision.Effects = OperationalEffects{
		CartAllowed:            decision.Serviceable,
		CheckoutAllowed:        decision.Serviceable,
		OrderCreationAllowed:   decision.Serviceable,
		DispatchAllowed:        decision.Serviceable && input.FulfillmentMode != FulfillmentModeClientPickup,
		PartnerHandoffRequired: decision.Serviceable && input.FulfillmentMode == FulfillmentModePartnerDelivery,
		ClientPickupRequired:   decision.Serviceable && input.FulfillmentMode == FulfillmentModeClientPickup,
	}
	if decision.Serviceable {
		switch input.FulfillmentMode {
		case FulfillmentModeBthwaniDelivery:
			decision.AllowedActions = append(decision.AllowedActions, "dispatch_bthwani_captain")
		case FulfillmentModePartnerDelivery:
			decision.AllowedActions = append(decision.AllowedActions, "handoff_to_partner_delivery")
		case FulfillmentModeClientPickup:
			decision.AllowedActions = append(decision.AllowedActions, "prepare_client_pickup")
		}
	}
	return decision
}

func ListPolicyAuditEvents(ctx context.Context, db *sql.DB, aggregateType string, aggregateID string, limit int) ([]PolicyAuditEvent, error) {
	aggregateType = strings.TrimSpace(aggregateType)
	aggregateID = strings.TrimSpace(aggregateID)
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	args := []any{}
	clauses := []string{}
	if aggregateType != "" {
		args = append(args, aggregateType)
		clauses = append(clauses, "aggregate_type = $"+itoa(len(args)))
	}
	if aggregateID != "" {
		args = append(args, aggregateID)
		clauses = append(clauses, "aggregate_id = $"+itoa(len(args)))
	}
	args = append(args, limit)
	query := `
		SELECT id, aggregate_type, aggregate_id, action, actor_id, actor_surface,
		       COALESCE(correlation_id, ''), reason, from_version, to_version,
		       payload, created_at
		FROM dsh_platform_policy_events`
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY created_at DESC, id DESC LIMIT $" + itoa(len(args))
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []PolicyAuditEvent{}
	for rows.Next() {
		var item PolicyAuditEvent
		var fromVersion sql.NullInt64
		if err := rows.Scan(
			&item.ID, &item.AggregateType, &item.AggregateID, &item.Action,
			&item.ActorID, &item.ActorSurface, &item.CorrelationID, &item.Reason,
			&fromVersion, &item.ToVersion, &item.Payload, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if fromVersion.Valid {
			value := int(fromVersion.Int64)
			item.FromVersion = &value
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func RollbackPolicyEvent(
	ctx context.Context,
	db *sql.DB,
	input RollbackPolicyInput,
	mutation MutationContext,
) (RollbackResult, error) {
	input.EventID = strings.TrimSpace(input.EventID)
	if len(input.EventID) < 8 || input.ExpectedCurrentVersion < 1 || !validMutation(mutation) {
		return RollbackResult{}, ErrInvalid
	}
	return withIdempotency(ctx, db, mutation, "rollback-policy:"+input.EventID, input, func(tx *sql.Tx) (RollbackResult, error) {
		var event PolicyAuditEvent
		err := tx.QueryRowContext(ctx, `
			SELECT id, aggregate_type, aggregate_id, payload, to_version
			FROM dsh_platform_policy_events
			WHERE id = $1`, input.EventID).Scan(
			&event.ID, &event.AggregateType, &event.AggregateID, &event.Payload, &event.ToVersion,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return RollbackResult{}, ErrNotFound
		}
		if err != nil {
			return RollbackResult{}, err
		}

		result := RollbackResult{
			TargetEventID: event.ID,
			AggregateType: event.AggregateType,
			AggregateID: event.AggregateID,
			FromVersion: input.ExpectedCurrentVersion,
		}
		var restored any
		switch event.AggregateType {
		case "zone":
			var snapshot Zone
			if err := json.Unmarshal(event.Payload, &snapshot); err != nil {
				return result, ErrInvalid
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_zones
				SET name = $2, city_code = $3, is_active = $4, description = $5,
				    version = version + 1, updated_at = NOW()
				WHERE id = $1 AND version = $6
				RETURNING version`, event.AggregateID, snapshot.Name, snapshot.CityCode,
				snapshot.IsActive, snapshot.Description, input.ExpectedCurrentVersion,
			).Scan(&result.ToVersion)
			restored = snapshot
		case "sla_rule":
			var snapshot struct {
				SlaRule
				MaxAssignmentMins int `json:"maxAssignmentMins"`
			}
			if err := json.Unmarshal(event.Payload, &snapshot); err != nil {
				return result, ErrInvalid
			}
			if snapshot.MaxAssignmentMins < 1 {
				snapshot.MaxAssignmentMins = 10
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_sla_rules
				SET category = $2, max_prep_mins = $3, max_assignment_mins = $4,
				    max_delivery_mins = $5, updated_by = $6,
				    version = version + 1, updated_at = NOW()
				WHERE id = $1 AND version = $7
				RETURNING version`, event.AggregateID, snapshot.Category,
				snapshot.MaxPrepMins, snapshot.MaxAssignmentMins,
				snapshot.MaxDeliveryMins, mutation.ActorID, input.ExpectedCurrentVersion,
			).Scan(&result.ToVersion)
			restored = snapshot
		case "capacity_config":
			var snapshot struct {
				CapacityConfig
				IsPaused    bool   `json:"isPaused"`
				PauseReason string `json:"pauseReason"`
			}
			if err := json.Unmarshal(event.Payload, &snapshot); err != nil {
				return result, ErrInvalid
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_capacity_configs
				SET max_concurrent_orders = $2, max_captains_online = $3,
				    throttle_threshold = $4, is_paused = $5, pause_reason = $6,
				    updated_by = $7, version = version + 1, updated_at = NOW()
				WHERE id = $1 AND version = $8
				RETURNING version`, event.AggregateID, snapshot.MaxConcurrentOrders,
				snapshot.MaxCaptainsOnline, snapshot.ThrottleThreshold,
				snapshot.IsPaused, snapshot.PauseReason, mutation.ActorID,
				input.ExpectedCurrentVersion,
			).Scan(&result.ToVersion)
			restored = snapshot
		case "delivery_mode":
			var snapshot DeliveryModePolicy
			if err := json.Unmarshal(event.Payload, &snapshot); err != nil {
				return result, ErrInvalid
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_delivery_mode_policies
				SET is_enabled = $2, sla_category = $3, updated_by = $4,
				    version = version + 1, updated_at = NOW()
				WHERE id = $1 AND version = $5
				RETURNING version`, event.AggregateID, snapshot.IsEnabled,
				snapshot.SlaCategory, mutation.ActorID, input.ExpectedCurrentVersion,
			).Scan(&result.ToVersion)
			restored = snapshot
		case "store_onboarding_fee":
			var snapshot StoreOnboardingFeePolicy
			if err := json.Unmarshal(event.Payload, &snapshot); err != nil {
				return result, ErrInvalid
			}
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_store_onboarding_fee_policy
				SET enabled = $1, amount = $2, currency = $3, applies_to = $4,
				    charge_timing = $5, effective_from = $6, notes = $7,
				    updated_by = $8, version = version + 1, updated_at = NOW()
				WHERE id = 1 AND version = $9
				RETURNING version`, snapshot.Enabled, snapshot.Amount, snapshot.Currency,
				snapshot.AppliesTo, snapshot.ChargeTiming, snapshot.EffectiveFrom,
				snapshot.Notes, mutation.ActorID, input.ExpectedCurrentVersion,
			).Scan(&result.ToVersion)
			restored = snapshot
		default:
			return result, ErrInvalid
		}
		if errors.Is(err, sql.ErrNoRows) {
			return result, ErrVersionConflict
		}
		if err != nil {
			return result, err
		}
		if err := insertEvent(ctx, tx, event.AggregateType, event.AggregateID, "rolled_back", mutation, result.FromVersion, result.ToVersion, restored); err != nil {
			return result, err
		}
		return result, nil
	})
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}
	digits := [20]byte{}
	index := len(digits)
	for value > 0 {
		index--
		digits[index] = byte('0' + value%10)
		value /= 10
	}
	return string(digits[index:])
}
