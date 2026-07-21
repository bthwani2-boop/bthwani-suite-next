package reference

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleCreatePaymentSessionTrustedDsh accepts tenant identity only from an
// authenticated DSH service request. The generic payment-session route is
// intentionally restricted to checkout and special-request sources because
// that is the source union documented by wlt.openapi.yaml. Subscription
// purchases use the dedicated /wlt/commercial/payment-sessions route.
func HandleCreatePaymentSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreatePaymentSessionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		if strings.TrimSpace(input.SubscriptionPurchaseID) != "" || strings.TrimSpace(input.CommercialProductReference) != "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_SOURCE", "subscription purchases must use /wlt/commercial/payment-sessions")
			return
		}
		payloadTenantID := strings.TrimSpace(input.TenantID)
		assertedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if payloadTenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "tenantId is required for payment-session creation")
			return
		}
		if assertedTenantID != "" && assertedTenantID != payloadTenantID {
			shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", ErrTenantMismatch.Error())
			return
		}
		input.TenantID = payloadTenantID
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		if input.IdempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
			return
		}
		if input.CorrelationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}
		session, err := CreatePaymentSession(db, input)
		if errors.Is(err, ErrIdempotencyConflict) {
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "payment source was already used with a different payload")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}
