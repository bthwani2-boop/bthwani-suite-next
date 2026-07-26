package fieldreadiness

import (
	"errors"
	"testing"
)

func TestBuildMutationContextRequiresGovernedHeaders(t *testing.T) {
	for _, test := range []struct {
		name          string
		idempotency   string
		correlationID string
	}{
		{name: "missing idempotency", correlationID: "corr-123"},
		{name: "short idempotency", idempotency: "short", correlationID: "corr-123"},
		{name: "missing correlation", idempotency: "field-op-123"},
	} {
		t.Run(test.name, func(t *testing.T) {
			_, err := BuildMutationContext(
				test.idempotency,
				test.correlationID,
				map[string]any{"storeId": "store-1"},
			)
			if !errors.Is(err, ErrIdempotencyRequired) {
				t.Fatalf("expected ErrIdempotencyRequired, got %v", err)
			}
		})
	}
}

func TestBuildMutationContextHashesCanonicalRequest(t *testing.T) {
	first, err := BuildMutationContext(
		"field-operation-123",
		"field-correlation-123",
		struct {
			StoreID string `json:"storeId"`
			Status  string `json:"status"`
		}{StoreID: "store-1", Status: "passed"},
	)
	if err != nil {
		t.Fatalf("build first mutation context: %v", err)
	}
	second, err := BuildMutationContext(
		"field-operation-123",
		"field-correlation-123",
		struct {
			StoreID string `json:"storeId"`
			Status  string `json:"status"`
		}{StoreID: "store-1", Status: "passed"},
	)
	if err != nil {
		t.Fatalf("build second mutation context: %v", err)
	}
	changed, err := BuildMutationContext(
		"field-operation-123",
		"field-correlation-123",
		struct {
			StoreID string `json:"storeId"`
			Status  string `json:"status"`
		}{StoreID: "store-1", Status: "failed"},
	)
	if err != nil {
		t.Fatalf("build changed mutation context: %v", err)
	}
	if first.RequestHash != second.RequestHash {
		t.Fatal("identical requests must produce the same request hash")
	}
	if first.RequestHash == changed.RequestHash {
		t.Fatal("changed requests must produce a different request hash")
	}
}
