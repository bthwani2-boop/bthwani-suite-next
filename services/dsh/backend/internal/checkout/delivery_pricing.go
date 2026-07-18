package checkout

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrDeliveryPricingUnavailable = errors.New("delivery pricing unavailable")

type DeliveryPricingPolicy struct {
	StoreID          string `json:"storeId"`
	FulfillmentMode  string `json:"fulfillmentMode"`
	FeeMinorUnits    int64  `json:"feeMinorUnits"`
	Currency         string `json:"currency"`
	Status           string `json:"status"`
	PricingSource    string `json:"pricingSource"`
	Version          int    `json:"version"`
}

func ResolveDeliveryPricingTx(
	ctx context.Context,
	tx *sql.Tx,
	storeID, fulfillmentMode string,
) (DeliveryPricingPolicy, error) {
	if storeID == "" || fulfillmentMode == "" {
		return DeliveryPricingPolicy{}, ErrInvalid
	}
	var policy DeliveryPricingPolicy
	err := tx.QueryRowContext(ctx, `
		SELECT store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,version
		FROM dsh_store_delivery_pricing
		WHERE store_id=$1 AND fulfillment_mode=$2 AND status='active'
		FOR SHARE`, storeID, fulfillmentMode).Scan(
		&policy.StoreID, &policy.FulfillmentMode, &policy.FeeMinorUnits,
		&policy.Currency, &policy.Status, &policy.PricingSource, &policy.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return DeliveryPricingPolicy{}, fmt.Errorf("%w: no active policy for store and fulfillment mode", ErrDeliveryPricingUnavailable)
	}
	if err != nil {
		return DeliveryPricingPolicy{}, err
	}
	if policy.FeeMinorUnits < 0 || policy.Currency == "" {
		return DeliveryPricingPolicy{}, ErrDeliveryPricingUnavailable
	}
	return policy, nil
}
