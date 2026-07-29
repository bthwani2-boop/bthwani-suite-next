package providers

import (
	"context"
	"errors"
	"testing"
)

func TestRequireOperatorContextFailsClosed(t *testing.T) {
	operatorContextID, err := RequireOperatorContext(context.Background())
	if !errors.Is(err, ErrOperatorContextRequired) || operatorContextID != "" {
		t.Fatalf("missing tenant returned tenant=%q err=%v", operatorContextID, err)
	}
}

func TestRequireOperatorContextReturnsAuthenticatedTenant(t *testing.T) {
	ctx := WithOperatorContext(context.Background(), "  tenant-a  ")
	operatorContextID, err := RequireOperatorContext(ctx)
	if err != nil || operatorContextID != "tenant-a" {
		t.Fatalf("trusted tenant returned tenant=%q err=%v", operatorContextID, err)
	}
}

func TestEmptyTenantCannotBecomeContextAuthority(t *testing.T) {
	ctx := WithOperatorContext(context.Background(), "  ")
	if operatorContextID, ok := OperatorContextIDFromContext(ctx); ok || operatorContextID != "" {
		t.Fatalf("empty tenant became authoritative tenant=%q ok=%v", operatorContextID, ok)
	}
}
