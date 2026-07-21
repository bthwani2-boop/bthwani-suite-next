package cart

import (
	"context"
	"database/sql"
	"strings"
)

// RecordServiceabilityCheck appends immutable operational evidence for a
// client-owned address check. It intentionally stores no payment or ledger
// amount; those remain WLT-owned.
func RecordServiceabilityCheck(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	storeID string,
	serviceAreaCode string,
	correlationID string,
	result GovernedServiceabilityResult,
) error {
	if strings.TrimSpace(clientID) == "" || strings.TrimSpace(storeID) == "" || strings.TrimSpace(result.AddressID) == "" || strings.TrimSpace(serviceAreaCode) == "" {
		return ErrInvalid
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_serviceability_checks (
			client_id,
			store_id,
			address_id,
			address_version,
			requested_mode,
			service_area_code,
			serviceable,
			result_code,
			capacity_state,
			active_orders,
			max_concurrent_orders,
			capacity_load_ratio,
			sla_prep_minutes,
			sla_delivery_minutes,
			correlation_id,
			checked_at
		)
		VALUES (
			$1,
			$2,
			$3::uuid,
			$4,
			$5,
			$6,
			$7,
			$8,
			$9,
			$10,
			$11,
			$12,
			$13,
			$14,
			NULLIF($15, ''),
			$16
		)`,
		strings.TrimSpace(clientID),
		strings.TrimSpace(storeID),
		strings.TrimSpace(result.AddressID),
		result.AddressVersion,
		result.RequestedMode,
		strings.TrimSpace(serviceAreaCode),
		result.Serviceable,
		result.Code,
		result.CapacityState,
		result.ActiveOrders,
		result.MaxConcurrentOrders,
		result.CapacityLoadRatio,
		result.SlaPrepMinutes,
		result.SlaDeliveryMinutes,
		strings.TrimSpace(correlationID),
		result.CheckedAt,
	)
	return err
}
