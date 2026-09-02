package cart

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"dsh-api/internal/mapproviders"
	"dsh-api/internal/platformpolicies"
	"github.com/google/uuid"
)

var ErrStoreConflict = errors.New("client already has an active cart for another store")

type StoreConflictError struct {
	ActiveCartID  string
	ActiveStoreID string
}

func (err *StoreConflictError) Error() string {
	return fmt.Sprintf("%s: activeCartId=%s activeStoreId=%s", ErrStoreConflict, err.ActiveCartID, err.ActiveStoreID)
}

func (err *StoreConflictError) Unwrap() error { return ErrStoreConflict }

type CartItemValidation struct {
	ItemID                      string  `json:"itemId"`
	MasterProductID             string  `json:"masterProductId"`
	Status                      string  `json:"status"`
	ReasonCode                  string  `json:"reasonCode,omitempty"`
	SnapshotUnitPriceMinorUnits int64   `json:"snapshotUnitPriceMinorUnits"`
	CurrentUnitPriceMinorUnits  *int64  `json:"currentUnitPriceMinorUnits,omitempty"`
	SnapshotCurrency            string  `json:"snapshotCurrency"`
	CurrentCurrency             *string `json:"currentCurrency,omitempty"`
	SnapshotAssortmentID        *string `json:"snapshotAssortmentId,omitempty"`
	CurrentAssortmentID         *string `json:"currentAssortmentId,omitempty"`
}

type CartValidation struct {
	Ready            bool                 `json:"ready"`
	Code             string               `json:"code"`
	PriceChanged     bool                 `json:"priceChanged"`
	UnavailableCount int                  `json:"unavailableCount"`
	Items            []CartItemValidation `json:"items"`
	ValidatedAt      time.Time            `json:"validatedAt"`
}

type ClientCartView struct {
	*Cart
	Validation CartValidation `json:"validation"`
}

