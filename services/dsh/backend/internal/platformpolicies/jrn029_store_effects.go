package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// NormalizeFulfillmentMode maps compatibility values used by older DSH
// checkout and pickup paths to the canonical JRN-029 fulfillment vocabulary.
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

// EvaluateOperationalPolicyForStore resolves the store's canonical service-area
// zone and live non-terminal order pressure before invoking the single JRN-029
// decision. It deliberately does not infer a second serviceability truth.
func EvaluateOperationalPolicyForStore(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	fulfillmentMode string,
) (OperationalDecision, error) {
	storeID = strings.TrimSpace(storeID)
	mode, err := NormalizeFulfillmentMode(fulfillmentMode)
	if err != nil || storeID == "" {
		return OperationalDecision{}, ErrInvalid
	}

	var zoneID string
	var serviceAreaCode string
	err = db.QueryRowContext(ctx, `
		SELECT z.id::text, z.city_code
		FROM dsh_stores s
		JOIN dsh_platform_zones z
		  ON LOWER(z.city_code) = LOWER(s.service_area_code)
		WHERE s.id = $1
		ORDER BY z.is_active DESC, z.updated_at DESC
		LIMIT 1`, storeID).Scan(&zoneID, &serviceAreaCode)
	if errors.Is(err, sql.ErrNoRows) {
		return OperationalDecision{}, ErrNotFound
	}
	if err != nil {
		return OperationalDecision{}, err
	}

	activeOrders := 0
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_orders
		WHERE store_id = $1
		  AND status NOT IN (
		    'delivered', 'cancelled', 'rejected', 'refunded', 'failed'
		  )`, storeID).Scan(&activeOrders)
	if err != nil {
		return OperationalDecision{}, err
	}

	return EvaluateOperationalPolicy(ctx, db, OperationalEvaluationInput{
		ZoneID:          zoneID,
		ServiceAreaCode: serviceAreaCode,
		FulfillmentMode: mode,
		SlaCategory:     "default",
		ActiveOrders:    activeOrders,
		CaptainsOnline:  0,
	})
}
