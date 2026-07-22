package refund

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGovernedRefundRuntimeMutationIdempotencyReplayAndConflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	calls := 0
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"refund":{"id":"refund-idempotent","status":"approved"}}`))
	})
	handler := RequireMutationIdempotency(db, "approve", next)
	key := "jrn035-mutation-replay-" + time.Now().UTC().Format("20060102150405.000000000")
	path := "/wlt/refunds/refund-idempotent/approve"

	first := httptest.NewRecorder()
	firstRequest := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"operatorId":"checker-1","reason":"independent approval"}`))
	firstRequest.Header.Set("X-Tenant-ID", "tenant-dev-001")
	firstRequest.Header.Set("Idempotency-Key", key)
	firstRequest.Header.Set("X-Correlation-ID", "corr-mutation-replay")
	handler(first, firstRequest)
	if first.Code != http.StatusOK {
		t.Fatalf("first mutation expected 200, got %d body=%s", first.Code, first.Body.String())
	}
	if calls != 1 {
		t.Fatalf("first mutation expected one handler call, got %d", calls)
	}

	second := httptest.NewRecorder()
	secondRequest := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{ "reason": "independent approval", "operatorId": "checker-1" }`))
	secondRequest.Header.Set("X-Tenant-ID", "tenant-dev-001")
	secondRequest.Header.Set("Idempotency-Key", key)
	secondRequest.Header.Set("X-Correlation-ID", "corr-mutation-replay-retry")
	handler(second, secondRequest)
	if second.Code != first.Code || second.Body.String() != first.Body.String() {
		t.Fatalf("replay must preserve status/body: first=%d %q second=%d %q", first.Code, first.Body.String(), second.Code, second.Body.String())
	}
	if second.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatal("replay response is missing X-Idempotent-Replay=true")
	}
	if calls != 1 {
		t.Fatalf("replay must not execute the handler again, got %d calls", calls)
	}

	changed := httptest.NewRecorder()
	changedRequest := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"operatorId":"checker-1","reason":"changed approval reason"}`))
	changedRequest.Header.Set("X-Tenant-ID", "tenant-dev-001")
	changedRequest.Header.Set("Idempotency-Key", key)
	changedRequest.Header.Set("X-Correlation-ID", "corr-mutation-conflict")
	handler(changed, changedRequest)
	if changed.Code != http.StatusConflict {
		t.Fatalf("changed payload expected 409, got %d body=%s", changed.Code, changed.Body.String())
	}
	if !strings.Contains(changed.Body.String(), "IDEMPOTENCY_CONFLICT") {
		t.Fatalf("changed payload response is missing IDEMPOTENCY_CONFLICT: %s", changed.Body.String())
	}
	if calls != 1 {
		t.Fatalf("changed payload must not execute the handler, got %d calls", calls)
	}

	var status, requestActor, requestReason, correlationID string
	var responseStatus int
	if err := db.QueryRow(`
		SELECT status,COALESCE(actor_id,''),COALESCE(reason,''),COALESCE(correlation_id,''),response_status
		FROM wlt_refund_operation_receipts
		WHERE tenant_id='tenant-dev-001' AND operation='approve' AND request_path=$1 AND idempotency_key=$2`, path, key,
	).Scan(&status, &requestActor, &requestReason, &correlationID, &responseStatus); err != nil {
		t.Fatalf("read mutation receipt evidence: %v", err)
	}
	if status != "completed" || responseStatus != http.StatusOK {
		t.Fatalf("unexpected receipt completion evidence: status=%q response=%d", status, responseStatus)
	}
	if requestActor != "checker-1" || requestReason != "independent approval" || correlationID != "corr-mutation-replay" {
		t.Fatalf("unexpected actor/reason/correlation evidence: actor=%q reason=%q correlation=%q", requestActor, requestReason, correlationID)
	}
}
