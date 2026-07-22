package refund

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

const maxRefundMutationBodyBytes = 64 * 1024

type refundMutationReceipt struct {
	ID                  string
	RequestHash         string
	Status              string
	ResponseStatus      sql.NullInt64
	ResponseContentType sql.NullString
	ResponseBody        sql.NullString
}

type bufferedRefundResponse struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func newBufferedRefundResponse() *bufferedRefundResponse {
	return &bufferedRefundResponse{header: make(http.Header)}
}

func (w *bufferedRefundResponse) Header() http.Header { return w.header }

func (w *bufferedRefundResponse) WriteHeader(status int) {
	if w.status != 0 {
		return
	}
	w.status = status
}

func (w *bufferedRefundResponse) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.body.Write(body)
}

func canonicalRefundMutationBody(raw []byte) []byte {
	if len(bytes.TrimSpace(raw)) == 0 {
		return []byte("{}")
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return bytes.TrimSpace(raw)
	}
	canonical, err := json.Marshal(value)
	if err != nil {
		return bytes.TrimSpace(raw)
	}
	return canonical
}

func refundMutationRequestHash(operation, tenantID, path string, body []byte) string {
	digest := sha256.Sum256([]byte(operation + "\n" + tenantID + "\n" + path + "\n" + string(canonicalRefundMutationBody(body))))
	return hex.EncodeToString(digest[:])
}

func refundMutationEvidence(body []byte) (actorID, reason string) {
	var value map[string]any
	if json.Unmarshal(body, &value) != nil {
		return "", ""
	}
	for _, key := range []string{"operatorId", "requestedByOperatorId"} {
		if candidate, ok := value[key].(string); ok && strings.TrimSpace(candidate) != "" {
			actorID = strings.TrimSpace(candidate)
			break
		}
	}
	for _, key := range []string{"reason", "evidenceNote"} {
		if candidate, ok := value[key].(string); ok && strings.TrimSpace(candidate) != "" {
			reason = strings.TrimSpace(candidate)
			break
		}
	}
	return actorID, reason
}

func claimRefundMutationReceipt(
	db *sql.DB,
	tenantID, operation, path, idempotencyKey, requestHash, actorID, reason, correlationID string,
	body []byte,
) (*refundMutationReceipt, bool, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	var receipt refundMutationReceipt
	err = tx.QueryRow(`
		INSERT INTO wlt_refund_operation_receipts
			(tenant_id,operation,request_path,idempotency_key,request_hash,actor_id,reason,correlation_id,request_body)
		VALUES($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),$9)
		ON CONFLICT DO NOTHING
		RETURNING id::text,request_hash,status,response_status,response_content_type,response_body`,
		tenantID, operation, path, idempotencyKey, requestHash, actorID, reason, correlationID, string(canonicalRefundMutationBody(body)),
	).Scan(&receipt.ID, &receipt.RequestHash, &receipt.Status, &receipt.ResponseStatus, &receipt.ResponseContentType, &receipt.ResponseBody)
	if err == nil {
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return &receipt, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	err = tx.QueryRow(`
		SELECT id::text,request_hash,status,response_status,response_content_type,response_body
		FROM wlt_refund_operation_receipts
		WHERE tenant_id=$1 AND operation=$2 AND request_path=$3 AND idempotency_key=$4
		FOR UPDATE`, tenantID, operation, path, idempotencyKey,
	).Scan(&receipt.ID, &receipt.RequestHash, &receipt.Status, &receipt.ResponseStatus, &receipt.ResponseContentType, &receipt.ResponseBody)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return &receipt, false, nil
}

func completeRefundMutationReceipt(db *sql.DB, receiptID string, response *bufferedRefundResponse) error {
	status := response.status
	if status == 0 {
		status = http.StatusOK
	}
	contentType := response.header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	result, err := db.Exec(`
		UPDATE wlt_refund_operation_receipts
		SET status='completed',response_status=$2,response_content_type=$3,response_body=$4,completed_at=NOW()
		WHERE id=$1::uuid AND status='processing'`, receiptID, status, contentType, response.body.String())
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return fmt.Errorf("refund mutation receipt %s was not in processing state", receiptID)
	}
	return nil
}

func replayRefundMutation(w http.ResponseWriter, receipt *refundMutationReceipt) {
	if receipt.ResponseContentType.Valid && receipt.ResponseContentType.String != "" {
		w.Header().Set("Content-Type", receipt.ResponseContentType.String)
	} else {
		w.Header().Set("Content-Type", "application/json")
	}
	w.Header().Set("X-Idempotent-Replay", "true")
	status := http.StatusOK
	if receipt.ResponseStatus.Valid {
		status = int(receipt.ResponseStatus.Int64)
	}
	w.WriteHeader(status)
	if receipt.ResponseBody.Valid {
		_, _ = io.WriteString(w, receipt.ResponseBody.String)
	}
}

func copyRefundMutationResponse(w http.ResponseWriter, response *bufferedRefundResponse) {
	for key, values := range response.header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	status := response.status
	if status == 0 {
		status = http.StatusOK
	}
	w.WriteHeader(status)
	_, _ = w.Write(response.body.Bytes())
}

// RequireMutationIdempotency claims a durable operation receipt before any
// refund mutation runs. A completed identical request replays the stored status
// and body. A changed payload conflicts, and an in-flight duplicate never
// reaches the business handler or provider.
func RequireMutationIdempotency(db *sql.DB, operation string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		if tenantID == "" || idempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "REFUND_IDEMPOTENCY_REQUIRED", "refund tenant and Idempotency-Key are required")
			return
		}

		limited := io.LimitReader(r.Body, maxRefundMutationBodyBytes+1)
		body, err := io.ReadAll(limited)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "refund mutation body could not be read")
			return
		}
		if len(body) > maxRefundMutationBodyBytes {
			shared.SendError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "refund mutation body exceeds the supported limit")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		actorID, reason := refundMutationEvidence(body)
		requestHash := refundMutationRequestHash(operation, tenantID, r.URL.Path, body)
		receipt, claimed, err := claimRefundMutationReceipt(
			db,
			tenantID,
			operation,
			r.URL.Path,
			idempotencyKey,
			requestHash,
			actorID,
			reason,
			strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
			body,
		)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "REFUND_IDEMPOTENCY_STORE_FAILED", "refund idempotency receipt could not be claimed")
			return
		}
		if !claimed {
			if receipt.RequestHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used with a different refund mutation payload")
				return
			}
			if receipt.Status == "completed" {
				replayRefundMutation(w, receipt)
				return
			}
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_IN_PROGRESS", "the same refund mutation is already processing")
			return
		}

		buffered := newBufferedRefundResponse()
		next(buffered, r)
		if err := completeRefundMutationReceipt(db, receipt.ID, buffered); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "REFUND_IDEMPOTENCY_RECEIPT_FAILED", "refund mutation completed but its replay receipt could not be persisted")
			return
		}
		copyRefundMutationResponse(w, buffered)
	}
}