// ValidateCart reconciles persisted snapshots against the same normalized DSH
// assortment price/inventory authority used by UpsertItem. Snapshot values are
// immutable; a hidden/unapproved assortment, missing current price, inventory
// policy violation, identity drift, or commercial change blocks readiness.
func ValidateCart(ctx context.Context, db *sql.DB, cartID string) (CartValidation, error) {
	result := CartValidation{
		Ready:       true,
		Code:        "ready",
		Items:       []CartItemValidation{},
		ValidatedAt: time.Now().UTC(),
	}
	rows, err := db.QueryContext(ctx, `
		SELECT
			ci.id::text,
			ci.master_product_id,
			ci.store_assortment_id,
			ci.unit_price_minor,
			ci.currency,
			a.id,
			p.amount_minor,
			p.currency,
			CASE
				WHEN a.id IS NULL THEN FALSE
				WHEN a.publication_status <> 'client_visible' OR a.paused_at IS NOT NULL THEN FALSE
				WHEN mp.approval_status <> 'approved' OR mp.is_active IS NOT TRUE THEN FALSE
				WHEN p.amount_minor IS NULL OR p.amount_minor <= 0 OR length(trim(p.currency)) <> 3 THEN FALSE
				WHEN i.store_assortment_id IS NULL OR i.step_quantity < 1 THEN FALSE
				WHEN ci.quantity < i.min_order_quantity OR ci.quantity > i.max_order_quantity THEN FALSE
				WHEN MOD(ci.quantity - i.min_order_quantity, i.step_quantity) <> 0 THEN FALSE
				WHEN i.policy_type = 'signal' AND i.quantity > 0 THEN TRUE
				WHEN i.policy_type = 'quantity' AND (i.quantity - i.reserved_quantity) >= ci.quantity THEN TRUE
				WHEN i.policy_type = 'infinite' THEN TRUE
				ELSE FALSE
			END AS purchasable
		FROM dsh_cart_items ci
		JOIN dsh_carts c ON c.id = ci.cart_id
		LEFT JOIN dsh_store_assortments a
		  ON a.store_id = c.store_id
		 AND a.master_product_id = ci.master_product_id
		LEFT JOIN dsh_master_products mp ON mp.id = a.master_product_id
		LEFT JOIN dsh_store_assortment_inventory i ON i.store_assortment_id = a.id
		LEFT JOIN LATERAL (
			SELECT price.amount_minor, price.currency
			FROM dsh_store_assortment_prices price
			WHERE price.store_assortment_id = a.id
			  AND price.effective_from <= NOW()
			  AND (price.effective_until IS NULL OR price.effective_until > NOW())
			ORDER BY price.effective_from DESC, price.version DESC, price.id DESC
			LIMIT 1
		) p ON TRUE
		WHERE ci.cart_id = $1::uuid
		ORDER BY ci.created_at, ci.id`, cartID)
	if err != nil {
		return result, err
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var item CartItemValidation
		var snapshotAssortment sql.NullString
		var currentAssortment sql.NullString
		var currentPrice sql.NullInt64
		var currentCurrency sql.NullString
		var currentAvailable sql.NullBool
		if err := rows.Scan(
			&item.ItemID,
			&item.MasterProductID,
			&snapshotAssortment,
			&item.SnapshotUnitPriceMinorUnits,
			&item.SnapshotCurrency,
			&currentAssortment,
			&currentPrice,
			&currentCurrency,
			&currentAvailable,
		); err != nil {
			return result, err
		}

		if snapshotAssortment.Valid {
			value := snapshotAssortment.String
			item.SnapshotAssortmentID = &value
		}
		if currentAssortment.Valid {
			value := currentAssortment.String
			item.CurrentAssortmentID = &value
		}
		if currentPrice.Valid {
			value := currentPrice.Int64
			item.CurrentUnitPriceMinorUnits = &value
		}
		if currentCurrency.Valid {
			value := currentCurrency.String
			item.CurrentCurrency = &value
		}

		switch {
		case strings.TrimSpace(item.MasterProductID) == "":
			item.Status = "product_unlinked"
			item.ReasonCode = "PRODUCT_UNLINKED"
		case !currentAssortment.Valid:
			item.Status = "assortment_unavailable"
			item.ReasonCode = "ASSORTMENT_UNAVAILABLE"
		case !snapshotAssortment.Valid:
			item.Status = "assortment_changed"
			item.ReasonCode = "ASSORTMENT_SNAPSHOT_MISSING"
		case snapshotAssortment.String != currentAssortment.String:
			item.Status = "assortment_changed"
			item.ReasonCode = "ASSORTMENT_CHANGED"
		case !currentPrice.Valid:
			item.Status = "unpriced"
			item.ReasonCode = "PRICE_UNAVAILABLE"
		case strings.TrimSpace(item.SnapshotCurrency) == "":
			item.Status = "unpriced"
			item.ReasonCode = "CURRENCY_SNAPSHOT_MISSING"
		case !currentCurrency.Valid || strings.TrimSpace(currentCurrency.String) == "":
			item.Status = "unpriced"
			item.ReasonCode = "CURRENCY_UNAVAILABLE"
		case item.SnapshotCurrency != currentCurrency.String:
			item.Status = "price_changed"
			item.ReasonCode = "CURRENCY_CHANGED"
			result.PriceChanged = true
		case item.SnapshotUnitPriceMinorUnits != currentPrice.Int64:
			item.Status = "price_changed"
			item.ReasonCode = "PRICE_CHANGED"
			result.PriceChanged = true
		case !currentAvailable.Valid || !currentAvailable.Bool:
			item.Status = "unavailable"
			item.ReasonCode = "PRODUCT_UNAVAILABLE"
		default:
			item.Status = "ready"
		}

		if item.Status != "ready" {
			result.Ready = false
			result.Code = "cart_requires_review"
			if item.Status != "price_changed" {
				result.UnavailableCount++
			}
		}
		result.Items = append(result.Items, item)
	}
	if err := rows.Err(); err != nil {
		return result, err
	}
	return result, nil
}

type GovernedServiceabilityResult struct {
	ServiceabilityResult
	AddressID           string          `json:"addressId,omitempty"`
	AddressVersion      int             `json:"addressVersion,omitempty"`
	RequestedMode       FulfillmentMode `json:"requestedMode,omitempty"`
	CapacityState       string          `json:"capacityState"`
	CapacityConfigured  bool            `json:"capacityConfigured"`
	ActiveOrders        int             `json:"activeOrders"`
	MaxConcurrentOrders *int            `json:"maxConcurrentOrders,omitempty"`
	CapacityLoadRatio   *float64        `json:"capacityLoadRatio,omitempty"`
	SlaConfigured       bool            `json:"slaConfigured"`
	SlaPrepMinutes      *int            `json:"slaPrepMinutes,omitempty"`
	SlaDeliveryMinutes  *int            `json:"slaDeliveryMinutes,omitempty"`
	CheckedAt           time.Time       `json:"checkedAt"`

	EtaMinMinutes *int       `json:"etaMinMinutes,omitempty"`
	EtaMaxMinutes *int       `json:"etaMaxMinutes,omitempty"`
	EtaStatus     string     `json:"etaStatus"`
	EtaReasonCode string     `json:"etaReasonCode,omitempty"`
	QuoteVersion  string     `json:"quoteVersion,omitempty"`
	ExpiresAt     *time.Time `json:"expiresAt,omitempty"`
}

