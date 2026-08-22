package settlement

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"wlt-api/internal/shared"
)

func TestSettlementMutationHashIsDeterministicAndTupleBound(t *testing.T) {
	first := settlementMutationHash("operator-context-1", "batch_create", "provider-1", "YER")
	if len(first) != 64 || first != settlementMutationHash("operator-context-1", "batch_create", "provider-1", "YER") {
		t.Fatalf("unexpected settlement mutation hash %q", first)
	}
	if first == settlementMutationHash("operator-context-1", "batch_create", "provider-1YER") {
		t.Fatal("settlement mutation hash lost tuple boundaries")
	}
}

func TestSettlementHandlersRejectMalformedBodiesBeforeDatabase(t *testing.T) {
	create := HandleCreateSettlementBatch(nil)
	request := httptest.NewRequest(http.MethodPost, "/settlement-batches", nil)
	response := httptest.NewRecorder()
	create(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("create malformed body status=%d, want 400", response.Code)
	}

	freeze := HandleFreezeSettlementBatch(nil)
	request = httptest.NewRequest(http.MethodPost, "/settlement-batches/batch-1/freeze", nil)
	request.SetPathValue("batchId", "batch-1")
	response = httptest.NewRecorder()
	freeze(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("freeze malformed body status=%d, want 400", response.Code)
	}
}

func TestSettlementMutationsRequireCanonicalAuthorityAndFields(t *testing.T) {
	ctx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), "operator-context-1"), "operator-1")
	if _, err := CreateSettlementBatch(ctx, nil, CreateSettlementBatchInput{ProviderID: "", Currency: "YER", IdempotencyKey: "key-0001"}, "corr-1"); err == nil {
		t.Fatal("empty provider was accepted")
	}
	if _, err := CreateSettlementBatch(ctx, nil, CreateSettlementBatchInput{ProviderID: "provider-1", Currency: "YE", IdempotencyKey: "key-0001"}, "corr-1"); err == nil {
		t.Fatal("short currency was accepted")
	}
	if _, err := FreezeSettlementBatch(ctx, nil, "", "key-0001", "corr-1"); err == nil {
		t.Fatal("empty batch id was accepted")
	}
}
