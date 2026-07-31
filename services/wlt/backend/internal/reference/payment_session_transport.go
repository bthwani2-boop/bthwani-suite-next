package reference

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// UnmarshalJSON keeps the financial compatibility scope server-owned. The
// transport accepts business evidence only; operatorContextId is deliberately
// absent and therefore rejected by DisallowUnknownFields.
func (input *CreatePaymentSessionInput) UnmarshalJSON(data []byte) error {
	type transportInput struct {
		CheckoutIntentID           string `json:"checkoutIntentId"`
		SpecialRequestID           string `json:"specialRequestId"`
		SubscriptionPurchaseID     string `json:"subscriptionPurchaseId"`
		CommercialProductReference string `json:"commercialProductReference"`
		ClientID                   string `json:"clientId"`
		StoreID                    string `json:"storeId"`
		PaymentMethod              string `json:"paymentMethod"`
		AmountMinorUnits           int64  `json:"amountMinorUnits"`
		Currency                   string `json:"currency"`
		CartSnapshotHash           string `json:"cartSnapshotHash"`
	}

	var wire transportInput
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&wire); err != nil {
		return fmt.Errorf("decode payment session request: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		if err == nil {
			return fmt.Errorf("decode payment session request: multiple JSON values are not allowed")
		}
		return fmt.Errorf("decode payment session request: %w", err)
	}

	*input = CreatePaymentSessionInput{
		CheckoutIntentID:           wire.CheckoutIntentID,
		SpecialRequestID:           wire.SpecialRequestID,
		SubscriptionPurchaseID:     wire.SubscriptionPurchaseID,
		CommercialProductReference: wire.CommercialProductReference,
		ClientID:                   wire.ClientID,
		StoreID:                    wire.StoreID,
		PaymentMethod:              wire.PaymentMethod,
		AmountMinorUnits:           wire.AmountMinorUnits,
		Currency:                   wire.Currency,
		CartSnapshotHash:           wire.CartSnapshotHash,
	}
	return nil
}
