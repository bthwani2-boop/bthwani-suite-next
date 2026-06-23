package cart

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound    = errors.New("cart not found")
	ErrConflict    = errors.New("cart version conflict")
	ErrInvalid     = errors.New("invalid cart input")
	ErrStoreGone   = errors.New("store no longer active")
	ErrOutOfArea   = errors.New("store outside serviceable area")
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery FulfillmentMode = "partner_delivery"
	ModePickup          FulfillmentMode = "pickup"
)

type CartItem struct {
	ID             string    `json:"id"`
	CartID         string    `json:"cartId"`
	ProductID      string    `json:"productId"`
	ProductName    string    `json:"productName"`
	PriceReference string    `json:"priceReference"`
	Quantity       int       `json:"quantity"`
	Version        int       `json:"version"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
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
	ProductID      string `json:"productId"`
	ProductName    string `json:"productName"`
	PriceReference string `json:"priceReference"`
	Quantity       int    `json:"quantity"`
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

func UpsertItem(ctx context.Context, db *sql.DB, cartID string, input UpsertItemInput) (*CartItem, error) {
	if input.ProductID == "" || input.ProductName == "" || input.Quantity < 1 {
		return nil, ErrInvalid
	}
	var item CartItem
	err := db.QueryRowContext(ctx,
		`INSERT INTO dsh_cart_items (cart_id, product_id, product_name, price_reference, quantity)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (cart_id, product_id) DO UPDATE
		   SET quantity        = EXCLUDED.quantity,
		       product_name    = EXCLUDED.product_name,
		       price_reference = EXCLUDED.price_reference,
		       version         = dsh_cart_items.version + 1,
		       updated_at      = NOW()
		 RETURNING id, cart_id, product_id, product_name, price_reference, quantity, version, created_at, updated_at`,
		cartID, input.ProductID, input.ProductName, input.PriceReference, input.Quantity,
	).Scan(&item.ID, &item.CartID, &item.ProductID, &item.ProductName, &item.PriceReference, &item.Quantity, &item.Version, &item.CreatedAt, &item.UpdatedAt)
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

// CheckServiceability verifies that the store is active and in the serviceable state.
// DSH only checks store-level availability — delivery fee and zone pricing are WLT concerns.
func CheckServiceability(ctx context.Context, db *sql.DB, storeID, serviceAreaCode string) ServiceabilityResult {
	var storeStatus, serviceabilityStatus, storeServiceArea string
	err := db.QueryRowContext(ctx,
		`SELECT status, serviceability_status, service_area_code FROM dsh_stores WHERE id = $1`,
		storeID,
	).Scan(&storeStatus, &serviceabilityStatus, &storeServiceArea)
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
	if serviceAreaCode != "" && storeServiceArea != "" && storeServiceArea != serviceAreaCode {
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
		`SELECT id, cart_id, product_id, product_name, price_reference, quantity, version, created_at, updated_at
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
		if err := rows.Scan(&item.ID, &item.CartID, &item.ProductID, &item.ProductName, &item.PriceReference, &item.Quantity, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []CartItem{}
	}
	return items, rows.Err()
}
