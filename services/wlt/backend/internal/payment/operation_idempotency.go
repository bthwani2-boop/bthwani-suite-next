package payment

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

type operationReceipt struct {
	ID          string
	TenantID    string
	RequestHash string
	State       string
}

type bufferedResponseWriter struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func newBufferedResponseWriter() *bufferedResponseWriter {
	return &bufferedResponseWriter{header: make(http.Header)}
}

func (w *bufferedResponseWriter) Header() http.Header { return w.header }
func (w *bufferedResponseWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}
func (w *bufferedResponseWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.body.Write(body)
}

func paymentOperationHash(tenantID, sessionID, operation string) string {
	sum := sha256.Sum256([]byte(tenantID + "\x1f" + sessionID + "\x1f" + operation))
	return hex.EncodeToString(sum[:])
}

// HandleGovernedPaymentOperation adds durable at-most-once replay semantics to
// an existing authorize/capture handler. The payment state claim still closes
// concurrent provider calls; this receipt additionally makes a retry after a
// process restart safe. An in-progress receipt deliberately blocks automatic
// retry because the provider outcome may already be real but not yet recorded.
func HandleGovernedPaymentOperation(db *sql.DB, operation string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		trustedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if sessionID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_PAYMENT_SESSION_ID", "paymentSessionId is required")
			return
		}
		if trustedTenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
			return
		}
		if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must contain between 8 and 200 characters")
			return
		}
		if correlationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}

		session, err := getSession(db, sessionID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PAYMENT_SESSION_READ_FAILED", "failed to read payment session")
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		if session.TenantID != trustedTenantID {
			shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "payment session does not belong to the trusted tenant")
			return
		}
		if session.PaymentMethod == "cod" {
			shared.SendError(w, http.StatusConflict, "USE_COD_RECORD_FLOW", "COD collection must use the governed COD record flow")
			return
		}

		requestHash := paymentOperationHash(trustedTenantID, sessionID, operation)
		receipt, inserted, err := claimOperationReceipt(db, trustedTenantID, sessionID, operation, idempotencyKey, requestHash, correlationID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "IDEMPOTENCY_RECEIPT_FAILED", "failed to claim payment operation")
			return
		}
		if !inserted {
			if receipt.RequestHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different payment operation payload")
				return
			}
			replayPaymentOperation(w, db, sessionID, receipt.State)
			return
		}

		recorder := newBufferedResponseWriter()
		next(recorder, r)
		state, responseStatus, providerReference := classifyOperationResult(db, sessionID, recorder.status)
		_ = finishOperationReceipt(db, receipt.ID, state, responseStatus, providerReference)

		for key, values := range recorder.Header() {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		w.WriteHeader(status)
		_, _ = w.Write(recorder.body.Bytes())
	}
}

func claimOperationReceipt(db *sql.DB, tenantID, sessionID, operation, key, requestHash, correlationID string) (operationReceipt, bool, error) {
	var receipt operationReceipt
	err := db.QueryRow(`
		INSERT INTO wlt_payment_operation_receipts
			(tenant_id, payment_session_id, operation, idempotency_key, request_hash, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (tenant_id, payment_session_id, operation, idempotency_key) DO NOTHING
		RETURNING id, tenant_id, request_hash, state`,
		tenantID, sessionID, operation, key, requestHash, correlationID,
	).Scan(&receipt.ID, &receipt.TenantID, &receipt.RequestHash, &receipt.State)
	if err == nil {
		return receipt, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return operationReceipt{}, false, err
	}
	err = db.QueryRow(`
		SELECT id, tenant_id, request_hash, state
		FROM wlt_payment_operation_receipts
		WHERE tenant_id = $1 AND payment_session_id = $2 AND operation = $3 AND idempotency_key = $4`,
		tenantID, sessionID, operation, key,
	).Scan(&receipt.ID, &receipt.TenantID, &receipt.RequestHash, &receipt.State)
	return receipt, false, err
}

func finishOperationReceipt(db *sql.DB, receiptID, state, responseStatus, providerReference string) error {
	_, err := db.Exec(`
		UPDATE wlt_payment_operation_receipts
		SET state = $2,
		    response_status = $3,
		    provider_reference = $4,
		    completed_at = CASE WHEN $2 = 'in_progress' THEN NULL ELSE NOW() END,
		    updated_at = NOW()
		WHERE id = $1`, receiptID, state, responseStatus, providerReference)
	return err
}

func classifyOperationResult(db *sql.DB, sessionID string, handlerStatus int) (string, string, string) {
	session, err := getSession(db, sessionID)
	if err != nil || session == nil {
		return "in_progress", "read_failed", ""
	}
	switch session.Status {
	case "authorized", "captured":
		return "completed", session.Status, session.ProviderReference
	case "provider_result_unknown":
		return "provider_result_unknown", session.Status, session.ProviderReference
	case "failed", "expired":
		return "failed", session.Status, session.ProviderReference
	default:
		if handlerStatus >= 400 && handlerStatus < 500 {
			return "failed", session.Status, session.ProviderReference
		}
		return "in_progress", session.Status, session.ProviderReference
	}
}

func replayPaymentOperation(w http.ResponseWriter, db *sql.DB, sessionID, receiptState string) {
	if receiptState == "in_progress" {
		shared.SendError(w, http.StatusConflict, "PAYMENT_OPERATION_IN_PROGRESS", "the original payment operation may still be in progress; refresh canonical status instead of repeating it")
		return
	}
	session, err := getSession(db, sessionID)
	if err != nil || session == nil {
		shared.SendError(w, http.StatusInternalServerError, "PAYMENT_OPERATION_REPLAY_FAILED", "failed to replay the payment operation result")
		return
	}
	status := http.StatusOK
	if receiptState == "provider_result_unknown" || receiptState == "failed" {
		status = http.StatusConflict
	}
	shared.SendJSON(w, status, map[string]any{
		"paymentSession":  session,
		"idempotentReplay": true,
		"receiptState":     receiptState,
	})
}
