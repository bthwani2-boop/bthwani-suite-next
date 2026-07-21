package commercial

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

type CreateSubscriptionPaymentSessionInput struct {
	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
	ProductReference       string `json:"productReference"`
	TenantID               string `json:"tenantId"`
	ClientID               string `json:"clientId"`
	PaymentMethod          string `json:"paymentMethod"`
}

func CreateSubscriptionPaymentSession(
	db *sql.DB,
	input CreateSubscriptionPaymentSessionInput,
	idempotencyKey string,
	correlationID string,
) (*reference.PaymentSession, error) {
	input.SubscriptionPurchaseID = strings.TrimSpace(input.SubscriptionPurchaseID)
	input.ProductReference = strings.TrimSpace(input.ProductReference)
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.PaymentMethod = strings.TrimSpace(input.PaymentMethod)
	if db == nil || input.SubscriptionPurchaseID == "" || input.ProductReference == "" ||
		input.TenantID == "" || input.ClientID == "" || strings.TrimSpace(idempotencyKey) == "" ||
		strings.TrimSpace(correlationID) == "" {
		return nil, ErrInvalid
	}
	product, err := GetProduct(db, input.ProductReference)
	if err != nil {
		return nil, err
	}
	if product.Status != "active" {
		return nil, ErrInvalidTransition
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = "official_wallet"
	}
	if input.PaymentMethod == "cod" {
		return nil, ErrInvalid
	}
	return reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		SubscriptionPurchaseID:     input.SubscriptionPurchaseID,
		CommercialProductReference: input.ProductReference,
		TenantID:                   input.TenantID,
		ClientID:                   input.ClientID,
		StoreID:                    "platform-subscriptions",
		PaymentMethod:              input.PaymentMethod,
		AmountMinorUnits:           product.PriceMinorUnits,
		Currency:                   product.Currency,
		CartSnapshotHash:           "subscription:" + input.ProductReference,
		IdempotencyKey:             strings.TrimSpace(idempotencyKey),
		CorrelationID:              strings.TrimSpace(correlationID),
	})
}

func HandleCreateSubscriptionPaymentSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CreateSubscriptionPaymentSessionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		if idempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
			return
		}
		if correlationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}
		session, err := CreateSubscriptionPaymentSession(db, input, idempotencyKey, correlationID)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}