// etaFromRoute accepts only provider-backed duration. Distance is deliberately
// not an input to this calculation: a straight-line approximation must never
// masquerade as a route ETA when the maps provider is unavailable.
func etaFromRoute(route mapproviders.RouteResponse, prepMinutes int) (*int, *int, string) {
	if route.DurationSeconds <= 0 {
		return nil, nil, "ROUTE_DURATION_UNAVAILABLE"
	}
	if prepMinutes <= 0 {
		prepMinutes = 15
	}
	routeMinutes := int(math.Ceil(route.DurationSeconds / 60.0))
	if routeMinutes < 10 {
		routeMinutes = 10
	}
	minETA := prepMinutes + routeMinutes
	maxETA := minETA + 15
	return &minETA, &maxETA, ""
}

func operationalPolicyServiceabilityFailure(decision platformpolicies.OperationalDecision) (string, string) {
	if len(decision.ReasonCodes) == 0 {
		return "policy_unavailable", "operational policy denied serviceability"
	}
	switch decision.ReasonCodes[0] {
	case "CAPACITY_EXHAUSTED":
		return "capacity_exhausted", "service area capacity is exhausted"
	case "CAPACITY_THROTTLED":
		return "capacity_throttled", "service area is temporarily throttled"
	case "ZONE_CAPACITY_PAUSED":
		return "capacity_paused", "service area is temporarily paused"
	case "FULFILLMENT_MODE_DISABLED", "FULFILLMENT_MODE_NOT_CONFIGURED":
		return "mode_unavailable", "requested fulfillment mode is unavailable"
	case "ZONE_INACTIVE", "SERVICE_AREA_MISMATCH", "NO_ACTIVE_STORES":
		return "out_of_area", "operational zone is not serviceable"
	case "SLA_NOT_CONFIGURED", "CAPACITY_NOT_CONFIGURED":
		return "policy_unavailable", "operational service policy is incomplete"
	default:
		return "policy_unavailable", "operational policy denied serviceability"
	}
}

// applyOperationalModePolicies keeps the per-mode capability list aligned with
// the same live policy snapshot that authorizes checkout. Store publication and
// geofence evidence alone cannot advertise a mode when capacity, SLA, pause or
// mode policy currently denies it.
func applyOperationalModePolicies(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	modes []FulfillmentModeAvailability,
) (map[FulfillmentMode]platformpolicies.OperationalDecision, int, error) {
	decisions := make(map[FulfillmentMode]platformpolicies.OperationalDecision, len(modes))
	activeOrders := 0
	for index := range modes {
		if !modes[index].Available {
			continue
		}
		decision, orders, err := platformpolicies.EvaluateOperationalPolicyForStoreSnapshot(
			ctx,
			db,
			storeID,
			string(modes[index].Mode),
		)
		if err != nil {
			return nil, 0, err
		}
		decisions[modes[index].Mode] = decision
		activeOrders = orders
		if !decision.Serviceable {
			modes[index].Available = false
			modes[index].UnavailableReasonCode, _ = operationalPolicyServiceabilityFailure(decision)
		}
	}
	return decisions, activeOrders, nil
}

