package cart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"time"

)

var (
	ErrNotFound  = errors.New("cart not found")
	ErrConflict  = errors.New("cart version conflict")
	ErrInvalid   = errors.New("invalid cart input")
	ErrStoreGone = errors.New("store no longer active")
	ErrOutOfArea = errors.New("store outside serviceable area")
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery FulfillmentMode = "partner_delivery"
	ModePickup          FulfillmentMode = "pickup"
)

type CartItem struct {
	ID                string  `json:"id"`
	CartID            string  `json:"cartId"`
	ProductID         string  `json:"productId"`
	MasterProductID   string  `json:"masterProductId"`
	StoreAssortmentID *string `json:"storeAssortmentId"`
	ProductName       string  `json:"productName"`
	PriceReference    string  `json:"priceReference"`
	// UnitPrice is snapshotted from the store assortment at add-to-cart time,
	// so a later catalog price change never retroactively changes an
	// existing cart/order. It is never taken from client input.
	UnitPrice float64   `json:"unitPrice"`
	Quantity  int       `json:"quantity"`
	Version   int       `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Cart struct {
	ID              string          `json:"id"`
	ClientID        string          `json:"clientId"`
	StoreID         string          `json:"storeId"`
	FulfillmentMode FulfillmentMode `json:"fulfillmentMode"`
	State           string          `json:"state"`
	Note            string          `json:"note"`
	Items           []CartItem      `json:"items"`
	Version         int             `json:"version"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type ServiceabilityResult struct {
	Serviceable bool   `json:"serviceable"`
	Code        string `json:"code"`
	Reason      string `json:"reason,omitempty"`
}

type UpsertItemInput struct {
	// MasterProductID is the only product identity taken from the caller: name,
	// priceReference (display label), and unitPrice are always looked up
	// server-side from the store assortment row, never trusted from the client.
	MasterProductID string `json:"masterProductId"`
	Quantity        int    `json:"quantity"`
}

func GetOrCreateActiveCart(ctx context.Context, db *sql.DB, clientID, storeID string, mode FulfillmentMode) (*Cart, error) {
	var c Cart
	err := db.QueryRowContext(ctx,
		`SELECT id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at
		 FROM dsh_carts
		 WHERE client_id = $1 AND store_id = $2 AND state = 'active'
		 LIMIT 1`,
		clientID, storeID,
	).Scan(&c.ID, &c.ClientID, &c.StoreID, &c.FulfillmentMode, &c.State, &c.Note, &c.Version, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return createCart(ctx, db, clientID, storeID, mode)
	}
	if err != nil {
		return nil, err
	}
	items, err := listItems(ctx, db, c.ID)
	if err != nil {
		return nil, err
	}
	c.Items = items
	return &c, nil
}

func GetCart(ctx context.Context, db *sql.DB, clientID, storeID string) (*Cart, error) {
	var c Cart
	err := db.QueryRowContext(ctx,
		`SELECT id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at
		 FROM dsh_carts
		 WHERE client_id = $1 AND store_id = $2 AND state = 'active'
		 LIMIT 1`,
		clientID, storeID,
	).Scan(&c.ID, &c.ClientID, &c.StoreID, &c.FulfillmentMode, &c.State, &c.Note, &c.Version, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	items, err := listItems(ctx, db, c.ID)
	if err != nil {
		return nil, err
	}
	c.Items = items
	return &c, nil
}

func UpsertItem(ctx context.Context, db *sql.DB, storeID, cartID string, input UpsertItemInput) (*CartItem, error) {
	if input.MasterProductID == "" || input.Quantity < 1 {
		return nil, ErrInvalid
	}
	var assortmentID, name string
	var unitPrice float64
	var available bool
	err := db.QueryRowContext(ctx,
		`SELECT a.id, mp.canonical_name_ar, a.unit_price, a.available
		 FROM dsh_store_assortments a
		 JOIN dsh_master_products mp ON mp.id = a.master_product_id
		 WHERE a.store_id = $1 AND a.master_product_id = $2`,
		storeID, input.MasterProductID,
	).Scan(&assortmentID, &name, &unitPrice, &available)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInvalid
	}
	if err != nil {
		return nil, err
	}
	if !available || unitPrice <= 0 {
		return nil, ErrInvalid
	}
	priceReference := fmt.Sprintf("%.2f", unitPrice)
	var item CartItem
	err = db.QueryRowContext(ctx,
		`INSERT INTO dsh_cart_items (cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price, quantity)
		 VALUES ($1, $2, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (cart_id, product_id) DO UPDATE
		   SET quantity            = EXCLUDED.quantity,
		       master_product_id   = EXCLUDED.master_product_id,
		       store_assortment_id = EXCLUDED.store_assortment_id,
		       product_name        = EXCLUDED.product_name,
		       price_reference     = EXCLUDED.price_reference,
		       unit_price          = EXCLUDED.unit_price,
		       version             = dsh_cart_items.version + 1,
		       updated_at          = NOW()
		 RETURNING id, cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price, quantity, version, created_at, updated_at`,
		cartID, input.MasterProductID, assortmentID, name, priceReference, unitPrice, input.Quantity,
	).Scan(&item.ID, &item.CartID, &item.ProductID, &item.MasterProductID, &item.StoreAssortmentID, &item.ProductName, &item.PriceReference, &item.UnitPrice, &item.Quantity, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func RemoveItem(ctx context.Context, db *sql.DB, cartID, itemID string) error {
	res, err := db.ExecContext(ctx,
		`DELETE FROM dsh_cart_items WHERE id = $1 AND cart_id = $2`,
		itemID, cartID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func ClearCart(ctx context.Context, db *sql.DB, cartID string) error {
	_, err := db.ExecContext(ctx,
		`DELETE FROM dsh_cart_items WHERE cart_id = $1`,
		cartID,
	)
	return err
}

func UpdateFulfillmentMode(ctx context.Context, db *sql.DB, cartID string, mode FulfillmentMode) error {
	res, err := db.ExecContext(ctx,
		`UPDATE dsh_carts SET fulfillment_mode = $1, version = version + 1, updated_at = NOW()
		 WHERE id = $2`,
		mode, cartID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func calculateDistanceKM(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371.0 // Earth radius in kilometers

	radLat1 := lat1 * math.Pi / 180
	radLon1 := lon1 * math.Pi / 180
	radLat2 := lat2 * math.Pi / 180
	radLon2 := lon2 * math.Pi / 180

	diffLat := radLat2 - radLat1
	diffLon := radLon2 - radLon1

	a := math.Sin(diffLat/2)*math.Sin(diffLat/2) +
		math.Cos(radLat1)*math.Cos(radLat2)*
			math.Sin(diffLon/2)*math.Sin(diffLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

// CheckServiceability verifies that the store is active and in the serviceable state.
// DSH only checks store-level availability — delivery fee and zone pricing are WLT concerns.
func CheckServiceability(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string, clientLat, clientLng *float64) ServiceabilityResult {
	var storeStatus, serviceabilityStatus, storeServiceArea, storeCity string
	var distanceKM, storeLat, storeLng *float64
	err := db.QueryRowContext(ctx,
		`SELECT status, serviceability_status, service_area_code, city_code, distance_km, latitude, longitude FROM dsh_stores WHERE id = $1`,
		storeID,
	).Scan(&storeStatus, &serviceabilityStatus, &storeServiceArea, &storeCity, &distanceKM, &storeLat, &storeLng)
	if errors.Is(err, sql.ErrNoRows) {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store not found"}
	}
	if err != nil {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store lookup failed"}
	}
	if storeStatus != "active" {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store is not active"}
	}
	if serviceabilityStatus == "out_of_area" || serviceabilityStatus == "unavailable" {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store is not serviceable"}
	}

	// Calculate physical distance between client and store coordinates if both are provided
	var calculatedDistance *float64
	if clientLat != nil && clientLng != nil && storeLat != nil && storeLng != nil {
		dist := calculateDistanceKM(*clientLat, *clientLng, *storeLat, *storeLng)
		calculatedDistance = &dist
	} else {
		calculatedDistance = distanceKM
	}

	// Check if store is within delivery range (<= 5.0 km) or matches the zone/city name fallback
	isWithinDistance := calculatedDistance != nil && *calculatedDistance > 0 && *calculatedDistance <= 5.0
	matchesZone := serviceAreaCode != "" && (storeServiceArea == serviceAreaCode || storeCity == serviceAreaCode)

	if !isWithinDistance && !matchesZone {
		return ServiceabilityResult{Serviceable: false, Code: "out_of_area", Reason: "store outside requested service area"}
	}
	return ServiceabilityResult{Serviceable: true, Code: "serviceable"}
}

func ListOperatorCarts(ctx context.Context, db *sql.DB, state string) ([]Cart, error) {
	q := `SELECT id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at
	      FROM dsh_carts`
	args := []any{}
	if state != "" {
		q += ` WHERE state = $1`
		args = append(args, state)
	}
	q += ` ORDER BY updated_at DESC LIMIT 200`

	rows, err := db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var carts []Cart
	for rows.Next() {
		var c Cart
		if err := rows.Scan(&c.ID, &c.ClientID, &c.StoreID, &c.FulfillmentMode, &c.State, &c.Note, &c.Version, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		carts = append(carts, c)
	}
	return carts, rows.Err()
}

func createCart(ctx context.Context, db *sql.DB, clientID, storeID string, mode FulfillmentMode) (*Cart, error) {
	if mode == "" {
		mode = ModeBthwaniDelivery
	}
	var c Cart
	err := db.QueryRowContext(ctx,
		`INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode)
		 VALUES ($1, $2, $3)
		 RETURNING id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at`,
		clientID, storeID, mode,
	).Scan(&c.ID, &c.ClientID, &c.StoreID, &c.FulfillmentMode, &c.State, &c.Note, &c.Version, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Items = []CartItem{}
	return &c, nil
}

func listItems(ctx context.Context, db *sql.DB, cartID string) ([]CartItem, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT id, cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price, quantity, version, created_at, updated_at
		 FROM dsh_cart_items WHERE cart_id = $1 ORDER BY created_at`,
		cartID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CartItem
	for rows.Next() {
		var item CartItem
		if err := rows.Scan(&item.ID, &item.CartID, &item.ProductID, &item.MasterProductID, &item.StoreAssortmentID, &item.ProductName, &item.PriceReference, &item.UnitPrice, &item.Quantity, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []CartItem{}
	}
	return items, rows.Err()
}

// CartSnapshot is the priced total DSH computes from its own catalog price
// snapshot at checkout handoff time. WLT receives this as the payment
// session's authoritative amount; DSH never lets a client dictate it.
type CartSnapshot struct {
	AmountMinorUnits int64
	Currency         string
	SnapshotHash     string
}

// ErrCartItemMissingPrice indicates a cart item has no positive price
// snapshot, so checkout cannot compute a real amount for WLT.
var ErrCartItemMissingPrice = errors.New("cart item is missing a price snapshot")

// ComputeCheckoutSnapshot sums the cart's priced items into a single minor-
// units amount plus a stable hash of (productId, quantity, unitPrice) for
// every item, so WLT can detect if the priced cart changes between a
// checkout retry and the original handoff.
func ComputeCheckoutSnapshot(ctx context.Context, db *sql.DB, cartID string) (*CartSnapshot, error) {
	items, err := listItems(ctx, db, cartID)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: cart has no items", ErrInvalid)
	}

	var totalMinorUnits int64
	hasher := sha256.New()
	hasher.Write([]byte(cartID))
	for _, item := range items {
		if item.UnitPrice <= 0 {
			return nil, ErrCartItemMissingPrice
		}
		unitMinorUnits := int64(math.Round(item.UnitPrice * 100))
		totalMinorUnits += unitMinorUnits * int64(item.Quantity)
		hasher.Write([]byte(fmt.Sprintf("|%s:%d:%d", item.ProductID, item.Quantity, unitMinorUnits)))
	}

	return &CartSnapshot{
		AmountMinorUnits: totalMinorUnits,
		Currency:         "YER",
		SnapshotHash:     hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}
