package payment

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

func HandleRefreshProviderStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.PathValue("paymentSessionId")
		session, err := getSession(db, sessionID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PAYMENT_SESSION_READ_FAILED", "failed to read payment session")
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		trustedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if trustedTenantID == "" || trustedTenantID != session.TenantID {
			shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "payment session does not belong to the trusted tenant")
			return
		}
		if session.Status == "captured" || session.Status == "failed" || session.Status == "expired" {
			shared.SendJSON(w, http.StatusOK, map[string]any{
				"paymentSession": session,
				"providerRefreshSkipped": true,
				"reason": "session is already terminal",
			})
			return
		}
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		result, err := client.Post(r.Context(), "/financial/card/status", map[string]any{
			"paymentSessionId":  session.ID,
			"providerReference": session.ProviderReference,
			"amountMinorUnits":  session.AmountMinorUnits,
			"currency":          session.Currency,
		}, provider.RequestMetaFromHTTP(r, "wlt-provider-status-refresh"))
		if err != nil {
			shared.SendProviderError(w, err)
			return
		}
		eventType := providerEventTypeForStatus(result.Status)
		if eventType == "" {
			shared.SendError(w, http.StatusBadGateway, "INVALID_PROVIDER_STATUS", "provider status response is not recognized")
			return
		}
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		eventID := "refresh:" + session.ID + ":" + idempotencyKey
		payload := fmt.Sprintf("%s\x1f%s\x1f%s\x1f%s", session.TenantID, session.ID, result.Status, result.ProviderReference)
		hash := sha256.Sum256([]byte(payload))
		application, err := ApplyAuthoritativeProviderEvent(r.Context(), db, ProviderEventInput{
			EventID:            eventID,
			TenantID:           session.TenantID,
			PaymentSessionID:   session.ID,
			EventType:          eventType,
			ProviderStatus:     result.Status,
			ProviderReference:  result.ProviderReference,
			PayloadHash:        hex.EncodeToString(hash[:]),
			SignatureTime:      time.Now().UTC(),
			ProcessingSource:   "provider_status_refresh",
		})
		if errors.Is(err, ErrProviderEventConflict) {
			shared.SendError(w, http.StatusConflict, "PROVIDER_EVENT_REPLAY_CONFLICT", err.Error())
			return
		}
		if errors.Is(err, ErrIllegalProviderTransition) {
			shared.SendError(w, http.StatusConflict, "ILLEGAL_PAYMENT_TRANSITION", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PROVIDER_STATUS_APPLY_FAILED", "failed to apply provider status")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{
			"paymentSession":      application.Session,
			"idempotentReplay":    application.IdempotentReplay,
			"ledgerTransactionId": application.LedgerTransactionID,
		})
	}
}
