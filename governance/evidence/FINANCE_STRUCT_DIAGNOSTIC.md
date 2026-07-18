# Finance Struct Diagnostic

```text
services/dsh/backend/internal/wlt/subscription_purchase.go-26-	CapturedAt                 *string `json:"capturedAt,omitempty"`
services/dsh/backend/internal/wlt/subscription_purchase.go-27-	CreatedAt                  string  `json:"createdAt"`
services/dsh/backend/internal/wlt/subscription_purchase.go-28-	UpdatedAt                  string  `json:"updatedAt"`
services/dsh/backend/internal/wlt/subscription_purchase.go-29-}
services/dsh/backend/internal/wlt/subscription_purchase.go-30-
services/dsh/backend/internal/wlt/subscription_purchase.go:31:type CreateSubscriptionPaymentSessionInput struct {
services/dsh/backend/internal/wlt/subscription_purchase.go-32-	SubscriptionPurchaseID     string `json:"subscriptionPurchaseId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-33-	CommercialProductReference string `json:"commercialProductReference"`
services/dsh/backend/internal/wlt/subscription_purchase.go-34-	TenantID                   string `json:"tenantId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-35-	ClientID                   string `json:"clientId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-36-	StoreID                    string `json:"storeId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-37-	PaymentMethod              string `json:"paymentMethod"`
services/dsh/backend/internal/wlt/subscription_purchase.go-38-	AmountMinorUnits           int64  `json:"amountMinorUnits"`
services/dsh/backend/internal/wlt/subscription_purchase.go-39-	Currency                   string `json:"currency"`
services/dsh/backend/internal/wlt/subscription_purchase.go-40-	CartSnapshotHash           string `json:"cartSnapshotHash"`
services/dsh/backend/internal/wlt/subscription_purchase.go-41-}
services/dsh/backend/internal/wlt/subscription_purchase.go-42-
services/dsh/backend/internal/wlt/subscription_purchase.go-43-type ActivateCommercialSubscriptionInput struct {
services/dsh/backend/internal/wlt/subscription_purchase.go-44-	ClientID               string `json:"clientId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-45-	ProductReference       string `json:"productReference"`
services/dsh/backend/internal/wlt/subscription_purchase.go-46-	PaymentSessionID       string `json:"paymentSessionId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-47-	SubscriptionPurchaseID string `json:"subscriptionPurchaseId"`
services/dsh/backend/internal/wlt/subscription_purchase.go-48-}
services/dsh/backend/internal/wlt/subscription_purchase.go-49-
services/dsh/backend/internal/wlt/subscription_purchase.go-50-func (c *Client) commercialMutationRequest(
services/dsh/backend/internal/wlt/subscription_purchase.go-51-	ctx context.Context,

services/dsh/backend/internal/wlt/subscription_payment_generic.go:26:			"commercialProductReference": input.ProductReference,
services/dsh/backend/internal/wlt/subscription_payment_generic.go:33:			"cartSnapshotHash":           "subscription:" + input.ProductReference,
services/dsh/backend/internal/wlt/subscription_purchase.go:17:	CommercialProductReference *string `json:"commercialProductReference,omitempty"`
services/dsh/backend/internal/wlt/subscription_purchase.go:33:	CommercialProductReference string `json:"commercialProductReference"`
services/dsh/backend/internal/wlt/subscription_purchase.go:45:	ProductReference       string `json:"productReference"`
services/dsh/backend/internal/wlt/commercial.go:73:	ProductReference string  `json:"productReference"`
services/dsh/backend/internal/wlt/subscription_payment_bound.go:10:	ProductReference       string
services/dsh/backend/internal/wlt/subscription_payment_bound.go:33:			"commercialProductReference": input.ProductReference,
services/dsh/backend/internal/wlt/subscription_payment_bound.go:40:			"cartSnapshotHash":           "subscription:" + input.ProductReference,
```
