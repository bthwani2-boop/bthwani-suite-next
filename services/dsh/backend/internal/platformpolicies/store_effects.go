package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
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
// operational zone through the store's service_area_code. The zone-to-service-area
// relationship is enforced by the persistence layer: dsh_platform_zones carries an
// explicit foreign key to the canonical dsh_service_area_geofences owner and a
// unique index guarantees at most one operational zone per service area. A missing
// binding fails closed.
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

	var zoneID string
	err = db.QueryRowContext(ctx, `
		SELECT id::text
		FROM dsh_platform_zones
		WHERE LOWER(service_area_code) = LOWER($1)`, serviceAreaCode).Scan(&zoneID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", ErrNotFound
	}
	if err != nil {
		return "", "", err
	}
	return zoneID, serviceAreaCode, nil
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
