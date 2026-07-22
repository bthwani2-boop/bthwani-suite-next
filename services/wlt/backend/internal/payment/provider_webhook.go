package payment

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

const providerWebhookMaxSkew = 5 * time.Minute

type providerWebhookEnvelope struct {
	EventID           string `json:"eventId"`
	Type              string `json:"type"`
	TenantID          string `json:"tenantId"`
	PaymentSessionID  string `json:"paymentSessionId"`
	Status            string `json:"status"`
	ProviderReference string `json:"providerReference"`
	OccurredAt        string `json:"occurredAt"`
}

func verifyProviderWebhook(secret, timestampHeader, signatureHeader string, body []byte, now time.Time) (time.Time, bool) {
	if secret == "" || timestampHeader == "" || signatureHeader == "" {
		return time.Time{}, false
	}
	unixSeconds, err := strconv.ParseInt(timestampHeader, 10, 64)
	if err != nil {
		return time.Time{}, false
	}
	signedAt := time.Unix(unixSeconds, 0).UTC()
	if now.UTC().Sub(signedAt) > providerWebhookMaxSkew || signedAt.Sub(now.UTC()) > providerWebhookMaxSkew {
		return time.Time{}, false
	}
	provided := strings.TrimPrefix(strings.TrimSpace(signatureHeader), "sha256=")
	providedBytes, err := hex.DecodeString(provided)
	if err != nil {
		return time.Time{}, false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(timestampHeader))
	_, _ = mac.Write([]byte("."))
	_, _ = mac.Write(body)
	return signedAt, hmac.Equal(providedBytes, mac.Sum(nil))
}

func providerEventTypeForStatus(status string) string {
	switch status {
	case "authorized":
		return "payment.authorized"
	case "captured":
		return "payment.captured"
	case "failed":
		return "payment.failed"
	case "expired":
		return "payment.expired"
	default:
		return ""
	}
}

func HandlePaymentProviderWebhook(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secret := strings.TrimSpace(os.Getenv("WLT_PROVIDER_WEBHOOK_SECRET"))
		if secret == "" {
			shared.SendError(w, http.StatusServiceUnavailable, "WEBHOOK_NOT_CONFIGURED", "payment provider webhook secret is not configured")
			return
		}
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64*1024))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_WEBHOOK", "webhook body is invalid or too large")
			return
		}
		signedAt, valid := verifyProviderWebhook(secret, r.Header.Get("X-WLT-Provider-Timestamp"), r.Header.Get("X-WLT-Provider-Signature"), body, time.Now())
		if !valid {
			shared.SendError(w, http.StatusUnauthorized, "INVALID_WEBHOOK_SIGNATURE", "provider webhook signature is missing invalid or stale")
			return
		}
		var envelope providerWebhookEnvelope
		decoder := json.NewDecoder(bytes.NewReader(body))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&envelope); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_WEBHOOK", "provider webhook payload is invalid")
			return
		}
		if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
			shared.SendError(w, http.StatusBadRequest, "INVALID_WEBHOOK", "provider webhook payload must contain exactly one JSON object")
			return
		}
		expectedType := providerEventTypeForStatus(envelope.Status)
		if envelope.EventID == "" || envelope.TenantID == "" || envelope.PaymentSessionID == "" || expectedType == "" || envelope.Type != expectedType {
			shared.SendError(w, http.StatusBadRequest, "INVALID_WEBHOOK", "provider webhook identity type status tenant and paymentSessionId must be valid")
			return
		}
		payloadHashBytes := sha256.Sum256(body)
		payloadHash := hex.EncodeToString(payloadHashBytes[:])
		var occurredAt *time.Time
		if envelope.OccurredAt != "" {
			parsed, err := time.Parse(time.RFC3339, envelope.OccurredAt)
			if err != nil {
				shared.SendError(w, http.StatusBadRequest, "INVALID_WEBHOOK", "occurredAt must be RFC3339")
				return
			}
			parsed = parsed.UTC()
			occurredAt = &parsed
		}
		application, err := ApplyAuthoritativeProviderEvent(r.Context(), db, ProviderEventInput{
			EventID:           envelope.EventID,
			TenantID:          envelope.TenantID,
			PaymentSessionID:  envelope.PaymentSessionID,
			EventType:         envelope.Type,
			ProviderStatus:    envelope.Status,
			ProviderReference: envelope.ProviderReference,
			PayloadHash:       payloadHash,
			SignatureTime:     signedAt,
			OccurredAt:        occurredAt,
			ProcessingSource:  "signed_webhook",
		})
		if errors.Is(err, ErrProviderEventConflict) {
			shared.SendError(w, http.StatusConflict, "PROVIDER_EVENT_REPLAY_CONFLICT", err.Error())
			return
		}
		if errors.Is(err, ErrProviderTenantMismatch) {
			shared.SendError(w, http.StatusConflict, "PROVIDER_TENANT_MISMATCH", err.Error())
			return
		}
		if errors.Is(err, ErrIllegalProviderTransition) {
			shared.SendError(w, http.StatusConflict, "ILLEGAL_PAYMENT_TRANSITION", err.Error())
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WEBHOOK_PROCESSING_FAILED", "failed to apply provider webhook")
			return
		}
		if application == nil || application.Session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{
			"accepted":            true,
			"idempotentReplay":    application.IdempotentReplay,
			"paymentSession":      application.Session,
			"ledgerTransactionId": application.LedgerTransactionID,
		})
	}
}
