package orders

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"dsh-api/internal/coupons"
)

// CreatePricedOrder creates the order from the immutable checkout pricing
// snapshot and commits any reserved coupon in the same database transaction.
func CreatePricedOrder(db *sql.DB, input CreateOrderInput) (*Order, error) {
	if input.CheckoutIntentID == "" || input.ClientID == "" {
		return nil, ErrInvalid
	}
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var cartID, storeID, wltPaymentSessionID, fulfillmentMode string
	var subtotalMinorUnits, discountMinorUnits, totalMinorUnits int64
	var currency, pricingSnapshotHash, couponID, couponRedemptionID, couponCodeLast4 string
	err = tx.QueryRow(`
		SELECT cart_id::text,store_id,wlt_payment_session_id,fulfillment_mode,
			subtotal_minor_units,discount_minor_units,total_minor_units,currency,
			pricing_snapshot_hash,COALESCE(coupon_id::text,''),
			COALESCE(coupon_redemption_id::text,''),coupon_code_last4
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND client_id=$2 AND wlt_payment_session_id<>''
		  AND ((state='payment_pending' AND payment_method='cod') OR state='payment_confirmed')
		FOR UPDATE`, input.CheckoutIntentID, input.ClientID).Scan(
		&cartID, &storeID, &wltPaymentSessionID, &fulfillmentMode,
		&subtotalMinorUnits, &discountMinorUnits, &totalMinorUnits, &currency,
		&pricingSnapshotHash, &couponID, &couponRedemptionID, &couponCodeLast4,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: checkout intent is not ready for order creation", ErrConflict)
	}
	if err != nil {
		return nil, err
	}
	if subtotalMinorUnits <= 0 || totalMinorUnits <= 0 || totalMinorUnits != subtotalMinorUnits-discountMinorUnits || currency == "" || pricingSnapshotHash == "" {
		return nil, fmt.Errorf("%w: checkout pricing snapshot is invalid", ErrInvalid)
	}

	rows, err := tx.Query(`SELECT product_id,product_name,unit_price,quantity
		FROM dsh_cart_items WHERE cart_id=$1::uuid ORDER BY created_at`, cartID)
	if err != nil {
		return nil, err
	}
	var items []CreateOrderItemInput
	for rows.Next() {
		var item CreateOrderItemInput
		if err := rows.Scan(&item.ProductID, &item.ProductName, &item.UnitPrice, &item.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		if item.UnitPrice <= 0 || item.Quantity <= 0 {
			rows.Close()
			return nil, fmt.Errorf("%w: cart item is missing a price snapshot", ErrInvalid)
		}
		items = append(items, item)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: checkout cart has no items", ErrInvalid)
	}

	var order Order
	err = tx.QueryRow(`
		INSERT INTO dsh_orders
			(checkout_intent_id,store_id,fulfillment_mode,client_id,status,wlt_payment_ref_id,
			subtotal_minor_units,discount_minor_units,total_minor_units,currency,
			pricing_snapshot_hash,coupon_id,coupon_redemption_id,coupon_code_last4)
		VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
			NULLIF($12,'')::uuid,NULLIF($13,'')::uuid,$14)
		RETURNING id::text,checkout_intent_id::text,store_id,fulfillment_mode,client_id,status,
			COALESCE(rejection_reason,''),wlt_payment_ref_id,created_at,updated_at`,
		input.CheckoutIntentID, storeID, fulfillmentMode, input.ClientID, string(StatusPending),
		wltPaymentSessionID, subtotalMinorUnits, discountMinorUnits, totalMinorUnits, currency,
		pricingSnapshotHash, couponID, couponRedemptionID, couponCodeLast4).Scan(
		&order.ID, &order.CheckoutIntentID, &order.StoreID, &order.FulfillmentMode,
		&order.ClientID, &order.Status, &order.RejectionReason, &order.WltPaymentRefID,
		&order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		var orderItem OrderItem
		err = tx.QueryRow(`INSERT INTO dsh_order_items
			(order_id,product_id,product_name,quantity,unit_price)
			VALUES ($1::uuid,$2,$3,$4,$5)
			RETURNING id::text,order_id::text,product_id,product_name,quantity,unit_price`,
			order.ID, item.ProductID, item.ProductName, item.Quantity, item.UnitPrice).Scan(
			&orderItem.ID, &orderItem.OrderID, &orderItem.ProductID,
			&orderItem.ProductName, &orderItem.Quantity, &orderItem.UnitPrice,
		)
		if err != nil {
			return nil, err
		}
		order.Items = append(order.Items, orderItem)
	}

	if _, err = tx.Exec(`INSERT INTO dsh_order_status_events
		(order_id,actor_role,from_status,to_status,note)
		VALUES ($1::uuid,'system','',$2,'order created from immutable pricing snapshot')`,
		order.ID, string(StatusPending)); err != nil {
		return nil, err
	}
	if err := coupons.CommitByIntentTx(context.Background(), tx, input.CheckoutIntentID, order.ID); err != nil {
		if errors.Is(err, coupons.ErrNotEligible) {
			return nil, fmt.Errorf("%w: coupon reservation is not commit-ready", ErrConflict)
		}
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE dsh_checkout_intents SET state='confirmed',version=version+1,updated_at=NOW()
		WHERE id=$1::uuid AND client_id=$2`, input.CheckoutIntentID, input.ClientID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE dsh_carts SET state='checked_out',version=version+1,updated_at=NOW()
		WHERE id=$1::uuid`, cartID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &order, nil
}
