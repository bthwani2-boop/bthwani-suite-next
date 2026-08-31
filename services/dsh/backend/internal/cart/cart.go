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

	"dsh-api/internal/checkout"
	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/wlt"
	"github.com/lib/pq"
)

var (
	ErrNotFound                = errors.New("cart not found")
	ErrConflict                = errors.New("cart version conflict")
	ErrInvalid                 = errors.New("invalid cart input")
	ErrMutationReceiptNotFound = errors.New("cart mutation receipt not found")
	ErrStoreGone               = errors.New("store no longer active")
	ErrOutOfArea               = errors.New("store outside serviceable area")
	ErrFinancialUnavailable    = errors.New("canonical financial quote is unavailable")
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

// MutationReceipt is durable server-side proof that a cart mutation was
// committed for the authenticated client. Reads are always scoped by client_id
// and the idempotency key; the receipt table is never queried by key alone.
type MutationReceipt struct {
	IdempotencyKey string
	Operation      string
	CartID         *string
	ItemID         *string
	Version        int
	ResultDeleted  bool
	CreatedAt      time.Time
}

func FindMutationReceipt(ctx context.Context, db *sql.DB, clientID, idempotencyKey string) (*MutationReceipt, error) {
	if db == nil || strings.TrimSpace(clientID) == "" || strings.TrimSpace(idempotencyKey) == "" {
		return nil, ErrMutationReceiptNotFound
	}

	receipt := &MutationReceipt{}
	var cartID sql.NullString
	var itemID sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT idempotency_key, operation, cart_id::text, item_id::text,
		       result_version, result_deleted, created_at
		FROM dsh_cart_mutation_receipts
		WHERE client_id = $1 AND idempotency_key = $2
		LIMIT 1
	`, clientID, idempotencyKey).Scan(
		&receipt.IdempotencyKey,
		&receipt.Operation,
		&cartID,
		&itemID,
		&receipt.Version,
		&receipt.ResultDeleted,
		&receipt.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrMutationReceiptNotFound
	}
	if err != nil {
		return nil, err
	}
	if cartID.Valid {
		value := cartID.String
		receipt.CartID = &value
	}
	if itemID.Valid {
		value := itemID.String
		receipt.ItemID = &value
	}
	return receipt, nil
}

// FetchDeliveryFeeMinorUnits resolves the active, mode-scoped delivery policy
// through checkout's canonical resolver. DSH owns the operational input, but
// the policy table and its store/mode eligibility rules have one authority.
func FetchDeliveryFeeMinorUnits(ctx context.Context, db *sql.DB, storeID string, fulfillmentMode FulfillmentMode) (int64, error) {
	if db == nil || strings.TrimSpace(storeID) == "" || strings.TrimSpace(string(fulfillmentMode)) == "" {
		return 0, fmt.Errorf("%w: delivery fee store scope is missing", ErrFinancialUnavailable)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("%w: begin delivery policy read: %v", ErrFinancialUnavailable, err)
	}
	defer tx.Rollback() //nolint:errcheck

	policy, err := checkout.ResolveDeliveryPricingTx(ctx, tx, storeID, string(fulfillmentMode))
	if err != nil {
		return 0, fmt.Errorf("%w: resolve delivery policy: %v", ErrFinancialUnavailable, err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("%w: commit delivery policy read: %v", ErrFinancialUnavailable, err)
	}
	return policy.FeeMinorUnits, nil
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

	// Cart readback has no checkout intent yet, but WLT still requires a stable
	// mutation correlation. Reuse the canonical priced-cart snapshot hash so the
	// correlation changes exactly when the immutable cart pricing inputs change.
	snapshot, err := computeCheckoutSnapshotFromItems(c.ID, c.Items)
	if err != nil {
		return nil, fmt.Errorf("%w: compute cart pricing snapshot: %v", ErrFinancialUnavailable, err)
	}

	deliveryFee, err := FetchDeliveryFeeMinorUnits(ctx, db, c.StoreID, c.FulfillmentMode)
	if err != nil {
		return nil, err
	}

	quote, err := wltClient.CalculateQuote(ctx, wlt.CalculatePricingQuoteRequest{
		ClientID:         c.ClientID,
		StoreID:          c.StoreID,
		Currency:         currency,
		CartVersion:      c.Version,
		CartSnapshotHash: snapshot.SnapshotHash,
		Lines:            lines,
		PricingEvidence: wlt.PricingEvidence{
			Version:               c.Version,
			DeliveryFeeMinorUnits: deliveryFee,
			ServiceFeeMinorUnits:  0,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("%w: WLT pricing quote: %v", ErrFinancialUnavailable, err)
	}
	// Cart readback uses WLT's non-issued preview quote, which intentionally has
	// no persisted ID. Its immutable financial proof is the quote hash plus a
	// live expiry; issued checkout quotes are validated more strictly at checkout.
	if quote == nil || strings.TrimSpace(quote.Hash) == "" || quote.ExpiresAt == nil || !quote.ExpiresAt.After(time.Now().UTC()) {
		return nil, fmt.Errorf("%w: WLT returned an empty or expired quote", ErrFinancialUnavailable)
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
	if err := validateUpsertItemInput(input); err != nil {
		return nil, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	item, err := upsertItemTx(ctx, tx, storeID, cartID, input)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return item, nil
}

func RemoveItem(ctx context.Context, db *sql.DB, cartID, itemID string, expectedVersion *int) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

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
	defer func() { _ = tx.Rollback() }()

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
func CheckServiceability(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string, clientLat, clientLng *float64) (ServiceabilityResult, error) {
	var storeStatus, serviceabilityStatus, storeServiceArea, storeCity string
	var distanceKM, storeLat, storeLng *float64
	var deliveryModes []string
	err := db.QueryRowContext(ctx,
		`SELECT status, serviceability_status, service_area_code, city_code, distance_km, latitude, longitude, delivery_modes FROM dsh_stores WHERE id = $1`,
		storeID,
	).Scan(&storeStatus, &serviceabilityStatus, &storeServiceArea, &storeCity, &distanceKM, &storeLat, &storeLng, pq.Array(&deliveryModes))
	if errors.Is(err, sql.ErrNoRows) {
		return ServiceabilityResult{Serviceable: false, Code: "store_unavailable", Reason: "store not found"}, nil
	}
	if err != nil {
		return ServiceabilityResult{}, fmt.Errorf("%w: store serviceability read: %v", platformpolicies.ErrPolicyTruthUnavailable, err)
	}
	if storeStatus != "published" {
		return ServiceabilityResult{
			Serviceable: false, Code: "store_unavailable", Reason: "store is not published",
			AvailableModes: allModesUnavailable("store_unavailable"),
		}, nil
	}
	if serviceabilityStatus == "out_of_area" || serviceabilityStatus == "unavailable" {
		return ServiceabilityResult{
			Serviceable: false, Code: "store_unavailable", Reason: "store is not serviceable",
			AvailableModes: allModesUnavailable("store_unavailable"),
		}, nil
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
		}, nil
	}
	return ServiceabilityResult{Serviceable: true, Code: "serviceable", AvailableModes: availableModes}, nil
}

// GetFulfillmentModes is the J051 lightweight mode capability fetcher.
// It uses the same zone check as CheckServiceability but only returns modes.
func GetFulfillmentModes(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string, clientLat, clientLng *float64) (FulfillmentModesResponse, error) {
	// Call CheckServiceability to run the identical store and zone constraints
	res, err := CheckServiceability(ctx, db, storeID, serviceAreaCode, clientLat, clientLng)
	if err != nil {
		return FulfillmentModesResponse{}, err
	}

	// If check failed early without computing modes, fallback to all unavailable
	modes := res.AvailableModes
	if len(modes) == 0 {
		modes = allModesUnavailable("store_unavailable")
	}

	return FulfillmentModesResponse{
		StoreID:     storeID,
		Modes:       modes,
		EvaluatedAt: time.Now().UTC(),
	}, nil
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
	defer func() { _ = rows.Close() }()
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
	defer func() { _ = rows.Close() }()
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
	return computeCheckoutSnapshotFromItems(cartID, items)
}

func computeCheckoutSnapshotFromItems(cartID string, items []CartItem) (*CartSnapshot, error) {
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
		_, _ = fmt.Fprintf(hasher, "|%s:%d:%d:%s", item.ProductID, item.Quantity, unitMinorUnits, item.Currency)
	}

	return &CartSnapshot{
		AmountMinorUnits: totalMinorUnits,
		Currency:         currency,
		SnapshotHash:     hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}
