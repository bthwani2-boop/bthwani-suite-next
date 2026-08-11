package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// NormalizeFulfillmentMode maps compatibility values used by older DSH
// checkout and pickup paths to the canonical fulfillment vocabulary.
func NormalizeFulfillmentMode(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return FulfillmentModeBthwaniDelivery, nil
	}
	switch value {
	case FulfillmentModeBthwaniDelivery:
		return FulfillmentModeBthwaniDelivery, nil
	case FulfillmentModePartnerDelivery:
		return FulfillmentModePartnerDelivery, nil
	case "pickup", FulfillmentModeClientPickup:
		return FulfillmentModeClientPickup, nil
	default:
		return "", ErrInvalid
	}
}

// resolveOperationalZoneForStore binds a store to exactly one governed
// operational zone through the store's canonical service_area_code. The
// platform-zones city_code column is the legacy persisted name for that
// service-area binding. Ambiguous bindings are configuration corruption and
// must fail closed instead of selecting an arbitrary zone by timestamp.
func resolveOperationalZoneForStore(
	ctx context.Context,
	db *sql.DB,
	storeID string,
) (string, string, error) {
	var serviceAreaCode string
	err := db.QueryRowContext(ctx, `
		SELECT COALESCE(service_area_code, '')
		FROM dsh_stores
		WHERE id = $1`, storeID).Scan(&serviceAreaCode)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", ErrNotFound
	}
	if err != nil {
		return "", "", err
	}
	serviceAreaCode = strings.ToLower(strings.TrimSpace(serviceAreaCode))
	if serviceAreaCode == "" {
		return "", "", ErrNotFound
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id::text
		FROM dsh_platform_zones
		WHERE LOWER(city_code) = LOWER($1)
		ORDER BY id`, serviceAreaCode)
	if err != nil {
		return "", "", err
	}
	defer rows.Close()

	zoneIDs := make([]string, 0, 2)
	for rows.Next() {
		var zoneID string
		if err := rows.Scan(&zoneID); err != nil {
			return "", "", err
		}
		zoneIDs = append(zoneIDs, zoneID)
		if len(zoneIDs) > 1 {
			return "", "", fmt.Errorf("ambiguous operational zone mapping for service area %q", serviceAreaCode)
		}
	}
	if err := rows.Err(); err != nil {
		return "", "", err
	}
	if len(zoneIDs) == 0 {
		return "", "", ErrNotFound
	}
	return zoneIDs[0], serviceAreaCode, nil
}

// EvaluateOperationalPolicyForStoreSnapshot is the single store-level policy
// resolver used by mutation guards and serviceability reads. It returns both
// the canonical decision and the exact active-order pressure used to derive it
// so callers never have to reimplement zone selection or terminal-order rules.
func EvaluateOperationalPolicyForStoreSnapshot(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	fulfillmentMode string,
) (OperationalDecision, int, error) {
	storeID = strings.TrimSpace(storeID)
	mode, err := NormalizeFulfillmentMode(fulfillmentMode)
	if err != nil || storeID == "" {
		return OperationalDecision{}, 0, ErrInvalid
	}

	zoneID, serviceAreaCode, err := resolveOperationalZoneForStore(ctx, db, storeID)
	if err != nil {
		return OperationalDecision{}, 0, err
	}

	// Capacity is governed at operational-zone/service-area scope. Counting only
	// the target store would let each store independently consume the same zone
	// capacity. The DSH order state machine has exactly three terminal states:
	// delivered, cancelled and returned_to_store; every other canonical state
	// consumes operational capacity.
	activeOrders := 0
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_orders o
		JOIN dsh_stores s ON s.id = o.store_id
		WHERE LOWER(s.service_area_code) = LOWER($1)
		  AND o.status NOT IN ('delivered', 'cancelled', 'returned_to_store')`, serviceAreaCode).Scan(&activeOrders)
	if err != nil {
		return OperationalDecision{}, 0, err
	}

	decision, err := EvaluateOperationalPolicy(ctx, db, OperationalEvaluationInput{
		ZoneID:          zoneID,
		ServiceAreaCode: serviceAreaCode,
		FulfillmentMode: mode,
		SlaCategory:     "default",
		ActiveOrders:    activeOrders,
		CaptainsOnline:  0,
	})
	if err != nil {
		return OperationalDecision{}, 0, err
	}
	return decision, activeOrders, nil
}

// EvaluateOperationalPolicyForStore preserves the mutation-facing API while
// delegating to the same canonical snapshot used by serviceability reads.
func EvaluateOperationalPolicyForStore(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	fulfillmentMode string,
) (OperationalDecision, error) {
	decision, _, err := EvaluateOperationalPolicyForStoreSnapshot(ctx, db, storeID, fulfillmentMode)
	return decision, err
}
