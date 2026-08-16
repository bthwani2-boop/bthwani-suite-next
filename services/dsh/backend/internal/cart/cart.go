package cart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"dsh-api/internal/wlt"
	"github.com/lib/pq"
)

var (
	ErrNotFound             = errors.New("cart not found")
	ErrConflict             = errors.New("cart version conflict")
	ErrInvalid              = errors.New("invalid cart input")
	ErrStoreGone            = errors.New("store no longer active")
	ErrOutOfArea            = errors.New("store outside serviceable area")
	ErrFinancialUnavailable = errors.New("canonical financial quote is unavailable")
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
	// UnitPriceMinorUnits and Currency are snapshotted together from the sovereign store
	// assortment at add-to-cart time. Neither value is accepted from the client.
	UnitPriceMinorUnits int64     `json:"unitPriceMinorUnits"`
	Currency            string    `json:"currency"`
	Quantity            int       `json:"quantity"`
	Options             []string  `json:"options"`
	Note                string    `json:"note"`
	Version             int       `json:"version"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type Cart struct {
	ID              string          `json:"id"`
	ClientID        string          `json:"clientId"`
	StoreID         string          `json:"storeId"`
	FulfillmentMode FulfillmentMode `json:"fulfillmentMode"`
	State           string          `json:"state"`
	Note            string          `json:"note"`
	Items           []CartItem      `json:"items"`
	// Quote is the authoritative financial quote from WLT. DSH never mutates it.
	Quote     *wlt.WltPricingQuote `json:"quote"`
	Version   int                  `json:"version"`
	CreatedAt time.Time            `json:"createdAt"`
	UpdatedAt time.Time            `json:"updatedAt"`
}

// FetchDeliveryFeeMinorUnits reads the store's persisted delivery fee from the
// DSH operational database. This is a DSH concern (logistics configuration),
// not a financial computation — WLT receives it as a raw input.
func FetchDeliveryFeeMinorUnits(ctx context.Context, db *sql.DB, storeID string) (int64, error) {
	if db == nil || strings.TrimSpace(storeID) == "" {
		return 0, fmt.Errorf("%w: delivery fee store scope is missing", ErrFinancialUnavailable)
	}
	var fee int64
	err := db.QueryRowContext(ctx,
		"SELECT delivery_fee_minor FROM dsh_store_delivery_settings WHERE store_id = $1",
		storeID,
	).Scan(&fee)
	if err != nil {
		return 0, fmt.Errorf("%w: read delivery fee: %v", ErrFinancialUnavailable, err)
	}
	if fee < 0 {
		return 0, fmt.Errorf("%w: delivery fee is negative", ErrFinancialUnavailable)
	}
	return fee, nil
}

// FetchWltQuote calls WLT's sovereign pricing engine. DSH passes operational
// inputs; WLT owns all arithmetic, rounding, tax, and discount logic.
// A non-empty cart cannot be represented as an ordinary nil quote when WLT or
// its operational fee dependency is unavailable; callers must surface the
// typed financial-unavailability error and block checkout readiness.
func FetchWltQuote(ctx context.Context, db *sql.DB, wltClient interface {
	CalculateQuote(context.Context, wlt.CalculatePricingQuoteRequest) (*wlt.WltPricingQuote, error)
}, c *Cart) (*wlt.WltPricingQuote, error) {
	if c == nil {
		return nil, fmt.Errorf("%w: cart is missing", ErrFinancialUnavailable)
	}

	var currency string
	lines := make([]wlt.QuotePricingInputLine, 0, len(c.Items))
	for _, item := range c.Items {
		if item.Currency != "" {
			currency = item.Currency
		}
		lines = append(lines, wlt.QuotePricingInputLine{
			MasterProductID:     item.MasterProductID,
			ProductName:         item.ProductName,
			Quantity:            item.Quantity,
			UnitPriceMinorUnits: item.UnitPriceMinorUnits,
		})
	}

	if len(lines) == 0 {
		// Empty cart — no quote needed yet
		return nil, nil
	}
	if wltClient == nil {
		return nil, fmt.Errorf("%w: WLT pricing client is not configured", ErrFinancialUnavailable)
	}

	deliveryFee, err := FetchDeliveryFeeMinorUnits(ctx, db, c.StoreID)
	if err != nil {
		return nil, err
	}

	quote, err := wltClient.CalculateQuote(ctx, wlt.CalculatePricingQuoteRequest{
		ClientID:    c.ClientID,
		StoreID:     c.StoreID,
		Currency:    currency,
		CartVersion: c.Version,
		Lines:       lines,
		PricingEvidence: wlt.PricingEvidence{
			Version:               c.Version,
			DeliveryFeeMinorUnits: deliveryFee,
			ServiceFeeMinorUnits:  0,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("%w: WLT pricing quote: %v", ErrFinancialUnavailable, err)
	}
	if quote == nil || strings.TrimSpace(quote.ID) == "" {
		return nil, fmt.Errorf("%w: WLT returned an empty quote", ErrFinancialUnavailable)
	}
	return quote, nil
}

type ServiceabilityResult struct {
	Serviceable    bool                          `json:"serviceable"`
	Code           string                        `json:"code"`
	Reason         string                        `json:"reason,omitempty"`
	AvailableModes []FulfillmentModeAvailability `json:"availableModes,omitempty"`
}

// FulfillmentModeAvailability reports, for one canonical checkout fulfillment
// mode, whether this store+location combination can actually use it right
// now, with a machine-readable reason code when it cannot. DSH never returns
// a static three-mode list: every mode not enabled by the store, or blocked
// by the same zone/distance check CheckServiceability applies, is reported
// unavailable with why.
type FulfillmentModeAvailability struct {
	Mode                  FulfillmentMode `json:"mode"`
	Available             bool            `json:"available"`
	UnavailableReasonCode string          `json:"unavailableReasonCode,omitempty"`
}

// FulfillmentModesResponse is the J051 lightweight response for the dedicated
// mode-capability endpoint.
type FulfillmentModesResponse struct {
	StoreID     string                        `json:"storeId"`
	Modes       []FulfillmentModeAvailability `json:"modes"`
	EvaluatedAt time.Time                     `json:"evaluatedAt"`
}

// storeDeliveryModeToFulfillmentMode maps the store-publication delivery-mode
// vocabulary ("delivery" | "pickup" | "express", DshStoreDeliveryMode in the
// OpenAPI contract) to the canonical checkout FulfillmentMode. This is the
// single authoritative mapping between the two — mirrors
// services/dsh/frontend/shared/store/store-discovery.formatters.ts
// (toFulfillmentMode) and must stay in sync with it.
var storeDeliveryModeToFulfillmentMode = map[string]FulfillmentMode{
	"delivery": ModePartnerDelivery,
	"express":  ModeBthwaniDelivery,
	"pickup":   ModePickup,
}

type UpsertItemInput struct {
	// MasterProductID is the only product identity taken from the caller: name,
	// priceReference (display label), unitPrice, and currency are always looked
	// up server-side from the store assortment row, never trusted from the client.
	MasterProductID string   `json:"masterProductId"`
	Quantity        int      `json:"quantity"`
	Options         []string `json:"options"`
	Note            string   `json:"note"`
	ExpectedVersion *int     `json:"expectedVersion,omitempty"`
	// FulfillmentMode is applied with the item mutation when the caller owns
	// the cart. Keeping it in this transaction prevents a failed item write
	// from leaving a mode change behind.
	FulfillmentMode *FulfillmentMode `json:"-"`
}

func hashOptions(options []string) string {
	if len(options) == 0 {
		h := sha256.Sum256([]byte("[]"))
		return hex.EncodeToString(h[:])
	}
	sorted := make([]string, len(options))
	copy(sorted, options)
	sort.Strings(sorted)
	b, _ := json.Marshal(sorted)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

// wltQuoter is the minimal WLT interface required by cart functions to fetch
// a sovereign pricing quote. This avoids a direct import cycle.
type wltQuoter interface {
	CalculateQuote(context.Context, wlt.CalculatePricingQuoteRequest) (*wlt.WltPricingQuote, error)
}

func GetOrCreateActiveCart(ctx context.Context, db *sql.DB, wc wltQuoter, clientID, storeID string, mode FulfillmentMode) (*Cart, error) {
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
	c.Quote, err = FetchWltQuote(ctx, db, wc, &c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func GetCart(ctx context.Context, db *sql.DB, wc wltQuoter, clientID, storeID string) (*Cart, error) {
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
	c.Quote, err = FetchWltQuote(ctx, db, wc, &c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// GetActiveCartForClient reads the single active cart owned by the client
// without requiring the UI to guess or persist the store scope. The partial
// unique index on dsh_carts is the database authority for the single-cart
// invariant; this read only exposes that canonical owner to the client.
func GetActiveCartForClient(ctx context.Context, db *sql.DB, wc wltQuoter, clientID string) (*Cart, error) {
	var c Cart
	err := db.QueryRowContext(ctx,
		`SELECT id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at
		 FROM dsh_carts
		 WHERE client_id = $1 AND state = 'active'
		 ORDER BY updated_at DESC, id DESC
		 LIMIT 1`,
		clientID,
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
	c.Quote, err = FetchWltQuote(ctx, db, wc, &c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func UpsertItem(ctx context.Context, db *sql.DB, storeID, cartID string, input UpsertItemInput) (*CartItem, error) {
	if input.MasterProductID == "" || input.Quantity < 1 {
		return nil, ErrInvalid
	}
	if len(input.Note) > 500 {
		return nil, ErrInvalid
	}
	if input.FulfillmentMode != nil &&
		*input.FulfillmentMode != ModeBthwaniDelivery &&
		*input.FulfillmentMode != ModePartnerDelivery &&
		*input.FulfillmentMode != ModePickup {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	// Lock the cart before checking its version and resolving the assortment
	// snapshot. A pre-check on db followed by a later transaction lets two
	// concurrent mutations pass the same expected version.
	var currentVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT version
		FROM dsh_carts
		WHERE id = $1 AND store_id = $2 AND state = 'active'
		FOR UPDATE`, cartID, storeID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if input.ExpectedVersion != nil && currentVersion != *input.ExpectedVersion {
		return nil, ErrConflict
	}

	// Resolve one deterministic current assortment snapshot. The primitive is
	// fail-closed itself: it verifies the active cart belongs to the store,
	// storefront publication/approval, effective price, and the full inventory
	// quantity policy. Callers cannot bypass these rules by skipping an HTTP
	// handler-level precheck.
	var assortmentID, name, currency string
	var unitPriceMinorUnits int64
	var available bool
	err = tx.QueryRowContext(ctx, `
		SELECT
			a.id,
			mp.canonical_name_ar,
			COALESCE(p.amount_minor, 0),
			COALESCE(p.currency, ''),
			CASE
				WHEN c.id IS NULL THEN FALSE
				WHEN a.publication_status <> 'client_visible' OR a.available IS NOT TRUE THEN FALSE
				WHEN mp.approval_status <> 'approved' OR mp.is_active IS NOT TRUE THEN FALSE
				WHEN p.amount_minor IS NULL OR p.amount_minor <= 0 OR length(trim(p.currency)) <> 3 THEN FALSE
				WHEN i.store_assortment_id IS NULL OR i.step_quantity < 1 THEN FALSE
				WHEN $3 < i.min_order_quantity OR $3 > i.max_order_quantity THEN FALSE
				WHEN MOD($3 - i.min_order_quantity, i.step_quantity) <> 0 THEN FALSE
				WHEN i.policy_type = 'signal' AND i.quantity > 0 THEN TRUE
				WHEN i.policy_type = 'quantity' AND (i.quantity - i.reserved_quantity) >= $3 THEN TRUE
				WHEN i.policy_type = 'infinite' THEN TRUE
				ELSE FALSE
			END AS available
		FROM dsh_store_assortments a
		JOIN dsh_master_products mp ON mp.id = a.master_product_id
		LEFT JOIN dsh_carts c
		  ON c.id = $4::uuid
		 AND c.store_id = a.store_id
		 AND c.state = 'active'
		LEFT JOIN LATERAL (
			SELECT price.amount_minor, price.currency
			FROM dsh_store_assortment_prices price
			WHERE price.store_assortment_id = a.id
			  AND price.effective_from <= NOW()
			  AND (price.effective_until IS NULL OR price.effective_until > NOW())
			ORDER BY price.effective_from DESC, price.version DESC, price.id DESC
			LIMIT 1
		) p ON TRUE
		LEFT JOIN dsh_store_assortment_inventory i ON i.store_assortment_id = a.id
		WHERE a.store_id = $1
		  AND a.master_product_id = $2
		LIMIT 1`,
		storeID, input.MasterProductID, input.Quantity, cartID,
	).Scan(&assortmentID, &name, &unitPriceMinorUnits, &currency, &available)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInvalid
	}
	if err != nil {
		return nil, err
	}
	if !available || unitPriceMinorUnits <= 0 || currency == "" {
		return nil, ErrInvalid
	}
	optionsHash := hashOptions(input.Options)
	optionsJSON, _ := json.Marshal(input.Options)
	if input.Options == nil {
		optionsJSON = []byte("[]")
	}

	var item CartItem
	var optsBytes []byte
	err = tx.QueryRowContext(ctx,
		`INSERT INTO dsh_cart_items (cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price_minor, currency, quantity, options, note, options_hash)
		 VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 ON CONFLICT (cart_id, master_product_id, options_hash) DO UPDATE
		   SET quantity            = EXCLUDED.quantity,
		       store_assortment_id = EXCLUDED.store_assortment_id,
		       product_name        = EXCLUDED.product_name,
		       price_reference     = EXCLUDED.price_reference,
		       unit_price_minor    = EXCLUDED.unit_price_minor,
		       currency            = EXCLUDED.currency,
		       note                = EXCLUDED.note,
		       version             = dsh_cart_items.version + 1,
		       updated_at          = NOW()
		 RETURNING id, cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price_minor, currency, quantity, options, note, version, created_at, updated_at`,
		cartID, input.MasterProductID, assortmentID, name, "catalog", unitPriceMinorUnits, currency, input.Quantity, optionsJSON, input.Note, optionsHash,
	).Scan(&item.ID, &item.CartID, &item.ProductID, &item.MasterProductID, &item.StoreAssortmentID, &item.ProductName, &item.PriceReference, &item.UnitPriceMinorUnits, &item.Currency, &item.Quantity, &optsBytes, &item.Note, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(optsBytes, &item.Options)
	if item.Options == nil {
		item.Options = []string{}
	}

	if input.FulfillmentMode != nil {
		_, err = tx.ExecContext(ctx, `
			UPDATE dsh_carts
			SET fulfillment_mode = $1, version = version + 1, updated_at = NOW()
			WHERE id = $2`, *input.FulfillmentMode, cartID)
	} else {
		_, err = tx.ExecContext(ctx, `UPDATE dsh_carts SET version = version + 1, updated_at = NOW() WHERE id = $1`, cartID)
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &item, nil
}

func RemoveItem(ctx context.Context, db *sql.DB, cartID, itemID string, expectedVersion *int) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if expectedVersion != nil {
		var currentVersion int
		err := tx.QueryRowContext(ctx, `SELECT version FROM dsh_carts WHERE id = $1`, cartID).Scan(&currentVersion)
		if err != nil {
			return err
		}
		if currentVersion != *expectedVersion {
			return ErrConflict
		}
	}

	res, err := tx.ExecContext(ctx,
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

	_, err = tx.ExecContext(ctx, `UPDATE dsh_carts SET version = version + 1, updated_at = NOW() WHERE id = $1`, cartID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func ClearCart(ctx context.Context, db *sql.DB, cartID string, expectedVersion *int) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if expectedVersion != nil {
		var currentVersion int
		err := tx.QueryRowContext(ctx, `SELECT version FROM dsh_carts WHERE id = $1`, cartID).Scan(&currentVersion)
		if err != nil {
			return err
		}
		if currentVersion != *expectedVersion {
			return ErrConflict
		}
	}

	_, err = tx.ExecContext(ctx,
		`DELETE FROM dsh_cart_items WHERE cart_id = $1`,
		cartID,
	)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `UPDATE dsh_carts SET version = version + 1, updated_at = NOW() WHERE id = $1`, cartID)
	if err != nil {
		return err
	}

	return tx.Commit()
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

// CheckServiceability verifies that the store is active and in the serviceable state,
func normalizeCityCode(code string) string {
	code = strings.ToLower(strings.TrimSpace(code))
	switch code {
	case "sana", "sanaa", "sana'a", "صنعاء", "haddah", "maeen", "sabeen", "taiz-st", "zubairi", "old-city", "sanaa-haddah":
		return "sana"
	case "aden", "عدن":
		return "aden"
	case "taiz", "تعز":
		return "taiz"
	case "ibb", "إب":
		return "ibb"
	case "mukalla", "المكلا":
		return "mukalla"
	case "hodeidah", "الحديدة":
		return "hodeidah"
	default:
		return code
	}
}

// CheckServiceability determines if a store is active, published, and within physical range of a client,
// and reports which canonical checkout fulfillment modes are actually usable for this
// store+location combination. DSH only checks store-level and zone-level availability —
// delivery fee and zone pricing are WLT concerns.
func CheckServiceability(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string, clientLat, clientLng *float64) ServiceabilityResult {
	var storeStatus, serviceabilityStatus, storeServiceArea, storeCity string
	var distanceKM, storeLat, storeLng *float64
	var deliveryModes []string
	err := db.QueryRowContext(ctx,
		`SELECT status, serviceability_status, service_area_code, city_code, distance_km, latitude, longitude, delivery_modes FROM dsh_stores WHERE id = $1`,
		storeID,
	).Scan(&storeStatus, &serviceabilityStatus, &storeServiceArea, &storeCity, &distanceKM, &storeLat, &storeLng, pq.Array(&deliveryModes))
	if errors.Is(err, sql.ErrNoRows) {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store not found"}
	}
	if err != nil {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store lookup failed"}
	}
	if storeStatus != "published" {
		return ServiceabilityResult{
			Serviceable: false, Code: "store_unavailable", Reason: "store is not published",
			AvailableModes: allModesUnavailable("store_unavailable"),
		}
	}
	if serviceabilityStatus == "out_of_area" || serviceabilityStatus == "unavailable" {
		return ServiceabilityResult{
			Serviceable: false, Code: "store_unavailable", Reason: "store is not serviceable",
			AvailableModes: allModesUnavailable("store_unavailable"),
		}
	}

	// Calculate physical distance between client and store coordinates if both are provided
	var calculatedDistance *float64
	if clientLat != nil && clientLng != nil && storeLat != nil && storeLng != nil {
		dist := calculateDistanceKM(*clientLat, *clientLng, *storeLat, *storeLng)
		calculatedDistance = &dist
	} else {
		calculatedDistance = distanceKM
	}

	// Delivery coverage is at the city level:
	// A store can deliver across its entire city (e.g. Sana'a city-wide delivery within 35 km).
	normStoreCity := normalizeCityCode(storeCity)
	if normStoreCity == "" {
		normStoreCity = normalizeCityCode(storeServiceArea)
	}
	normClientCity := normalizeCityCode(serviceAreaCode)

	isSameCity := normStoreCity != "" && normClientCity != "" && normStoreCity == normClientCity
	isWithinDistance := calculatedDistance == nil || *calculatedDistance <= 35.0
	matchesZone := serviceAreaCode != "" && (storeServiceArea == serviceAreaCode || storeCity == serviceAreaCode)
	inZone := isSameCity || matchesZone || isWithinDistance

	availableModes := computeFulfillmentModeAvailability(deliveryModes, inZone)

	if !inZone {
		return ServiceabilityResult{
			Serviceable: false, Code: "out_of_area", Reason: "store outside requested service area",
			AvailableModes: availableModes,
		}
	}
	return ServiceabilityResult{Serviceable: true, Code: "serviceable", AvailableModes: availableModes}
}

// GetFulfillmentModes is the J051 lightweight mode capability fetcher.
// It uses the same zone check as CheckServiceability but only returns modes.
func GetFulfillmentModes(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string, clientLat, clientLng *float64) FulfillmentModesResponse {
	// Call CheckServiceability to run the identical store and zone constraints
	res := CheckServiceability(ctx, db, storeID, serviceAreaCode, clientLat, clientLng)

	// If check failed early without computing modes, fallback to all unavailable
	modes := res.AvailableModes
	if len(modes) == 0 {
		modes = allModesUnavailable("store_unavailable")
	}

	return FulfillmentModesResponse{
		StoreID:     storeID,
		Modes:       modes,
		EvaluatedAt: time.Now().UTC(),
	}
}

// computeFulfillmentModeAvailability derives per-mode availability from the
// store's enabled delivery modes and whether the client is in the store's
// serviceable zone. pickup never requires zone coverage — the customer
// travels to the store; bthwani_delivery/partner_delivery both require it.
func computeFulfillmentModeAvailability(storeDeliveryModes []string, inZone bool) []FulfillmentModeAvailability {
	enabled := make(map[FulfillmentMode]bool, len(storeDeliveryModes))
	for _, raw := range storeDeliveryModes {
		if mode, ok := storeDeliveryModeToFulfillmentMode[raw]; ok {
			enabled[mode] = true
		}
	}

	result := make([]FulfillmentModeAvailability, 0, 3)
	for _, mode := range []FulfillmentMode{ModeBthwaniDelivery, ModePartnerDelivery, ModePickup} {
		if !enabled[mode] {
			result = append(result, FulfillmentModeAvailability{Mode: mode, Available: false, UnavailableReasonCode: "mode_not_enabled"})
			continue
		}
		if mode != ModePickup && !inZone {
			result = append(result, FulfillmentModeAvailability{Mode: mode, Available: false, UnavailableReasonCode: "out_of_area"})
			continue
		}
		result = append(result, FulfillmentModeAvailability{Mode: mode, Available: true})
	}
	return result
}

// allModesUnavailable reports every canonical mode as unavailable with the
// same store-level reason code, for the early-exit store_unavailable paths.
func allModesUnavailable(reasonCode string) []FulfillmentModeAvailability {
	return []FulfillmentModeAvailability{
		{Mode: ModeBthwaniDelivery, Available: false, UnavailableReasonCode: reasonCode},
		{Mode: ModePartnerDelivery, Available: false, UnavailableReasonCode: reasonCode},
		{Mode: ModePickup, Available: false, UnavailableReasonCode: reasonCode},
	}
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
		`SELECT id, cart_id, product_id, master_product_id, store_assortment_id, product_name, price_reference, unit_price_minor, currency, quantity, options, note, version, created_at, updated_at
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
		var optsBytes []byte
		if err := rows.Scan(&item.ID, &item.CartID, &item.ProductID, &item.MasterProductID, &item.StoreAssortmentID, &item.ProductName, &item.PriceReference, &item.UnitPriceMinorUnits, &item.Currency, &item.Quantity, &optsBytes, &item.Note, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(optsBytes, &item.Options)
		if item.Options == nil {
			item.Options = []string{}
		}
		items = append(items, item)
	}
	if items == nil {
		items = []CartItem{}
	}
	return items, rows.Err()
}

// CartSnapshot is the priced total DSH computes from its own catalog price and
// currency snapshots at checkout handoff time. WLT receives this as the payment
// session's authoritative amount; DSH never lets a client dictate it.
type CartSnapshot struct {
	AmountMinorUnits int64
	Currency         string
	SnapshotHash     string
	CartVersion      int
	Lines            []CheckoutSnapshotLine
}

var (
	// ErrCartItemMissingPrice indicates a cart item has no positive price
	// snapshot, so checkout cannot compute a real amount for WLT.
	ErrCartItemMissingPrice = errors.New("cart item is missing a price snapshot")
	// ErrCartItemCurrency indicates a cart line has no currency snapshot or the
	// cart contains mixed currencies, which cannot form one payment amount.
	ErrCartItemCurrency = errors.New("cart item has invalid or mixed currency snapshot")
)

// ComputeCheckoutSnapshot sums the cart's priced items into a single minor-
// units amount plus a stable hash of (productId, quantity, unitPrice, currency)
// for every item, so WLT can detect if the priced cart changes between a
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
	currency := ""
	hasher := sha256.New()
	hasher.Write([]byte(cartID))
	for _, item := range items {
		if item.UnitPriceMinorUnits <= 0 {
			return nil, ErrCartItemMissingPrice
		}
		if item.Currency == "" {
			return nil, ErrCartItemCurrency
		}
		if currency == "" {
			currency = item.Currency
		} else if currency != item.Currency {
			return nil, ErrCartItemCurrency
		}
		unitMinorUnits := item.UnitPriceMinorUnits
		totalMinorUnits += unitMinorUnits * int64(item.Quantity)
		hasher.Write([]byte(fmt.Sprintf("|%s:%d:%d:%s", item.ProductID, item.Quantity, unitMinorUnits, item.Currency)))
	}

	return &CartSnapshot{
		AmountMinorUnits: totalMinorUnits,
		Currency:         currency,
		SnapshotHash:     hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}
