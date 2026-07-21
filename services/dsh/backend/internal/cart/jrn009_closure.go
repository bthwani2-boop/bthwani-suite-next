package cart

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
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

// GetOrCreateSingleStoreCart enforces the Product Truth decision that a client
// may own at most one active cart across the whole tenant. The advisory lock and
// the database partial unique index close both application and concurrent-write
// paths. Switching stores is explicit; the server never silently destroys a
// different store's active cart.
func GetOrCreateSingleStoreCart(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	storeID string,
	mode FulfillmentMode,
) (*Cart, error) {
	clientID = strings.TrimSpace(clientID)
	storeID = strings.TrimSpace(storeID)
	if clientID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	if mode == "" {
		mode = ModeBthwaniDelivery
	}
	if mode != ModeBthwaniDelivery && mode != ModePartnerDelivery && mode != ModePickup {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "dsh-active-cart:"+clientID); err != nil {
		return nil, err
	}

	var current Cart
	err = tx.QueryRowContext(ctx, `
		SELECT id::text, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at
		FROM dsh_carts
		WHERE client_id = $1 AND state = 'active'
		ORDER BY updated_at DESC, id DESC
		LIMIT 1
		FOR UPDATE`, clientID).Scan(
		&current.ID,
		&current.ClientID,
		&current.StoreID,
		&current.FulfillmentMode,
		&current.State,
		&current.Note,
		&current.Version,
		&current.CreatedAt,
		&current.UpdatedAt,
	)
	if err == nil {
		if current.StoreID != storeID {
			return nil, &StoreConflictError{ActiveCartID: current.ID, ActiveStoreID: current.StoreID}
		}
		if current.FulfillmentMode != mode {
			if _, err := tx.ExecContext(ctx, `
				UPDATE dsh_carts
				SET fulfillment_mode = $2, version = version + 1, updated_at = NOW()
				WHERE id = $1::uuid`, current.ID, mode); err != nil {
				return nil, err
			}
			current.FulfillmentMode = mode
			current.Version++
			current.UpdatedAt = time.Now().UTC()
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		items, err := listItems(ctx, db, current.ID)
		if err != nil {
			return nil, err
		}
		current.Items = items
		return &current, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var created Cart
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode)
		VALUES ($1, $2, $3)
		RETURNING id::text, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at`,
		clientID, storeID, mode).Scan(
		&created.ID,
		&created.ClientID,
		&created.StoreID,
		&created.FulfillmentMode,
		&created.State,
		&created.Note,
		&created.Version,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	created.Items = []CartItem{}
	return &created, nil
}

type CartItemValidation struct {
	ItemID                string   `json:"itemId"`
	MasterProductID       string   `json:"masterProductId"`
	Status                string   `json:"status"`
	ReasonCode            string   `json:"reasonCode,omitempty"`
	SnapshotUnitPrice     float64  `json:"snapshotUnitPrice"`
	CurrentUnitPrice      *float64 `json:"currentUnitPrice,omitempty"`
	SnapshotAssortmentID  *string  `json:"snapshotAssortmentId,omitempty"`
	CurrentAssortmentID   *string  `json:"currentAssortmentId,omitempty"`
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

// ValidateCart reconciles persisted snapshots with current assortment truth.
// Snapshot values remain immutable; changed price, availability, product link,
// or assortment identity blocks checkout until the client explicitly refreshes
// or removes the affected line.
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
			ci.unit_price::double precision,
			a.id,
			a.unit_price::double precision,
			a.available
		FROM dsh_cart_items ci
		JOIN dsh_carts c ON c.id = ci.cart_id
		LEFT JOIN dsh_store_assortments a
		  ON a.store_id = c.store_id
		 AND a.master_product_id = ci.master_product_id
		WHERE ci.cart_id = $1::uuid
		ORDER BY ci.created_at, ci.id`, cartID)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var item CartItemValidation
		var snapshotAssortment sql.NullString
		var currentAssortment sql.NullString
		var currentPrice sql.NullFloat64
		var currentAvailable sql.NullBool
		if err := rows.Scan(
			&item.ItemID,
			&item.MasterProductID,
			&snapshotAssortment,
			&item.SnapshotUnitPrice,
			&currentAssortment,
			&currentPrice,
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
			value := currentPrice.Float64
			item.CurrentUnitPrice = &value
		}

		switch {
		case strings.TrimSpace(item.MasterProductID) == "":
			item.Status = "product_unlinked"
			item.ReasonCode = "PRODUCT_UNLINKED"
		case !currentAssortment.Valid:
			item.Status = "assortment_unavailable"
			item.ReasonCode = "ASSORTMENT_UNAVAILABLE"
		case !currentAvailable.Valid || !currentAvailable.Bool:
			item.Status = "unavailable"
			item.ReasonCode = "PRODUCT_UNAVAILABLE"
		case snapshotAssortment.Valid && snapshotAssortment.String != currentAssortment.String:
			item.Status = "assortment_changed"
			item.ReasonCode = "ASSORTMENT_CHANGED"
		case !currentPrice.Valid || currentPrice.Float64 <= 0:
			item.Status = "unpriced"
			item.ReasonCode = "PRICE_UNAVAILABLE"
		case int64(math.Round(item.SnapshotUnitPrice*100)) != int64(math.Round(currentPrice.Float64*100)):
			item.Status = "price_changed"
			item.ReasonCode = "PRICE_CHANGED"
			result.PriceChanged = true
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
	AddressID             string          `json:"addressId,omitempty"`
	AddressVersion        int             `json:"addressVersion,omitempty"`
	RequestedMode         FulfillmentMode `json:"requestedMode,omitempty"`
	CapacityState         string          `json:"capacityState"`
	CapacityConfigured    bool            `json:"capacityConfigured"`
	ActiveOrders          int             `json:"activeOrders"`
	MaxConcurrentOrders   *int            `json:"maxConcurrentOrders,omitempty"`
	CapacityLoadRatio     *float64        `json:"capacityLoadRatio,omitempty"`
	SlaConfigured         bool            `json:"slaConfigured"`
	SlaPrepMinutes        *int            `json:"slaPrepMinutes,omitempty"`
	SlaDeliveryMinutes    *int            `json:"slaDeliveryMinutes,omitempty"`
	CheckedAt             time.Time       `json:"checkedAt"`
}

// CheckGovernedServiceability extends geographic/store readiness with the
// governed zone capacity and SLA policies already owned by DSH. Missing policy
// is explicit in the response; exhausted or throttled capacity blocks delivery.
func CheckGovernedServiceability(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	serviceAreaCode string,
	clientLat *float64,
	clientLng *float64,
	requestedMode FulfillmentMode,
) GovernedServiceabilityResult {
	base := CheckServiceability(ctx, db, storeID, serviceAreaCode, clientLat, clientLng)
	result := GovernedServiceabilityResult{
		ServiceabilityResult: base,
		RequestedMode:        requestedMode,
		CapacityState:        "unconfigured",
		CheckedAt:            time.Now().UTC(),
	}

	if requestedMode != "" {
		modeAvailable := false
		for _, candidate := range base.AvailableModes {
			if candidate.Mode == requestedMode {
				modeAvailable = candidate.Available
				break
			}
		}
		if !modeAvailable {
			result.Serviceable = false
			result.Code = "mode_unavailable"
			result.Reason = "requested fulfillment mode is unavailable"
		}
	}

	var zoneID sql.NullString
	var maxConcurrent sql.NullInt64
	var throttleThreshold sql.NullFloat64
	var activeOrders int
	var maxPrep sql.NullInt64
	var maxDelivery sql.NullInt64
	err := db.QueryRowContext(ctx, `
		SELECT
			z.id,
			capacity.max_concurrent_orders,
			capacity.throttle_threshold,
			COALESCE((
				SELECT COUNT(*)::int
				FROM dsh_orders orders
				JOIN dsh_stores order_store ON order_store.id = orders.store_id
				WHERE z.id IS NOT NULL
				  AND (lower(order_store.service_area_code) = lower(z.city_code)
				       OR lower(order_store.city_code) = lower(z.city_code))
				  AND orders.status NOT IN ('cancelled', 'completed', 'delivered', 'returned_to_store')
			), 0),
			sla.max_prep_mins,
			sla.max_delivery_mins
		FROM dsh_stores store_row
		LEFT JOIN LATERAL (
			SELECT candidate.id, candidate.city_code
			FROM dsh_platform_zones candidate
			WHERE candidate.is_active = TRUE
			  AND (
				lower(candidate.id) = lower(store_row.service_area_code)
				OR lower(candidate.city_code) = lower(store_row.service_area_code)
				OR lower(candidate.city_code) = lower(store_row.city_code)
			  )
			ORDER BY
				CASE WHEN lower(candidate.id) = lower(store_row.service_area_code) THEN 0 ELSE 1 END,
				candidate.id
			LIMIT 1
		) zone_match ON TRUE
		LEFT JOIN dsh_platform_zones z ON z.id = zone_match.id
		LEFT JOIN dsh_platform_capacity_configs capacity ON capacity.zone_id = z.id
		LEFT JOIN LATERAL (
			SELECT rule.max_prep_mins, rule.max_delivery_mins
			FROM dsh_platform_sla_rules rule
			WHERE rule.zone_id = z.id
			ORDER BY CASE WHEN rule.category IN ('default', 'all', '*') THEN 0 ELSE 1 END, rule.category
			LIMIT 1
		) sla ON TRUE
		WHERE store_row.id = $1`, storeID).Scan(
		&zoneID,
		&maxConcurrent,
		&throttleThreshold,
		&activeOrders,
		&maxPrep,
		&maxDelivery,
	)
	if err != nil {
		result.CapacityState = "policy_unavailable"
		if result.Serviceable {
			result.Serviceable = false
			result.Code = "policy_unavailable"
			result.Reason = "operational capacity policy could not be evaluated"
		}
		return result
	}

	result.ActiveOrders = activeOrders
	if maxPrep.Valid && maxDelivery.Valid {
		prep := int(maxPrep.Int64)
		delivery := int(maxDelivery.Int64)
		result.SlaConfigured = true
		result.SlaPrepMinutes = &prep
		result.SlaDeliveryMinutes = &delivery
	}
	if maxConcurrent.Valid && maxConcurrent.Int64 > 0 && throttleThreshold.Valid {
		maxValue := int(maxConcurrent.Int64)
		ratio := float64(activeOrders) / float64(maxValue)
		result.CapacityConfigured = true
		result.MaxConcurrentOrders = &maxValue
		result.CapacityLoadRatio = &ratio
		result.CapacityState = "available"
		if ratio >= 1 {
			result.CapacityState = "exhausted"
			result.Serviceable = false
			result.Code = "capacity_exhausted"
			result.Reason = "service area capacity is exhausted"
		} else if ratio >= throttleThreshold.Float64 {
			result.CapacityState = "throttled"
			result.Serviceable = false
			result.Code = "capacity_throttled"
			result.Reason = "service area is temporarily throttled"
		}
	}
	return result
}
