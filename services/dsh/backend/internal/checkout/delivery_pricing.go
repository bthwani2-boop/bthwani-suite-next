package checkout

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrDeliveryPricingUnavailable = errors.New("delivery pricing unavailable")

type DeliveryPricingPolicy struct {
	StoreID         string `json:"storeId"`
	FulfillmentMode string `json:"fulfillmentMode"`
	FeeMinorUnits   int64  `json:"feeMinorUnits"`
	Currency        string `json:"currency"`
	Status          string `json:"status"`
	PricingSource   string `json:"pricingSource"`
	Version         int    `json:"version"`
}

func ResolveDeliveryPricingTx(
	ctx context.Context,
	tx *sql.Tx,
	storeID, fulfillmentMode string,
) (DeliveryPricingPolicy, error) {
	if storeID == "" || fulfillmentMode == "" {
		return DeliveryPricingPolicy{}, ErrInvalid
	}
	if fulfillmentMode != string(ModeBthwaniDelivery) &&
		fulfillmentMode != string(ModePartnerDelivery) &&
		fulfillmentMode != string(ModePickup) {
		return DeliveryPricingPolicy{}, ErrInvalid
	}
	var policy DeliveryPricingPolicy
	err := tx.QueryRowContext(ctx, `
		SELECT p.store_id,p.fulfillment_mode,p.fee_minor_units,p.currency,p.status,p.pricing_source,p.version
		FROM dsh_store_delivery_pricing p
		JOIN dsh_stores s ON s.id = p.store_id
		WHERE p.store_id=$1 AND p.fulfillment_mode=$2 AND p.status='active'
		  AND s.status='active'
		  AND (
		    ($2='bthwani_delivery' AND 'express'=ANY(s.delivery_modes)) OR
		    ($2='partner_delivery' AND 'delivery'=ANY(s.delivery_modes)) OR
		    ($2='pickup' AND 'pickup'=ANY(s.delivery_modes))
		  )
		FOR SHARE OF p, s`, storeID, fulfillmentMode).Scan(
		&policy.StoreID, &policy.FulfillmentMode, &policy.FeeMinorUnits,
		&policy.Currency, &policy.Status, &policy.PricingSource, &policy.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return DeliveryPricingPolicy{}, fmt.Errorf("%w: mode is not enabled or has no active policy", ErrDeliveryPricingUnavailable)
	}
	if err != nil {
		return DeliveryPricingPolicy{}, err
	}
	if policy.FeeMinorUnits < 0 || policy.Currency == "" {
		return DeliveryPricingPolicy{}, ErrDeliveryPricingUnavailable
	}
	return policy, nil
}
