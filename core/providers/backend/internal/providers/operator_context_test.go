package providers

import (
	"context"
	"errors"
	"testing"
)

func TestRequireOperatorContextFailsClosed(t *testing.T) {
	operatorContextID, err := RequireOperatorContext(context.Background())
	if !errors.Is(err, ErrOperatorContextRequired) || operatorContextID != "" {
		t.Fatalf("missing operator context returned context=%q err=%v", operatorContextID, err)
	}
}

func TestRequireOperatorContextReturnsAuthenticatedContext(t *testing.T) {
	ctx := WithOperatorContext(context.Background(), "  context-a  ")
	operatorContextID, err := RequireOperatorContext(ctx)
	if err != nil || operatorContextID != "context-a" {
		t.Fatalf("trusted operator context returned context=%q err=%v", operatorContextID, err)
	}
}

func TestEmptyOperatorContextCannotBecomeContextAuthority(t *testing.T) {
	ctx := WithOperatorContext(context.Background(), "  ")
	if operatorContextID, ok := OperatorContextIDFromContext(ctx); ok || operatorContextID != "" {
		t.Fatalf("empty operator context became authoritative operator context=%q ok=%v", operatorContextID, ok)
	}
}