// CheckGovernedServiceability combines geographic/store readiness with the
// exact same canonical operational-policy snapshot used by cart/checkout/order
// mutation guards. There is no second zone resolver, terminal-order list, SLA
// fallback or capacity calculation in this read path.
func CheckGovernedServiceability(
	ctx context.Context,
	db *sql.DB,
	mapClient *mapproviders.Client,
	storeID string,
	serviceAreaCode string,
	clientLat *float64,
	clientLng *float64,
	requestedMode FulfillmentMode,
) (GovernedServiceabilityResult, error) {
	base, err := CheckServiceability(ctx, db, storeID, serviceAreaCode, clientLat, clientLng)
	if err != nil {
		return GovernedServiceabilityResult{}, err
	}
	result := GovernedServiceabilityResult{
		ServiceabilityResult: base,
		RequestedMode:        requestedMode,
		CapacityState:        "unconfigured",
		EtaStatus:            "not_requested",
		CheckedAt:            time.Now().UTC(),
	}
	availableModes := append([]FulfillmentModeAvailability(nil), base.AvailableModes...)
	decisions, activeOrders, err := applyOperationalModePolicies(ctx, db, storeID, availableModes)
	if err != nil {
		return GovernedServiceabilityResult{}, err
	}
	result.AvailableModes = availableModes

	if requestedMode != "" {
		modeAvailable := false
		for _, candidate := range availableModes {
			if candidate.Mode == requestedMode {
				modeAvailable = candidate.Available
				break
			}
		}
		if !modeAvailable {
			result.Serviceable = false
			result.Code = "mode_unavailable"
			result.Reason = "requested fulfillment mode is unavailable"
		} else if requestedMode == ModePickup {
			// Pickup does not require the customer to be inside the store's
			// delivery zone. Its mode capability is the serviceability decision
			// when the store itself is published and operationally serviceable.
			result.Serviceable = true
			result.Code = "serviceable"
			result.Reason = ""
		}
	}

	result.ActiveOrders = activeOrders
	decision, decisionFound := decisions[requestedMode]
	if decisionFound && decision.SLA.Configured {
		prep := decision.SLA.MaxPrepMins
		delivery := decision.SLA.MaxDeliveryMins
		result.SlaConfigured = true
		result.SlaPrepMinutes = &prep
		result.SlaDeliveryMinutes = &delivery
	}
	if decisionFound && decision.Capacity.Configured && decision.Capacity.MaxConcurrentOrders > 0 {
		maxValue := decision.Capacity.MaxConcurrentOrders
		ratio := decision.PressureRatio
		result.CapacityConfigured = true
		result.MaxConcurrentOrders = &maxValue
		result.CapacityLoadRatio = &ratio
		result.CapacityState = "available"
		switch decision.Decision {
		case "capacity_exhausted":
			result.CapacityState = "exhausted"
		case "throttled":
			result.CapacityState = "throttled"
		case "paused":
			result.CapacityState = "paused"
		case "policy_incomplete":
			result.CapacityState = "policy_incomplete"
		case "mode_disabled":
			result.CapacityState = "mode_disabled"
		case "unserviceable":
			result.CapacityState = "unserviceable"
		}
	}
	if decisionFound && !decision.Serviceable && result.Serviceable {
		result.Serviceable = false
		result.Code, result.Reason = operationalPolicyServiceabilityFailure(decision)
	}

	result.QuoteVersion = uuid.NewString()
	expiry := time.Now().UTC().Add(15 * time.Minute)
	result.ExpiresAt = &expiry

	if result.Serviceable && (requestedMode == ModeBthwaniDelivery || requestedMode == ModePartnerDelivery) && clientLat != nil && clientLng != nil {
		result.EtaStatus = "unavailable"
		var storeLat, storeLng float64
		err := db.QueryRowContext(ctx, `SELECT latitude, longitude FROM dsh_stores WHERE id = $1`, storeID).Scan(&storeLat, &storeLng)
		if err != nil {
			result.EtaReasonCode = "STORE_LOCATION_UNAVAILABLE"
		} else if mapClient == nil {
			result.EtaReasonCode = "ROUTE_PROVIDER_NOT_CONFIGURED"
		} else {
			routeResponse, routeErr := mapClient.Route(ctx, "", mapproviders.RouteInput{
				OriginLatitude:       storeLat,
				OriginLongitude:      storeLng,
				DestinationLatitude:  *clientLat,
				DestinationLongitude: *clientLng,
			})
			if routeErr != nil {
				result.EtaReasonCode = "ROUTE_PROVIDER_UNAVAILABLE"
			} else {
				prepMinutes := 15
				if decision.SLA.Configured && decision.SLA.MaxPrepMins > 0 {
					prepMinutes = decision.SLA.MaxPrepMins
				}
				minETA, maxETA, reason := etaFromRoute(routeResponse, prepMinutes)
				if reason != "" {
					result.EtaReasonCode = reason
				} else {
					result.EtaMinMinutes = minETA
					result.EtaMaxMinutes = maxETA
					result.EtaStatus = "available"
				}
			}
		}
	}

	return result, nil
}
